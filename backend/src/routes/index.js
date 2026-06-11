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
import huaweiCallbackRoutes from './huawei-callback.js'
import aiRoutes from './ai.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// ��֤�ӿ� (�����¼)
router.use('/auth', authRoutes)

// ��Ϊ�� IoT ����ת���ص� (�����¼, �ɻ�Ϊ��ƽ̨����)
router.use('/huawei', huaweiCallbackRoutes)

// �Ǳ���ͳ��
router.use('/dashboard', authMiddleware, dashboardRoutes)

// ���½ӿ���Ҫ��¼
router.use('/devices', authMiddleware, deviceRoutes)
router.use('/plots', authMiddleware, plotRoutes)
router.use('/strategies', authMiddleware, strategyRoutes)
router.use('/irrigation-logs', authMiddleware, irrigationLogRoutes)
router.use('/alerts', authMiddleware, alertRoutes)
router.use('/schedules', authMiddleware, scheduleRoutes)
router.use('/export', authMiddleware, exportRoutes)
router.use('/ai', authMiddleware, aiRoutes)

export default router
