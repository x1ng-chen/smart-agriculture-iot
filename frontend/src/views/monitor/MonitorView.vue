<template>
  <div class="monitor">
    <div class="monitor-toolbar">
      <span class="monitor-title">设备实时数据</span>
      <div class="monitor-actions">
        <span class="pulse-dot" :class="mqttStore.connected ? 'connected' : 'disconnected'"></span>
        <span class="mqtt-status">{{ mqttStore.connected ? '实时已连接' : '实时未连接' }}</span>
        <el-button size="small" @click="toggleMqtt">{{ mqttStore.connected ? '断开' : '连接' }}</el-button>
        <el-tag size="small" effect="dark">更新间隔: 5s</el-tag>
      </div>
    </div>

    <div class="device-grid">
      <div class="device-card" v-for="device in devices" :key="device.id" :class="{ offline: device.online_status !== 1 }">
        <div class="card-top-bar" :class="device.online_status === 1 ? 'bar-online' : 'bar-offline'"></div>
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-dot" :class="device.online_status === 1 ? 'dot-on' : 'dot-off'"></div>
            <span class="card-name">{{ device.device_name }}</span>
          </div>
          <span class="card-sn">{{ device.device_sn }}</span>
        </div>
        <div class="card-sensors">
          <div class="sensor-item" v-for="s in sensors" :key="s.key">
            <div class="sensor-icon"><el-icon :size="14"><component :is="s.icon" /></el-icon></div>
            <div class="sensor-data">
              <span class="sensor-label">{{ s.label }}</span>
              <span class="sensor-value">{{ getVal(device.device_sn, s.key) }}</span>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span class="footer-device-type">{{ device.device_type === 'bearpi_nano' ? 'BearPi Nano' : device.device_type }}</span>
          <span class="footer-ts" v-if="getVal(device.device_sn, 'ts') !== '--'">{{ getVal(device.device_sn, 'ts') }}</span>
        </div>

        <!-- 灌溉控制 -->
        <div class="card-irrigate" v-if="device.online_status === 1">
          <div class="irrigate-header">
            <span class="irrigate-label">灌溉控制</span>
            <span class="irrigate-status" :class="irrigateState[device.id]?.running ? 'running' : 'idle'">
              {{ irrigateState[device.id]?.running ? '灌溉中' : '待机' }}
            </span>
          </div>
          <div class="irrigate-controls">
            <div class="duration-pills">
              <button
                v-for="d in durationOptions"
                :key="d"
                class="pill"
                :class="{ active: irrigateDuration[device.id] === d }"
                @click="irrigateDuration[device.id] = d"
                :disabled="irrigateState[device.id]?.running"
              >{{ d }}s</button>
            </div>
            <div class="irrigate-btns">
              <el-button
                v-if="!irrigateState[device.id]?.running"
                type="success"
                size="small"
                @click="handleStartIrrigate(device)"
                :loading="irrigateState[device.id]?.loading"
              >开始灌溉</el-button>
              <el-button
                v-else
                type="danger"
                size="small"
                @click="handleStopIrrigate(device)"
                :loading="irrigateState[device.id]?.loading"
              >停止</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-if="devices.length === 0" description="暂无设备" :image-size="80" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getDevices, getDeviceLatestData, startIrrigation, stopIrrigation } from '@/api'
import { useMqttStore } from '@/stores/mqtt'
import { ElMessage } from 'element-plus'
import {
  Sunny, Drizzling, WindPower, MostlyCloudy, Opportunity
} from '@element-plus/icons-vue'

const mqttStore = useMqttStore()
const devices = ref([])

// 灌溉控制状态
const irrigateDuration = ref({})
const irrigateState = ref({})
const durationOptions = [15, 30, 60, 120]

async function handleStartIrrigate(device) {
  const dur = irrigateDuration.value[device.id] || 30
  try {
    irrigateState.value[device.id] = { running: false, loading: true }
    await startIrrigation(device.id, { duration_sec: dur })
    irrigateState.value[device.id] = { running: true, loading: false }
    ElMessage.success(`${device.device_name} 开始灌溉 (${dur}秒)`)
    // 自动停止：到时调用停止API并重置UI
    const timerId = setTimeout(async () => {
      try {
        await stopIrrigation(device.id)
      } catch {
        // 后端兜底也会停，忽略网络错误
      }
      if (irrigateState.value[device.id]) {
        irrigateState.value[device.id].running = false
      }
    }, dur * 1000)
    irrigateState.value[device.id].timerId = timerId
  } catch {
    irrigateState.value[device.id] = { running: false, loading: false }
    ElMessage.error('灌溉启动失败')
  }
}

async function handleStopIrrigate(device) {
  try {
    // 清除自动停止定时器
    const state = irrigateState.value[device.id]
    if (state?.timerId) {
      clearTimeout(state.timerId)
      state.timerId = null
    }
    irrigateState.value[device.id] = { ...state, loading: true }
    await stopIrrigation(device.id)
    irrigateState.value[device.id] = { running: false, loading: false }
    ElMessage.success(`${device.device_name} 已停止灌溉`)
  } catch {
    irrigateState.value[device.id] = { ...irrigateState.value[device.id], loading: false }
    ElMessage.error('停止失败')
  }
}

