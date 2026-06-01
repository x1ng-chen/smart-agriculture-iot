<template>
  <div class="login-wrap">
    <!-- 真实摄影背景 -->
    <div class="bg-photo"></div>

    <!-- 轻微柔光叠层 -->
    <div class="bg-softlight"></div>

    <!-- 登录卡片 -->
    <div class="login-card-wrap">
      <div class="login-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 56 56" fill="none" width="50" height="50">
            <defs>
              <linearGradient id="dropGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#22c55e"/>
                <stop offset="100%" stop-color="#15803d"/>
              </linearGradient>
              <linearGradient id="leafGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#166534"/>
                <stop offset="100%" stop-color="#4ade80"/>
              </linearGradient>
            </defs>
            <path d="M28 6 C20 20 12 34 28 48 C44 34 36 20 28 6Z" fill="url(#dropGrad)" opacity="0.9"/>
            <path d="M24 28 Q30 18 42 20 Q36 28 30 28" stroke="url(#leafGrad)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M30 26 Q36 14 48 16 Q42 24 36 24" stroke="url(#leafGrad)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
            <ellipse cx="28" cy="40" rx="10" ry="2" stroke="#22c55e" stroke-width="0.8" fill="none" opacity="0.4"/>
            <ellipse cx="28" cy="44" rx="6" ry="1.5" stroke="#22c55e" stroke-width="0.6" fill="none" opacity="0.25"/>
          </svg>
        </div>
        <h1 class="login-title">智慧农业灌溉系统</h1>
        <p class="login-subtitle">Precision Agriculture · IoT Irrigation</p>
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
            <span class="btn-text">进入系统</span>
            <span class="btn-icon">→</span>
          </el-button>
        </el-form-item>
      </el-form>

      <p class="login-hint">
        演示账号 admin / admin123
      </p>
    </div>

    <!-- 右侧标语 -->
    <div class="hero-text">
      <div class="hero-line-1">智 慧 灌 溉</div>
      <div class="hero-line-2">精准农业 · 万物互联</div>
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
    ElMessage.success('欢迎回来，已进入智慧农业系统')
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
  overflow: hidden;
  background: #1a3a1a;
}

/* ============================
   真实照片背景 — 更亮
   ============================ */
.bg-photo {
  position: absolute;
  inset: -20px;
  z-index: 0;
  background:
    url('https://images.unsplash.com/photo-1704162485983-7b5cf81894e1?w=1920&q=85&fm=jpg&crop=entropy&fit=crop')
    center / cover no-repeat;
  filter: brightness(0.92) saturate(1.2) contrast(1.05);
  animation: bgBreath 18s ease-in-out infinite;
}
@keyframes bgBreath {
  0%, 100% { filter: brightness(0.92) saturate(1.2) contrast(1.05); }
  50%      { filter: brightness(0.98) saturate(1.25) contrast(1.05); }
}

/* 柔光层 — 从底部增加暖意 */
.bg-softlight {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse at 30% 40%, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
    linear-gradient(to top, rgba(30, 50, 20, 0.35) 0%, transparent 40%);
  pointer-events: none;
}

/* ============================
   卡片 — 浅色毛玻璃，融入照片
   ============================ */
.login-card-wrap {
  position: relative;
  z-index: 10;
  width: 420px;
  margin-left: 9%;
  padding: 42px 38px 36px;
  /* 暖白半透明，带一点绿调融入农田照片 */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(245, 250, 240, 0.14) 50%,
    rgba(255, 255, 255, 0.18) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 0 60px rgba(0, 0, 0, 0.1),
    0 16px 40px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}
.login-card-wrap:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.22) 0%,
    rgba(245, 250, 240, 0.17) 50%,
    rgba(255, 255, 255, 0.22) 100%
  );
  border-color: rgba(255, 255, 255, 0.45);
  box-shadow:
    0 0 80px rgba(0, 0, 0, 0.12),
    0 20px 50px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

/* Logo */
.login-logo { text-align: center; margin-bottom: 32px; }
.logo-icon {
  display: inline-block;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 14px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  transition: all 0.4s ease;
}
.login-card-wrap:hover .logo-icon {
  background: rgba(34, 197, 94, 0.13);
  border-color: rgba(34, 197, 94, 0.3);
  box-shadow: 0 0 24px rgba(34, 197, 94, 0.1);
  transform: scale(1.04);
}
.login-title {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(135deg, #166534 0%, #22c55e 50%, #15803d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
  letter-spacing: 2px;
}
.login-subtitle {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 11px;
  color: rgba(50, 70, 40, 0.7);
  letter-spacing: 3px;
}

/* 表单 */
.login-form { margin-top: 8px; }

.login-form :deep(.el-form-item) { margin-bottom: 16px; }

.login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.3) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-radius: 10px !important;
  box-shadow: none !important;
  padding: 5px 12px !important;
  transition: all 0.3s ease !important;
}
.login-form :deep(.el-input__wrapper:hover) {
  background: rgba(255, 255, 255, 0.45) !important;
  border-color: rgba(34, 197, 94, 0.25) !important;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.5) !important;
  border-color: rgba(34, 197, 94, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.08) !important;
}
.login-form :deep(.el-input__inner) {
  color: #1a2e1a !important;
  font-size: 14px !important;
  height: 40px !important;
  font-weight: 500 !important;
}
.login-form :deep(.el-input__inner::placeholder) {
  color: rgba(30, 50, 30, 0.4) !important;
}
.login-form :deep(.el-input__prefix) {
  color: rgba(34, 197, 94, 0.5);
}
.login-form :deep(.el-input__suffix) {
  color: rgba(34, 197, 94, 0.4);
}

/* 按钮 */
.login-btn {
  width: 100% !important;
  height: 48px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  letter-spacing: 4px !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #22c55e, #16a34a) !important;
  border: none !important;
  color: #fff !important;
  position: relative;
  overflow: hidden;
  transition: all 0.4s ease !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.login-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #16a34a, #15803d);
  opacity: 0;
  transition: opacity 0.4s ease;
}
.login-btn:hover::after { opacity: 1; }
.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(34, 197, 94, 0.4);
}
.login-btn:active { transform: translateY(0); }
.login-btn .btn-text,
.login-btn .btn-icon { position: relative; z-index: 1; }
.login-btn .btn-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}
.login-btn:hover .btn-icon { transform: translateX(4px); }

/* 提示 */
.login-hint {
  text-align: center;
  font-size: 12px;
  color: rgba(40, 60, 35, 0.5);
  margin-top: 12px;
  transition: color 0.3s;
}
.login-hint:hover { color: rgba(40, 60, 35, 0.75); }

/* ============================
   右侧标语 — 融入画面
   ============================ */
.hero-text {
  position: absolute;
  right: 7%;
  bottom: 12%;
  z-index: 10;
  text-align: right;
  pointer-events: none;
  user-select: none;
}
.hero-line-1 {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 40px;
  font-weight: 900;
  letter-spacing: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  margin-bottom: 6px;
}
.hero-line-2 {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 8px;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.3);
}

/* ============================
   响应式
   ============================ */
@media (max-width: 900px) {
  .login-card-wrap {
    margin: 0 auto;
    width: 88%;
    max-width: 390px;
    padding: 32px 24px 28px;
  }
  .hero-text { display: none; }
  .login-title { font-size: 22px; }
  .bg-photo {
    background-image:
      url('https://images.unsplash.com/photo-1692369584496-3216a88f94c1?w=900&q=80&fm=jpg&crop=entropy&fit=crop');
  }
}
</style>
