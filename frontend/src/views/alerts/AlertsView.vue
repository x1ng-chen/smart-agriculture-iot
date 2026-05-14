<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">告警中心</span>
      <div class="toolbar-actions">
        <el-radio-group v-model="filterResolved" size="small" @change="fetchData">
          <el-radio-button :value="undefined">全部</el-radio-button>
          <el-radio-button :value="0">未解决</el-radio-button>
          <el-radio-button :value="1">已解决</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    <div class="page-card">
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
        @current-change="fetchData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAlerts, resolveAlert } from '@/api'
import { ElMessage } from 'element-plus'

const tableData = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const pageSize = 10
const filterResolved = ref(undefined)

const alertLevelMap = { info: '信息', warning: '警告', critical: '严重' }
function typeColor(t) {
  if (/offline|故障/.test(t)) return 'danger'
  if (/started|irrigation/.test(t)) return 'success'
  if (/high|low/.test(t)) return 'warning'
  return 'info'
}

async function fetchData() {
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
  fetchData()
}
onMounted(fetchData)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.time-cell { color: var(--text-muted); font-size: 12px; }
.level-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.lvl-info { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.lvl-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.lvl-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.status-badge.active { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.status-badge.resolved { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }
</style>
