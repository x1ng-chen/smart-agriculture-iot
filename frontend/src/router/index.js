import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'monitor',
        name: 'Monitor',
        component: () => import('@/views/monitor/MonitorView.vue'),
        meta: { title: '实时监控' }
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('@/views/devices/DevicesView.vue'),
        meta: { title: '设备管理' }
      },
      {
        path: 'plots',
        name: 'Plots',
        component: () => import('@/views/plots/PlotsView.vue'),
        meta: { title: '地块管理' }
      },
      {
        path: 'strategies',
        name: 'Strategies',
        component: () => import('@/views/strategies/StrategiesView.vue'),
        meta: { title: '策略配置' }
      },
      {
        path: 'irrigation-logs',
        name: 'IrrigationLogs',
        component: () => import('@/views/irrigation-logs/IrrigationLogsView.vue'),
        meta: { title: '灌溉记录' }
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('@/views/alerts/AlertsView.vue'),
        meta: { title: '告警中心' }
      },
      {
        path: 'schedules',
        name: 'Schedules',
        component: () => import('@/views/schedules/SchedulesView.vue'),
        meta: { title: '定时任务' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/SettingsView.vue'),
        meta: { title: '系统设置' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn()) {
    next('/login')
  } else if (to.path === '/login' && authStore.isLoggedIn()) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
