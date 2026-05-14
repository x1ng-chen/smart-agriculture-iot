import { Router } from 'express'
import { query } from '../db.js'
import { success, error } from '../utils/response.js'

const router = Router()

// 仪表盘统计数据
router.get('/stats', async (req, res) => {
  try {
    const [onlineRes, irrigationRes, alertRes, waterRes] = await Promise.all([
      query('SELECT count(*) as cnt FROM devices WHERE online_status = 1'),
      query("SELECT count(*) as cnt FROM irrigation_logs WHERE DATE(start_time) = CURDATE()"),
      query('SELECT count(*) as cnt FROM alerts WHERE resolved = 0'),
      query("SELECT COALESCE(SUM(water_used_l), 0) as total FROM irrigation_logs WHERE DATE(start_time) = CURDATE()")
    ])

    const recentAlerts = await query(
      `SELECT a.*, d.device_name FROM alerts a
       LEFT JOIN devices d ON a.device_id = d.id
       ORDER BY a.created_at DESC LIMIT 5`
    )

    const onlineDevices = await query(
      `SELECT id, device_name, device_sn, online_status, last_online_at
       FROM devices WHERE online_status = 1 ORDER BY last_online_at DESC`
    )

    res.json(success({
      onlineDevices: onlineRes[0].cnt,
      todayIrrigation: irrigationRes[0].cnt,
      activeAlerts: alertRes[0].cnt,
      totalWater: Math.round(waterRes[0].total * 100) / 100,
      recentAlerts,
      onlineDeviceList: onlineDevices
    }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

export default router
