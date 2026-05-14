<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">灌溉记录</span>
    </div>
    <div class="page-card">
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="start_time" label="开始时间" width="170" />
        <el-table-column prop="end_time" label="结束时间" width="170" />
        <el-table-column label="触发方式" width="90">
          <template #default="{ row }">
            <span class="trigger-tag" :class="row.trigger_type === 'auto' ? 'auto' : 'manual'">
              {{ row.trigger_type === 'auto' ? '自动' : '手动' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="duration_sec" label="时长(秒)" width="90" />
        <el-table-column prop="water_used_l" label="用水量(L)" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <span class="status-badge" :class="row.status === 'running' ? 'irrigating' : row.status">
              {{ statusMap[row.status] || row.status }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
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
import { getIrrigationLogs } from '@/api'

const tableData = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const pageSize = 10
const statusMap = { running: '灌溉中', completed: '已完成', stopped: '已停止', failed: '失败' }

async function fetchData() {
  loading.value = true
  try { const res = await getIrrigationLogs({ page: page.value, pageSize }); tableData.value = res.data || []; total.value = res.total || 0 } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(fetchData)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.trigger-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.trigger-tag.auto { background: rgba(0, 212, 255, 0.15); color: #22d3ee; }
.trigger-tag.manual { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.status-badge.running { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.status-badge.completed { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }
.status-badge.stopped { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
</style>
