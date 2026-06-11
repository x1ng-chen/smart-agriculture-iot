<template>
  <div class="dashboard">
    <!-- Stat Cards -->
    <div class="stat-grid">
      <div class="stat-card stat-card-cyan" v-for="card in statCards" :key="card.label">
        <div class="stat-card-bg"></div>
        <div class="stat-card-content">
          <div class="stat-icon-box">
            <el-icon :size="26"><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
        <div class="stat-card-glow"></div>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="chart-row">
      <div class="chart-panel">
        <div class="panel-header">
          <span class="panel-title">土壤湿度趋势</span>
          <span class="panel-badge">近24小时</span>
        </div>
        <div class="chart-body">
          <v-chart :option="moistureChartOption" autoresize />
        </div>
      </div>
      <div class="chart-panel">
        <div class="panel-header">
          <span class="panel-title">土壤温度趋势</span>
          <span class="panel-badge">近24小时</span>
        </div>
        <div class="chart-body">
          <v-chart :option="soilTempChartOption" autoresize />
        </div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="chart-row">
      <div class="chart-panel">
        <div class="panel-header">
          <span class="panel-title">空气温度趋势</span>
          <span class="panel-badge">近24小时</span>
        </div>
        <div class="chart-body">
          <v-chart :option="airTempChartOption" autoresize />
        </div>
      </div>
      <div class="chart-panel">
        <div class="panel-header">
          <span class="panel-title">空气湿度趋势</span>
          <span class="panel-badge">近24小时</span>
        </div>
        <div class="chart-body">
          <v-chart :option="airHumidityChartOption" autoresize />
        </div>
      </div>
    </div>

    <!-- Charts Row 3 -->
    <div class="chart-row chart-row-single">
      <div class="chart-panel chart-panel-full">
        <div class="panel-header">
          <span class="panel-title">光照强度趋势</span>
          <span class="panel-badge">近24小时</span>
        </div>
        <div class="chart-body">
          <v-chart :option="lightChartOption" autoresize />
        </div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="bottom-row">
      <div class="chart-panel chart-panel-wide">
        <div class="panel-header">
          <span class="panel-title">近期告警</span>
        </div>
        <el-table :data="recentAlerts" size="small" class="alerts-table">
          <el-table-column prop="created_at" label="时间" width="170">
            <template #default="{ row }">
              <span class="time-cell">{{ formatTime(row.created_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="device_name" label="设备" width="130" />
          <el-table-column prop="message" label="告警内容" show-overflow-tooltip />
          <el-table-column prop="alert_level" label="级别" width="90">
            <template #default="{ row }">
              <span class="level-tag" :class="'level-' + row.alert_level">{{ alertLevelMap[row.alert_level] || row.alert_level }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <span class="status-badge" :class="row.resolved ? 'resolved' : 'active'">{{ row.resolved ? '已解决' : '活跃' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="chart-panel">
        <div class="panel-header">
          <span class="panel-title">设备在线状态</span>
        </div>
        <div class="device-list">
          <div v-for="d in onlineDevices" :key="d.id" class="device-item">
            <div class="device-dot" :class="d.online_status === 1 ? 'on' : 'off'"></div>
            <div class="device-name">{{ d.device_name }}</div>
            <div class="device-status-text">{{ d.online_status === 1 ? '在线' : '离线' }}</div>
            <div class="device-last-seen" v-if="d.last_online_at">{{ formatRelative(d.last_online_at) }}</div>
          </div>
          <el-empty v-if="onlineDevices.length === 0" description="暂无设备" :image-size="60" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, markRaw, onMounted, onUnmounted, watch } from 'vue'
import { getDashboardStats, getDevices, getDeviceHistoryData } from '@/api'
import { useMqttStore } from '@/stores/mqtt'
import { Cpu, Odometer, Warning, Watermelon } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const mqttStore = useMqttStore()

const stats = reactive({
  onlineDevices: 0, todayIrrigation: 0, activeAlerts: 0, totalWater: 0
})
const recentAlerts = ref([])
const onlineDevices = ref([])

const statCards = ref([
  { icon: markRaw(Cpu), value: '0', label: '在线设备' },
  { icon: markRaw(Odometer), value: '0', label: '今日灌溉(次)' },
  { icon: markRaw(Warning), value: '0', label: '活跃告警' },
  { icon: markRaw(Watermelon), value: '0 L', label: '今日用水量' },
])

const alertLevelMap = { info: '信息', warning: '警告', critical: '严重' }

const moistureChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { show: true, top: 0, textStyle: { color: '#94a3b8' } },
  grid: { top: 40, right: 20, bottom: 30, left: 45 },
  xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
  yAxis: { type: 'value', name: '%', nameTextStyle: { color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
  series: []
})

const soilTempChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { show: true, top: 0, textStyle: { color: '#94a3b8' } },
  grid: { top: 40, right: 20, bottom: 30, left: 45 },
  xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
  yAxis: { type: 'value', name: '°C', nameTextStyle: { color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
  series: []
})

const airTempChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { show: true, top: 0, textStyle: { color: '#94a3b8' } },
  grid: { top: 40, right: 20, bottom: 30, left: 45 },
  xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
  yAxis: { type: 'value', name: '°C', nameTextStyle: { color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
  series: []
})

const airHumidityChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { show: true, top: 0, textStyle: { color: '#94a3b8' } },
  grid: { top: 40, right: 20, bottom: 30, left: 45 },
  xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
  yAxis: { type: 'value', name: '%', nameTextStyle: { color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
  series: []
})

const lightChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { show: true, top: 0, textStyle: { color: '#94a3b8' } },
  grid: { top: 40, right: 20, bottom: 30, left: 50 },
  xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
  yAxis: { type: 'value', name: 'Lux', nameTextStyle: { color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
  series: []
})

function formatTime(t) { return dayjs(t).format('MM-DD HH:mm') }
function formatRelative(t) {
  const diff = dayjs().diff(dayjs(t), 'minute')
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff}分钟前`
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
  return dayjs(t).format('MM-DD HH:mm')
}

async function loadChartData() {
  try {
    const devRes = await getDevices()
    const devices = devRes.data || []
    const onlineDevs = devices.filter(d => d.online_status === 1).slice(0, 3)
    if (onlineDevs.length === 0) return

    const colors = ['#00d4ff', '#3b82f6', '#8b5cf6']

    const results = await Promise.all(
      onlineDevs.map(d => getDeviceHistoryData(d.id, { hours: 24 }).catch(() => null))
    )

    const timeLabels = []
    const moistureSeries = []
    const soilTempSeries = []
    const airTempSeries = []
    const airHumiditySeries = []
    const lightSeries = []

    for (let i = 0; i < results.length; i++) {
      const rows = results[i]?.data || []
      const name = onlineDevs[i].device_name
      if (rows.length > 0 && timeLabels.length === 0) {
        timeLabels.push(...rows.map(r => dayjs(r._time).format('HH:mm')))
      }
      moistureSeries.push({
        name, type: 'line', smooth: true, symbol: 'none',
        data: rows.map(r => r.soil_moisture),
        lineStyle: { color: colors[i], width: 2 }, itemStyle: { color: colors[i] },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[i] + '40' }, { offset: 1, color: colors[i] + '05' }] } }
      })
      soilTempSeries.push({
        name, type: 'line', smooth: true, symbol: 'none',
        data: rows.map(r => r.soil_temp),
        lineStyle: { color: colors[i], width: 2 }, itemStyle: { color: colors[i] },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[i] + '40' }, { offset: 1, color: colors[i] + '05' }] } }
      })
      airTempSeries.push({
        name, type: 'line', smooth: true, symbol: 'none',
        data: rows.map(r => r.air_temp),
        lineStyle: { color: colors[i], width: 2 }, itemStyle: { color: colors[i] },
      })
      airHumiditySeries.push({
        name, type: 'line', smooth: true, symbol: 'none',
        data: rows.map(r => r.air_humidity),
        lineStyle: { color: colors[i], width: 2 }, itemStyle: { color: colors[i] },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[i] + '40' }, { offset: 1, color: colors[i] + '05' }] } }
      })
      lightSeries.push({
        name, type: 'line', smooth: true, symbol: 'none',
        data: rows.map(r => r.light),
        lineStyle: { color: colors[i], width: 2 }, itemStyle: { color: colors[i] },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[i] + '40' }, { offset: 1, color: colors[i] + '05' }] } }
      })
    }

    moistureChartOption.value = {
      ...moistureChartOption.value,
      xAxis: { ...moistureChartOption.value.xAxis, data: timeLabels },
      series: moistureSeries,
    }
    soilTempChartOption.value = {
      ...soilTempChartOption.value,
      xAxis: { ...soilTempChartOption.value.xAxis, data: timeLabels },
      series: soilTempSeries,
    }
    airTempChartOption.value = {
      ...airTempChartOption.value,
      xAxis: { ...airTempChartOption.value.xAxis, data: timeLabels },
      series: airTempSeries,
    }
    airHumidityChartOption.value = {
      ...airHumidityChartOption.value,
      xAxis: { ...airHumidityChartOption.value.xAxis, data: timeLabels },
      series: airHumiditySeries,
    }
    lightChartOption.value = {
      ...lightChartOption.value,
      xAxis: { ...lightChartOption.value.xAxis, data: timeLabels },
      series: lightSeries,
    }
  } catch (e) { /* ignore */ }
}

let timer = null

async function loadData() {
  try {
    const res = await getDashboardStats()
    const data = res.data
    stats.onlineDevices = data.onlineDevices || 0
    stats.todayIrrigation = data.todayIrrigation || 0
    stats.activeAlerts = data.activeAlerts || 0
    stats.totalWater = data.totalWater || 0
    statCards.value[0].value = String(stats.onlineDevices)
    statCards.value[1].value = String(stats.todayIrrigation)
    statCards.value[2].value = String(stats.activeAlerts)
    statCards.value[3].value = stats.totalWater + ' L'
    recentAlerts.value = data.recentAlerts || []
    onlineDevices.value = data.onlineDeviceList || []
  } catch (e) { /* ignore */ }
}

onMounted(async () => {
  loadData()
  loadChartData()
  mqttStore.connect()
  timer = setInterval(() => {
    loadData()
    loadChartData()
  }, 5000)
})

onUnmounted(() => {
  clearInterval(timer)
  mqttStore.disconnect()
})

watch(() => mqttStore.latestData, () => {
  const dataMap = mqttStore.latestData
  const sns = Object.keys(dataMap)
  if (sns.length === 0) return
  let onlineCount = 0
  for (const sn of sns) {
    if (dataMap[sn] && Date.now() - dataMap[sn].timestamp < 30000) onlineCount++
  }
  statCards.value[0].value = String(onlineCount)

  // Update device list online status from MQTT presence
  for (const d of onlineDevices.value) {
    const latest = dataMap[d.device_sn]
    if (latest && Date.now() - latest.timestamp < 30000) {
      d.online_status = 1
    } else if (latest && Date.now() - latest.timestamp >= 30000) {
      d.online_status = 0
    }
  }
}, { deep: true })
</script>

<style scoped>
/* Stat Cards */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}
.stat-card {
  position: relative;
  padding: 24px;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}
.stat-card:hover { transform: translateY(-2px); }
.stat-card-bg {
  position: absolute; inset: 0;
  background: rgba(16, 30, 60, 0.7);
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 14px;
  backdrop-filter: blur(12px);
}
.stat-card-glow {
  position: absolute;
  top: 0; left: 10%; right: 10%; height: 1px;
  border-radius: 50%;
  opacity: 0.6;
}
.stat-card:nth-child(1) .stat-card-glow { background: linear-gradient(90deg, transparent, #00d4ff, transparent); }
.stat-card:nth-child(2) .stat-card-glow { background: linear-gradient(90deg, transparent, #10b981, transparent); }
.stat-card:nth-child(3) .stat-card-glow { background: linear-gradient(90deg, transparent, #f59e0b, transparent); }
.stat-card:nth-child(4) .stat-card-glow { background: linear-gradient(90deg, transparent, #ef4444, transparent); }
.stat-card-content {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 16px;
}
.stat-icon-box {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.stat-card:nth-child(1) .stat-icon-box { background: rgba(0, 212, 255, 0.15); color: #00d4ff; }
.stat-card:nth-child(2) .stat-icon-box { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.stat-card:nth-child(3) .stat-icon-box { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.stat-card:nth-child(4) .stat-icon-box { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.stat-value {
  font-family: 'Orbitron', monospace;
  font-size: 28px; font-weight: 700;
  color: var(--text-primary);
}
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

/* Charts */
.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.chart-row-single {
  grid-template-columns: 1fr;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}
.chart-panel {
  background: rgba(16, 30, 60, 0.6);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 14px;
  padding: 20px;
  backdrop-filter: blur(12px);
}
.chart-panel-wide { /* full width in bottom row */ }
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.panel-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.panel-badge {
  font-size: 11px; color: var(--accent);
  background: rgba(0, 212, 255, 0.1); padding: 3px 10px; border-radius: 10px;
  border: 1px solid rgba(0, 212, 255, 0.2);
}
.chart-body { height: 260px; }

/* Bottom */
.bottom-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

/* Alerts table */
.alerts-table { font-size: 13px; }
.time-cell { color: var(--text-muted); font-size: 12px; }
.level-tag {
  padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
}
.level-info { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.level-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.level-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.status-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 4px;
}
.status-badge.active { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.status-badge.resolved { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }

/* Device list */
.device-list { display: flex; flex-direction: column; gap: 4px; }
.device-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  transition: background 0.2s;
}
.device-item:hover { background: rgba(0, 212, 255, 0.05); }
.device-dot {
  width: 8px; height: 8px; border-radius: 50%; min-width: 8px;
}
.device-dot.on { background: #10b981; box-shadow: 0 0 8px #10b981; }
.device-dot.off { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
.device-name { flex: 1; color: var(--text-primary); font-size: 13px; }
.device-status-text { font-size: 12px; }
.device-dot.on ~ .device-status-text { color: #6ee7b7; }
.device-dot.off ~ .device-status-text { color: #f87171; }
.device-last-seen { font-size: 11px; color: var(--text-muted); }
</style>
