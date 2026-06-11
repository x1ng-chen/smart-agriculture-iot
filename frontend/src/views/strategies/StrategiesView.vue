<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">灌溉策略配置</span>
      <el-button type="primary" size="default" @click="handleAdd">添加策略</el-button>
    </div>
    <div class="page-card">
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="strategy_name" label="策略名称" min-width="140" />
        <el-table-column prop="plot_name" label="关联地块" width="140" />
        <el-table-column label="湿度阈值" width="160">
          <template #default="{ row }">
            <span class="range-tag">{{ row.humidity_min }}% ~ {{ row.humidity_max }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="温度阈值" width="160">
          <template #default="{ row }">
            <span class="range-tag">{{ row.temp_min || '—' }}°C ~ {{ row.temp_max || '—' }}°C</span>
          </template>
        </el-table-column>
        <el-table-column prop="irrigation_duration_max" label="最大时长(s)" width="110" />
        <el-table-column prop="cooldown_interval" label="冷却间隔(s)" width="110" />
        <el-table-column label="决策模式" width="90">
          <template #default="{ row }">
            <span class="mode-tag" :class="row.decision_mode === 'ai' ? 'ai' : 'rule'">
              {{ row.decision_mode === 'ai' ? 'AI' : '规则' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <span class="status-dot-sm" :class="row.enabled ? 'enabled' : 'disabled'"></span>
            {{ row.enabled ? '启用' : '停用' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="220">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link :loading="aiLoading === row.id" @click="handleAiDecision(row)">AI 建议</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page"
        :total="total" :page-size="pageSize"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchData"
      />
    </div>

    <!-- AI Decision Result Dialog -->
    <el-dialog v-model="aiDialogVisible" title="AI 灌溉建议" width="480px" top="15vh">
      <div v-if="aiResult" class="ai-decision-result">
        <div class="ai-decision-status" :class="aiResult.should_irrigate ? 'irrigate' : 'skip'">
          {{ aiResult.should_irrigate ? '建议灌溉' : '暂不需要' }}
        </div>
        <div class="ai-decision-row" v-if="aiResult.should_irrigate">
          <span class="ai-label">建议时长</span>
          <span class="ai-value">{{ aiResult.duration_sec }} 秒</span>
        </div>
        <div class="ai-decision-row">
          <span class="ai-label">置信度</span>
          <span class="ai-value">{{ (aiResult.confidence * 100).toFixed(0) }}%</span>
        </div>
        <div class="ai-decision-row">
          <span class="ai-label">分析依据</span>
          <span class="ai-reasoning">{{ aiResult.reasoning }}</span>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑策略' : '添加策略'" width="540px" top="10vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="策略名称" prop="strategy_name">
              <el-input v-model="form.strategy_name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联地块">
              <el-select v-model="form.plot_id" style="width:100%" clearable>
                <el-option v-for="p in plots" :key="p.id" :label="p.plot_name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="湿度下限(%)" prop="humidity_min">
              <el-input-number v-model="form.humidity_min" :min="0" :max="100" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="湿度上限(%)" prop="humidity_max">
              <el-input-number v-model="form.humidity_max" :min="0" :max="100" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="温度下限(°C)">
              <el-input-number v-model="form.temp_min" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="温度上限(°C)">
              <el-input-number v-model="form.temp_max" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="最大灌溉时长(s)" prop="irrigation_duration_max">
              <el-input-number v-model="form.irrigation_duration_max" :min="1" :max="7200" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="冷却间隔(s)">
              <el-input-number v-model="form.cooldown_interval" :min="0" :max="86400" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="流量(L/min)">
              <el-input-number v-model="form.water_flow_rate" :min="0" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="决策模式">
              <el-select v-model="form.decision_mode" style="width:100%">
                <el-option label="规则引擎" value="rule" />
                <el-option label="AI 智能" value="ai" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="启用">
              <el-switch v-model="form.enabled" />
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
import { getStrategies, createStrategy, updateStrategy, deleteStrategy, getPlots, getDevices, aiDecision } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const pageSize = 10
const dialogVisible = ref(false); const submitting = ref(false); const isEdit = ref(false); const editId = ref(null)
const formRef = ref(null); const plots = ref([])
const aiDialogVisible = ref(false); const aiResult = ref(null); const aiLoading = ref(null)

const form = reactive({ strategy_name: '', plot_id: null, humidity_min: null, humidity_max: null, temp_min: null, temp_max: null, irrigation_duration_max: 1800, cooldown_interval: 3600, water_flow_rate: null, decision_mode: 'rule', enabled: true })
const rules = {
  strategy_name: [{ required: true, message: '请输入策略名称', trigger: 'blur' }],
  humidity_min: [{ required: true, message: '请输入湿度下限', trigger: 'blur' }],
  humidity_max: [{ required: true, message: '请输入湿度上限', trigger: 'blur' }],
}

async function fetchData() {
  loading.value = true
  try { const res = await getStrategies({ page: page.value, pageSize }); tableData.value = res.data || []; total.value = res.total || 0 } catch { /* ignore */ }
  finally { loading.value = false }
}
async function fetchPlots() { try { const r = await getPlots(); plots.value = r.data || [] } catch { /* ignore */ } }

function resetForm() {
  Object.assign(form, { strategy_name: '', plot_id: null, humidity_min: null, humidity_max: null, temp_min: null, temp_max: null, irrigation_duration_max: 1800, cooldown_interval: 3600, water_flow_rate: null, decision_mode: 'rule', enabled: true })
}
function handleAdd() { isEdit.value = false; editId.value = null; resetForm(); fetchPlots(); dialogVisible.value = true }
function handleEdit(row) {
  isEdit.value = true; editId.value = row.id;
  Object.assign(form, { strategy_name: row.strategy_name, plot_id: row.plot_id, humidity_min: row.humidity_min, humidity_max: row.humidity_max, temp_min: row.temp_min, temp_max: row.temp_max, irrigation_duration_max: row.irrigation_duration_max, cooldown_interval: row.cooldown_interval, water_flow_rate: row.water_flow_rate, decision_mode: row.decision_mode || 'rule', enabled: !!row.enabled })
  fetchPlots(); dialogVisible.value = true
}
async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false); if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) { await updateStrategy(editId.value, { ...form }) }
    else { await createStrategy({ ...form }) }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
  } catch { /* ignore */ } finally { submitting.value = false }
}
async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该策略？', '提示', { type: 'warning' })
  await deleteStrategy(id); ElMessage.success('删除成功'); fetchData()
}
async function handleAiDecision(row) {
  aiLoading.value = row.id
  try {
    // 查找策略关联地块上的设备
    const devRes = await getDevices({ plot_id: row.plot_id, pageSize: 100 })
    const devices = devRes.data || []
    if (devices.length === 0) {
      ElMessage.warning('该策略关联的地块上没有设备')
      return
    }
    const result = await aiDecision(devices[0].id)
    aiResult.value = result.data
    aiDialogVisible.value = true
  } catch { ElMessage.error('AI 决策请求失败') }
  finally { aiLoading.value = null }
}
onMounted(fetchData)
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.page-card { padding: 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.range-tag { color: var(--accent); font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 500; }
.status-dot-sm { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.status-dot-sm.enabled { background: #10b981; box-shadow: 0 0 6px #10b981; }
.status-dot-sm.disabled { background: #64748b; }

.mode-tag { font-size: 12px; padding: 2px 10px; border-radius: 10px; font-weight: 500; }
.mode-tag.rule { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
.mode-tag.ai { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

.ai-decision-result { display: flex; flex-direction: column; gap: 16px; }
.ai-decision-status { font-size: 20px; font-weight: 700; text-align: center; padding: 12px; border-radius: 10px; }
.ai-decision-status.irrigate { background: rgba(6, 214, 160, 0.1); color: #06d6a0; border: 1px solid rgba(6, 214, 160, 0.2); }
.ai-decision-status.skip { background: rgba(100, 116, 139, 0.1); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.2); }
.ai-decision-row { display: flex; gap: 12px; align-items: flex-start; }
.ai-label { font-size: 13px; color: #64748b; min-width: 60px; flex-shrink: 0; }
.ai-value { font-size: 14px; color: #e2e8f0; font-weight: 500; }
.ai-reasoning { font-size: 13px; color: #94a3b8; line-height: 1.6; }
</style>
