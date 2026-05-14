<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">设备管理</span>
      <el-button type="primary" @click="handleAdd">添加设备</el-button>
    </div>
    <div class="page-card">
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="device_sn" label="序列号" width="170">
          <template #default="{ row }">
            <code class="sn-code">{{ row.device_sn }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="device_name" label="设备名称" min-width="140" />
        <el-table-column prop="plot_name" label="所属地块" width="140">
          <template #default="{ row }">
            <span v-if="row.plot_name">{{ row.plot_name }}</span>
            <span v-else style="color:var(--text-muted)">未分配</span>
          </template>
        </el-table-column>
        <el-table-column prop="firmware_ver" label="固件版本" width="100" />
        <el-table-column label="在线状态" width="100">
          <template #default="{ row }">
            <span class="status-dot-sm" :class="row.online_status === 1 ? 'enabled' : 'disabled'"></span>
            {{ row.online_status === 1 ? '在线' : '离线' }}
          </template>
        </el-table-column>
        <el-table-column label="最近在线" width="170">
          <template #default="{ row }">
            <span class="time-cell">{{ row.last_online_at || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑设备' : '添加设备'" width="520px" top="10vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="序列号" prop="device_sn">
              <el-input v-model="form.device_sn" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="device_name">
              <el-input v-model="form.device_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备类型">
              <el-select v-model="form.device_type" style="width:100%">
                <el-option label="BearPi Nano" value="bearpi_nano" />
                <el-option label="ESP32" value="esp32" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属地块">
              <el-select v-model="form.plot_id" style="width:100%" clearable placeholder="请选择">
                <el-option v-for="p in plotOptions" :key="p.id" :label="p.plot_name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="固件版本">
              <el-input v-model="form.firmware_ver" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="纬度">
              <el-input-number v-model="form.latitude" :precision="6" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="经度">
              <el-input-number v-model="form.longitude" :precision="6" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
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
import { getDevices, createDevice, updateDevice, deleteDevice, getPlots } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const pageSize = 10
const dialogVisible = ref(false); const submitting = ref(false); const isEdit = ref(false); const editId = ref(null)
const formRef = ref(null); const plotOptions = ref([])

const form = reactive({ device_sn: '', device_name: '', device_type: 'bearpi_nano', plot_id: null, firmware_ver: '', latitude: null, longitude: null })
const rules = {
  device_sn: [{ required: true, message: '请输入设备序列号', trigger: 'blur' }],
  device_name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
}

async function fetchData() {
  loading.value = true
  try { const res = await getDevices({ page: page.value, pageSize }); tableData.value = res.data || []; total.value = res.total || 0 } catch { /* ignore */ }
  finally { loading.value = false }
}
async function fetchPlots() { try { const r = await getPlots(); plotOptions.value = r.data || [] } catch { /* ignore */ } }

function resetForm() { Object.assign(form, { device_sn: '', device_name: '', device_type: 'bearpi_nano', plot_id: null, firmware_ver: '', latitude: null, longitude: null }) }
function handleAdd() { isEdit.value = false; editId.value = null; resetForm(); fetchPlots(); dialogVisible.value = true }
function handleEdit(row) {
  isEdit.value = true; editId.value = row.id
  Object.assign(form, { device_sn: row.device_sn, device_name: row.device_name, device_type: row.device_type || 'bearpi_nano', plot_id: row.plot_id, firmware_ver: row.firmware_ver || '', latitude: row.latitude, longitude: row.longitude })
  fetchPlots(); dialogVisible.value = true
}
async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false); if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) { await updateDevice(editId.value, { ...form }) }
    else { await createDevice({ ...form }) }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
  } catch { /* ignore */ } finally { submitting.value = false }
}
async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该设备？', '提示', { type: 'warning' })
  await deleteDevice(id); ElMessage.success('删除成功'); fetchData()
}
onMounted(fetchData)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.sn-code { background: rgba(0, 212, 255, 0.1); padding: 3px 8px; border-radius: 4px; color: var(--accent); font-size: 12px; }
.status-dot-sm { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.status-dot-sm.enabled { background: #10b981; box-shadow: 0 0 6px #10b981; }
.status-dot-sm.disabled { background: #ef4444; }
.time-cell { color: var(--text-muted); font-size: 12px; }
</style>
