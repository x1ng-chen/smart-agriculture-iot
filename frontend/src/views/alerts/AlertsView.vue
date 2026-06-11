<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">告警中心</span>
      <div class="toolbar-actions">
        <el-button size="small" @click="handleExport">
          <el-icon><Download /></el-icon> 导出CSV
        </el-button>
        <el-radio-group v-model="activeTab" size="small" @change="handleTabChange">
          <el-radio-button value="alerts">系统告警</el-radio-button>
          <el-radio-button value="anomalies">AI 异常检测</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 系统告警 -->
    <div class="page-card" v-if="activeTab === 'alerts'">
      <div class="filter-bar">
        <el-radio-group v-model="filterResolved" size="small" @change="fetchAlerts">
          <el-radio-button :value="undefined">全部</el-radio-button>
          <el-radio-button :value="0">未解决</el-radio-button>
          <el-radio-button :value="1">已解决</el-radio-button>
        </el-radio-group>
      </div>
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="created_at" label="时间" width="170">
          <template #default="{ row }"><span class="time-cell">{{ row.created_at }}</span></template>
        </el-table-column>
        <el-table-column label="级别" width="80">
          <template #default="{ row }">
            <span class="level-badge" :class="'lvl-' + row.alert_level">{{ alertLevelMap[row.alert_level] || row.alert_level }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="alert_type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="typeColor(row.alert_type)">{{ row.alert_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="device_name" label="关联设备" width="140" />
        <el-table-column prop="message" label="告警内容" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <span class="status-badge" :class="row.resolved ? 'resolved' : 'active'">{{ row.resolved ? '已解决' : '活跃' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="!row.resolved" type="primary" link size="small" @click="handleResolve(row.id)">标记解决</el-button>
            <span v-else style="font-size:12px;color:var(--text-muted)">——</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page" :total="total" :page-size="pageSize"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchAlerts"
      />
    </div>

    <!-- AI 异常检测 -->
    <div class="page-card" v-if="activeTab === 'anomalies'">
      <el-table :data="anomalyData" v-loading="anomalyLoading">
        <el-table-column prop="created_at" label="时间" width="170">
          <template #default="{ row }"><span class="time-cell">{{ formatTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="严重度" width="90">
          <template #default="{ row }">
            <span class="level-badge" :class="'lvl-' + row.severity">{{ severityMap[row.severity] || row.severity }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="device_name" label="设备" width="130" />
        <el-table-column prop="anomaly_type" label="异常类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="warning">{{ anomalyTypeMap[row.anomaly_type] || row.anomaly_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="field_name" label="字段" width="100" />
        <el-table-column label="当前值 / 预期范围" width="180">
          <template #default="{ row }">
            <span class="anomaly-val">{{ row.current_value }}</span>
            <span class="anomaly-range" v-if="row.expected_range"> ({{ row.expected_range }})</span>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="详情" show-overflow-tooltip />
        <el-table-column label="Z-Score" width="80">
          <template #default="{ row }">
            <span v-if="row.z_score" class="z-score">{{ Number(row.z_score).toFixed(1) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="anomalyTotal > anomalyPageSize"
        v-model:current-page="anomalyPage" :total="anomalyTotal" :page-size="anomalyPageSize"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchAnomalies"
      />
      <el-empty v-if="!anomalyLoading && anomalyData.length === 0" description="暂无异常记录" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAlerts, resolveAlert, getAiAnomalies, exportSensorData } from '@/api'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const activeTab = ref('alerts')

// 系统告警
const tableData = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const pageSize = 10
const filterResolved = ref(undefined)

const alertLevelMap = { info: '信息', warning: '警告', critical: '严重', danger: '危险' }
function typeColor(t) {
  if (/offline|故障/.test(t)) return 'danger'
  if (/started|irrigation/.test(t)) return 'success'
  if (/high|low/.test(t)) return 'warning'
  return 'info'
}

async function fetchAlerts() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize }
    if (filterResolved.value !== undefined) params.resolved = filterResolved.value
    const res = await getAlerts(params)
    tableData.value = res.data || []; total.value = res.total || 0
  } catch { /* ignore */ } finally { loading.value = false }
}
async function handleResolve(id) {
  await resolveAlert(id)
  ElMessage.success('告警已标记为已解决')
  fetchAlerts()
}

// AI 异常检测
const anomalyData = ref([]); const anomalyLoading = ref(false); const anomalyPage = ref(1); const anomalyTotal = ref(0); const anomalyPageSize = 20
const severityMap = { low: '低', medium: '中', high: '高', critical: '严重' }
const anomalyTypeMap = { statistical: '统计异常', range: '范围异常', pattern: '模式异常' }

async function fetchAnomalies() {
  anomalyLoading.value = true
  try {
    const res = await getAiAnomalies({ page: anomalyPage.value, pageSize: anomalyPageSize })
    anomalyData.value = res.data || []; anomalyTotal.value = res.total || 0
  } catch { /* ignore */ } finally { anomalyLoading.value = false }
}

function formatTime(t) { return dayjs(t).format('MM-DD HH:mm') }

function handleTabChange(tab) {
  if (tab === 'alerts') fetchAlerts()
  else fetchAnomalies()
}

function handleExport() {
  exportSensorData({}).then(res => {
    const url = URL.createObjectURL(res)
    const a = document.createElement('a')
    a.href = url; a.download = `sensor-data-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  }).catch(() => ElMessage.error('导出失败'))
}

onMounted(fetchAlerts)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.toolbar-actions { display: flex; align-items: center; gap: 12px; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.filter-bar { margin-bottom: 16px; }
.time-cell { color: var(--text-muted); font-size: 12px; }
.level-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.lvl-info { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.lvl-warning, .lvl-medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.lvl-critical, .lvl-danger, .lvl-high { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.lvl-low { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.status-badge.active { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.status-badge.resolved { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }
.anomaly-val { color: #f87171; font-weight: 600; font-family: monospace; }
.anomaly-range { color: var(--text-muted); font-size: 12px; }
.z-score { font-family: monospace; color: #fbbf24; font-size: 12px; }
</style>
