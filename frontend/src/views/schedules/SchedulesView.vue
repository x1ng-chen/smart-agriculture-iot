<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">定时任务</span>
      <el-button type="primary" @click="handleAdd">添加任务</el-button>
    </div>
    <div class="page-card">
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="task_name" label="任务名称" min-width="140" />
        <el-table-column prop="device_name" label="关联设备" width="140" />
        <el-table-column prop="cron_expr" label="Cron 表达式" width="140">
          <template #default="{ row }">
            <code class="cron-code">{{ row.cron_expr }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作" width="100">
          <template #default="{ row }">
            <span class="action-tag">{{ row.action === 'irrigate' ? '灌溉' : row.action }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="duration_sec" label="时长(秒)" width="90" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <span class="status-dot-sm" :class="row.enabled ? 'enabled' : 'disabled'"></span>
            {{ row.enabled ? '启用' : '停用' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑任务' : '添加任务'" width="480px" top="10vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="任务名称" prop="task_name">
          <el-input v-model="form.task_name" />
        </el-form-item>
        <el-form-item label="关联设备" prop="device_id">
          <el-select v-model="form.device_id" style="width:100%">
            <el-option v-for="d in devices" :key="d.id" :label="d.device_name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Cron表达式" prop="cron_expr">
          <el-input v-model="form.cron_expr" placeholder="如: 0 6 * * *" />
        </el-form-item>
        <el-form-item label="灌溉时长(秒)" prop="duration_sec">
          <el-input-number v-model="form.duration_sec" :min="1" :max="7200" style="width:100%" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getDevices } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const pageSize = 10
const dialogVisible = ref(false); const submitting = ref(false); const isEdit = ref(false); const editId = ref(null)
const formRef = ref(null); const devices = ref([])

const form = reactive({ task_name: '', device_id: null, cron_expr: '', duration_sec: 600, enabled: true })
const rules = {
  task_name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  device_id: [{ required: true, message: '请选择设备', trigger: 'change' }],
  cron_expr: [{ required: true, message: '请输入Cron表达式', trigger: 'blur' }],
}

async function fetchData() {
  loading.value = true
  try { const res = await getSchedules({ page: page.value, pageSize }); tableData.value = res.data || []; total.value = res.total || 0 } catch { /* ignore */ }
  finally { loading.value = false }
}
async function fetchDevices() { try { const r = await getDevices(); devices.value = r.data || [] } catch { /* ignore */ } }

function resetForm() { Object.assign(form, { task_name: '', device_id: null, cron_expr: '', duration_sec: 600, enabled: true }) }
function handleAdd() { isEdit.value = false; editId.value = null; resetForm(); fetchDevices(); dialogVisible.value = true }
function handleEdit(row) {
  isEdit.value = true; editId.value = row.id;
  Object.assign(form, { task_name: row.task_name, device_id: row.device_id, cron_expr: row.cron_expr, duration_sec: row.duration_sec, enabled: !!row.enabled })
  fetchDevices(); dialogVisible.value = true
}
async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false); if (!valid) return
  submitting.value = true
  try {
    const data = { ...form, action: 'irrigate' }
    if (isEdit.value) { await updateSchedule(editId.value, data) }
    else { await createSchedule(data) }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
  } catch { /* ignore */ } finally { submitting.value = false }
}
async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该任务？', '提示', { type: 'warning' })
  await deleteSchedule(id); ElMessage.success('删除成功'); fetchData()
}
onMounted(fetchData)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.cron-code { background: rgba(0, 212, 255, 0.1); padding: 3px 8px; border-radius: 4px; color: var(--accent); font-size: 12px; }
.action-tag { color: var(--accent); font-weight: 500; }
.status-dot-sm { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.status-dot-sm.enabled { background: #10b981; box-shadow: 0 0 6px #10b981; }
.status-dot-sm.disabled { background: #64748b; }
</style>
