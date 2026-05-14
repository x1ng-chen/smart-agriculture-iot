<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">地块管理</span>
      <el-button type="primary" @click="handleAdd">添加地块</el-button>
    </div>
    <div class="page-card">
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="plot_name" label="地块名称" min-width="140" />
        <el-table-column prop="crop_type" label="作物类型" width="110" />
        <el-table-column prop="area_sqm" label="面积(m²)" width="110" />
        <el-table-column prop="device_count" label="设备数量" width="100" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑地块' : '添加地块'" width="480px" top="10vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="地块名称" prop="plot_name">
          <el-input v-model="form.plot_name" />
        </el-form-item>
        <el-form-item label="作物类型">
          <el-select v-model="form.crop_type" style="width:100%" clearable placeholder="请选择作物">
            <el-option label="小麦" value="wheat" />
            <el-option label="玉米" value="corn" />
            <el-option label="蔬菜" value="vegetable" />
            <el-option label="水果" value="fruit" />
            <el-option label="水稻" value="rice" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="面积(m²)">
          <el-input-number v-model="form.area_sqm" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
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
import { getPlots, createPlot, updatePlot, deletePlot } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([]); const loading = ref(false)
const dialogVisible = ref(false); const submitting = ref(false); const isEdit = ref(false); const editId = ref(null)
const formRef = ref(null)

const form = reactive({ plot_name: '', crop_type: '', area_sqm: null, description: '' })
const rules = { plot_name: [{ required: true, message: '请输入地块名称', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try { const res = await getPlots(); tableData.value = res.data || [] } catch { /* ignore */ }
  finally { loading.value = false }
}
function resetForm() { Object.assign(form, { plot_name: '', crop_type: '', area_sqm: null, description: '' }) }
function handleAdd() { isEdit.value = false; editId.value = null; resetForm(); dialogVisible.value = true }
function handleEdit(row) {
  isEdit.value = true; editId.value = row.id
  Object.assign(form, { plot_name: row.plot_name, crop_type: row.crop_type || '', area_sqm: row.area_sqm, description: row.description || '' })
  dialogVisible.value = true
}
async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false); if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) { await updatePlot(editId.value, { ...form }) }
    else { await createPlot({ ...form }) }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
  } catch { /* ignore */ } finally { submitting.value = false }
}
async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该地块？', '提示', { type: 'warning' })
  await deletePlot(id); ElMessage.success('删除成功'); fetchData()
}
onMounted(fetchData)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
</style>
