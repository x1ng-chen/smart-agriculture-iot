import { Router } from 'express'
import { getAlerts, resolveAlert } from '../influxdb.js'
import { success, successWithTotal, error } from '../utils/response.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const { resolved } = req.query

    const filters = {}
    if (resolved !== undefined) filters.resolved = resolved

    const result = await getAlerts(filters, page, pageSize)

    const rows = result.rows.map(r => ({
      id: r.alert_id,
      device_id: parseInt(r.device_id) || 0,
      device_name: r.device_name,
      device_sn: r.device_sn,
      alert_type: r.alert_type,
      alert_level: r.alert_level,
      message: r.message,
      resolved: r.resolved,
      resolved_at: r.resolved_at || null,
      resolved_by: r.resolved_by ? parseInt(r.resolved_by) : null,
      created_at: r._time
    }))

    res.json(successWithTotal(rows, result.total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

router.put('/:id/resolve', async (req, res) => {
  try {
    const ok = await resolveAlert(req.params.id, req.userId)
    if (!ok) return res.status(404).json(error('告警不存在'))
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('操作失败'))
  }
})

export default router
