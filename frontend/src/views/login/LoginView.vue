<template>
  <div class="login-wrap">
    <div class="login-bg">
      <div class="bg-grid"></div>
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>
      <div class="bg-particles">
        <span v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)" />
      </div>
    </div>
    <div class="login-card-wrap">
      <div class="login-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
            <rect x="4" y="20" width="6" height="24" rx="2" fill="url(#g1)"/>
            <rect x="14" y="12" width="6" height="32" rx="2" fill="url(#g1)"/>
            <rect x="24" y="4" width="6" height="40" rx="2" fill="url(#g2)"/>
            <rect x="34" y="16" width="6" height="28" rx="2" fill="url(#g1)"/>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#06b6d4"/></linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="login-title">智慧农业灌溉系统</h1>
        <p class="login-subtitle">Smart Agriculture Irrigation</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            :prefix-icon="Lock"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" size="large" class="login-btn" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <p class="login-hint">默认账号 admin / admin123</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const formRef = ref(null)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function particleStyle(i) {
  const size = 2 + Math.random() * 4
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${Math.random() * 8}s`,
    animationDuration: `${6 + Math.random() * 10}s`
  }
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await login({ username: form.username, password: form.password })
    authStore.setToken(res.data.token)
    authStore.setUserInfo({
      user_id: res.data.user_id,
      username: res.data.username,
      role: res.data.role,
      real_name: res.data.real_name
    })
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (e) { /* handled */ }
  finally { loading.value = false }
}
</script>

<style scoped>
.login-wrap {
  height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Animated background */
.login-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.06) 1px, transparent 1px);
  background-size: 60px 60px;
}
.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.3;
}
.bg-glow-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #00d4ff, transparent);
  top: -200px; left: -100px;
  animation: float1 8s ease-in-out infinite;
}
.bg-glow-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #8b5cf6, transparent);
  bottom: -150px; right: -80px;
  animation: float2 10s ease-in-out infinite;
}
@keyframes float1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(60px, 40px); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-40px, -50px); }
}

.bg-particles { position: absolute; inset: 0; }
.particle {
  position: absolute;
  background: var(--accent);
  border-radius: 50%;
  opacity: 0;
  animation: particleFloat linear infinite;
}
@keyframes particleFloat {
  0% { opacity: 0; transform: translateY(0); }
  10% { opacity: 0.8; }
  90% { opacity: 0.2; }
  100% { opacity: 0; transform: translateY(-100px); }
}

/* Card */
.login-card-wrap {
  position: relative;
  z-index: 1;
  width: 420px;
  padding: 40px;
  background: rgba(16, 30, 60, 0.75);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.08), 0 12px 48px rgba(0, 0, 0, 0.4);
  transition: border-color 0.4s;
}
.login-card-wrap:hover {
  border-color: rgba(0, 212, 255, 0.4);
}

.login-logo { text-align: center; margin-bottom: 32px; }
.logo-icon { margin-bottom: 12px; }
.login-title {
  font-family: 'Orbitron', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
}
.login-subtitle {
  font-family: 'Orbitron', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 4px;
  text-transform: uppercase;
}

.login-form { margin-top: 8px; }
.login-btn {
  width: 100%;
  font-size: 16px;
  letter-spacing: 4px;
  border-radius: 10px;
  height: 46px;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}
</style>
