<template>
  <div class="page-wrap">
    <div class="page-toolbar">
      <span class="page-title">系统设置</span>
    </div>
    <div class="settings-grid">
      <div class="page-card">
        <h3 class="card-title">修改密码</h3>
        <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="100px" style="max-width:420px">
          <el-form-item label="当前密码" prop="old_password">
            <el-input v-model="pwdForm.old_password" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="new_password">
            <el-input v-model="pwdForm.new_password" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirm_password">
            <el-input v-model="pwdForm.confirm_password" type="password" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleChangePwd">修改密码</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="page-card">
        <h3 class="card-title">系统信息</h3>
        <div class="info-grid">
          <div class="info-item"><span class="info-key">版本号</span><span class="info-val">v0.1.0</span></div>
          <div class="info-item"><span class="info-key">前端框架</span><span class="info-val">Vue 3 + Vite + Element Plus</span></div>
          <div class="info-item"><span class="info-key">图表库</span><span class="info-val">ECharts 5</span></div>
          <div class="info-item"><span class="info-key">MQTT</span><span class="info-val">ws://localhost:8083/mqtt</span></div>
          <div class="info-item"><span class="info-key">数据库</span><span class="info-val">MySQL 8.0</span></div>
          <div class="info-item"><span class="info-key">设备类型</span><span class="info-val">BearPi Nano / ESP32</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { changePassword } from '@/api'

const pwdFormRef = ref(null)
const pwdForm = reactive({ old_password: '', new_password: '', confirm_password: '' })
const pwdRules = {
  old_password: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  new_password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }],
  confirm_password: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (_, val, cb) => val === pwdForm.new_password ? cb() : cb(new Error('两次密码不一致')), trigger: 'blur' }
  ]
}

async function handleChangePwd() {
  const valid = await pwdFormRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    await changePassword({ old_password: pwdForm.old_password, new_password: pwdForm.new_password })
    ElMessage.success('密码修改成功')
    pwdForm.old_password = ''
    pwdForm.new_password = ''
    pwdForm.confirm_password = ''
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '修改失败')
  }
}
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 16px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; }
.page-title { font-size: 15px; font-weight: 600; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.page-card { padding: 24px; background: rgba(16, 30, 60, 0.6); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 14px; }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.info-grid { display: flex; flex-direction: column; gap: 12px; }
.info-item { display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(0, 212, 255, 0.04); border-radius: 8px; border: 1px solid rgba(0, 212, 255, 0.06); }
.info-key { color: var(--text-muted); font-size: 13px; }
.info-val { color: var(--text-primary); font-family: monospace; font-size: 13px; }
</style>