const sensors = [
  { key: 'soil_moisture', label: '土壤湿度', icon: Opportunity },
  { key: 'soil_temp', label: '土壤温度', icon: Sunny },
  { key: 'air_temp', label: '空气温度', icon: WindPower },
  { key: 'air_humidity', label: '空气湿度', icon: Drizzling },
  { key: 'light', label: '光照强度', icon: MostlyCloudy },
]

function getVal(sn, key) {
  const data = mqttStore.latestData[sn]
  if (!data) return '--'
  if (key === 'ts' && data.ts) {
    const d = new Date(data.ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  const val = data[key]
  if (val == null) return '--'
  if (key === 'light') return val + ' lux'
  if (key.endsWith('moisture') || key.endsWith('humidity')) return val + '%'
  if (key.endsWith('temp')) return val + '°C'
  return val
}

function toggleMqtt() {
  if (mqttStore.connected) {
    mqttStore.disconnect()
  } else {
    mqttStore.connect()
  }
}

onMounted(async () => {
  try {
    const res = await getDevices()
    devices.value = res.data || []

    // 预填充初始传感器数据（防止 MQTT 消息到达前的空白期）
    for (const device of devices.value) {
      try {
        const r = await getDeviceLatestData(device.id)
        const d = r.data
        if (d) {
          mqttStore.latestData[device.device_sn] = {
            soil_moisture: d.soil_moisture,
            soil_temp: d.soil_temp,
            air_temp: d.air_temp,
            air_humidity: d.air_humidity,
            light: d.light,
            ts: d._time,
          }
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  mqttStore.connect()
})

onUnmounted(() => {
  mqttStore.disconnect()
})
</script>

<style scoped>
.monitor-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; padding: 14px 20px;
  background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 12px;
}
.monitor-title { font-size: 15px; font-weight: 600; }
.monitor-actions { display: flex; align-items: center; gap: 10px; }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; }
.pulse-dot.connected { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
.pulse-dot.disconnected { background: #ef4444; }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 4px #10b981; }
  50% { box-shadow: 0 0 16px #10b981, 0 0 24px rgba(16, 185, 129, 0.3); }
}
.mqtt-status { font-size: 12px; color: var(--text-secondary); }

/* Device Cards */
.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}
.device-card {
  background: rgba(16, 30, 60, 0.6);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 14px;
  overflow: hidden;
  backdrop-filter: blur(12px);
  transition: all 0.3s;
}
.device-card:hover {
  border-color: rgba(0, 212, 255, 0.3);
  box-shadow: 0 4px 24px rgba(0, 212, 255, 0.08);
  transform: translateY(-2px);
}
.device-card.offline { opacity: 0.6; border-color: rgba(239, 68, 68, 0.2); }
.card-top-bar { height: 3px; }
.card-top-bar.bar-online { background: linear-gradient(90deg, #00d4ff, #3b82f6); }
.card-top-bar.bar-offline { background: linear-gradient(90deg, #64748b, #475569); }
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 8px;
}
.card-header-left { display: flex; align-items: center; gap: 8px; }
.card-dot { width: 8px; height: 8px; border-radius: 50%; }
.card-dot.dot-on { background: #10b981; box-shadow: 0 0 8px #10b981; }
.card-dot.dot-off { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
.card-name { font-weight: 600; font-size: 14px; }
.card-sn { font-size: 11px; color: var(--text-muted); font-family: monospace; }

.card-sensors {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 16px 12px;
}
.sensor-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px;
  background: rgba(0, 212, 255, 0.04);
  border-radius: 10px;
  border: 1px solid rgba(0, 212, 255, 0.06);
  transition: border-color 0.3s;
}
.sensor-item:hover { border-color: rgba(0, 212, 255, 0.2); }
.sensor-icon { color: var(--accent); min-width: 14px; }
.sensor-data { display: flex; flex-direction: column; min-width: 0; }
.sensor-label { font-size: 11px; color: var(--text-muted); }
.sensor-value {
  font-family: 'Orbitron', monospace;
  font-size: 16px; font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #3b82f6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}
.device-card.offline .sensor-value {
  -webkit-text-fill-color: var(--text-muted);
}

.card-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px 14px;
  font-size: 11px; color: var(--text-muted);
}

/* Irrigation Control */
.card-irrigate {
  margin: 0 16px 14px;
  padding: 12px 14px;
  background: rgba(0, 212, 255, 0.03);
  border: 1px solid rgba(0, 212, 255, 0.08);
  border-radius: 10px;
}
.irrigate-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.irrigate-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.irrigate-status { font-size: 11px; padding: 2px 10px; border-radius: 8px; }
.irrigate-status.idle { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
.irrigate-status.running { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; animation: pulse 1.5s infinite; }
.irrigate-controls {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
}
.duration-pills { display: flex; gap: 6px; }
.pill {
  padding: 4px 10px; font-size: 11px; font-family: 'Orbitron', monospace;
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 6px; background: transparent;
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.2s;
}
.pill:hover { border-color: rgba(0, 212, 255, 0.5); color: #00d4ff; }
.pill.active { background: rgba(0, 212, 255, 0.15); border-color: #00d4ff; color: #00d4ff; }
.pill:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
