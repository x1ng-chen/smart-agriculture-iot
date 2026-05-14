<template>
  <el-container class="main-layout">
    <!-- Sidebar -->
    <el-aside width="240px" class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="url(#brandGrad)" stroke-width="2" fill="none"/>
            <circle cx="20" cy="20" r="6" fill="url(#brandGrad)" opacity="0.6"/>
            <circle cx="20" cy="20" r="3" fill="#0a1628"/>
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
            </defs>
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-title">智慧农业</span>
          <span class="brand-sub">SMART AGRI</span>
        </div>
      </div>

      <div class="sidebar-nav">
        <div class="nav-section-label">主菜单</div>
        <router-link v-for="item in mainMenu" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }">
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="isActive(item.path)" class="nav-indicator"></span>
        </router-link>

        <div class="nav-section-label">运维管理</div>
        <router-link v-for="item in opsMenu" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }">
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="isActive(item.path)" class="nav-indicator"></span>
        </router-link>
      </div>

      <div class="sidebar-footer">
        <div class="sys-status">
          <span class="status-dot online"></span>
          <span class="status-text">系统运行中</span>
        </div>
      </div>
    </el-aside>

    <!-- Main -->
    <el-container class="main-area">
      <el-header class="top-header">
        <div class="header-left">
          <span class="header-title">{{ $route.meta.title }}</span>
        </div>
        <div class="header-right">
          <div class="user-info">
            <div class="user-avatar">
              <span>{{ (username || 'A')[0] }}</span>
            </div>
            <span class="user-name">{{ username }}</span>
            <span class="user-role">{{ roleName }}</span>
          </div>
          <el-button class="logout-btn" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  DataAnalysis, Monitor, Cpu, Grid, Setting, Document,
  Bell, Clock, Tools, SwitchButton
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const username = ref('')

const mainMenu = [
  { path: '/dashboard', label: '仪表盘', icon: DataAnalysis },
  { path: '/monitor', label: '实时监控', icon: Monitor },
  { path: '/devices', label: '设备管理', icon: Cpu },
  { path: '/plots', label: '地块管理', icon: Grid },
]
const opsMenu = [
  { path: '/strategies', label: '策略配置', icon: Setting },
  { path: '/irrigation-logs', label: '灌溉记录', icon: Document },
  { path: '/alerts', label: '告警中心', icon: Bell },
  { path: '/schedules', label: '定时任务', icon: Clock },
  { path: '/settings', label: '系统设置', icon: Tools },
]

const roleMap = { admin: '管理员', operator: '操作员' }
const roleName = computed(() => roleMap[authStore.userInfo?.role] || '用户')

function isActive(path) {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(path)
}

onMounted(async () => {
  await authStore.fetchUserInfo()
  username.value = authStore.userInfo?.real_name || authStore.userInfo?.username || '管理员'
})

function handleLogout() {
  authStore.clearAuth()
  router.push('/login')
}
</script>

<style scoped>
.main-layout { height: 100vh; }

/* === Sidebar === */
.sidebar {
  background: linear-gradient(180deg, #0b1730 0%, #0f1f3d 100%);
  border-right: 1px solid rgba(0, 212, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-brand {
  padding: 20px 20px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}
.brand-text { display: flex; flex-direction: column; }
.brand-title {
  font-family: 'Orbitron', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.brand-sub {
  font-family: 'Orbitron', monospace;
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 3px;
}

.sidebar-nav { flex: 1; padding: 12px 12px; overflow-y: auto; }
.nav-section-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
  padding: 16px 12px 8px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  position: relative;
  transition: all 0.25s ease;
  font-size: 14px;
}
.nav-item:hover {
  background: rgba(0, 212, 255, 0.08);
  color: var(--text-primary);
}
.nav-item.active {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(59, 130, 246, 0.1));
  color: var(--accent);
  font-weight: 500;
}
.nav-indicator {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: var(--accent);
  border-radius: 2px;
  box-shadow: 0 0 8px var(--accent);
}
.nav-icon { font-size: 18px; min-width: 18px; }

.sidebar-footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}
.sys-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(16, 185, 129, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}
.status-dot.online { background: #10b981; color: #10b981; }
.status-text { font-size: 12px; color: #6ee7b7; }

/* === Header === */
.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px !important;
  background: rgba(15, 29, 54, 0.8);
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
  backdrop-filter: blur(12px);
  padding: 0 24px;
}
.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--gradient-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #000;
}
.user-name { font-size: 14px; color: var(--text-primary); }
.user-role {
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(0, 212, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}
.logout-btn {
  background: transparent !important;
  border: 1px solid rgba(239, 68, 68, 0.3) !important;
  color: var(--accent-red) !important;
  border-radius: 8px !important;
  width: 36px; height: 36px;
  padding: 0 !important;
}
.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  border-color: var(--accent-red) !important;
}

/* === Main === */
.main-area { background: var(--bg-primary); }
.main-content {
  padding: 24px;
  overflow-y: auto;
  height: calc(100vh - 56px);
}
</style>
