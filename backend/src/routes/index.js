import { Router } from 'express'
import authRoutes from './auth.js'
import deviceRoutes from './devices.js'
import plotRoutes from './plots.js'
import strategyRoutes from './strategies.js'
import irrigationLogRoutes from './irrigation-logs.js'
import alertRoutes from './alerts.js'
import scheduleRoutes from './schedules.js'
import exportRoutes from './export.js'
import dashboardRoutes from './dashboard.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 认证接口 (无需登录)
router.use('/auth', authRoutes)

// 仪表盘统计
router.use('/dashboard', authMiddleware, dashboardRoutes)

// 以下接口需要登录
router.use('/devices', authMiddleware, deviceRoutes)
router.use('/plots', authMiddleware, plotRoutes)
router.use('/strategies', authMiddleware, strategyRoutes)
router.use('/irrigation-logs', authMiddleware, irrigationLogRoutes)
router.use('/alerts', authMiddleware, alertRoutes)
router.use('/schedules', authMiddleware, scheduleRoutes)
router.use('/export', authMiddleware, exportRoutes)

export default router
