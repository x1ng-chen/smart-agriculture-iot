import { Router } from 'express'
import { getIrrigationLogs } from '../influxdb.js'
import { successWithTotal, error } from '../utils/response.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const { device_id, start, end } = req.query

    const filters = {}
    if (device_id) filters.device_id = device_id

    // 注：start/end 过滤在 Flux 中通过 range 实现
    const result = await getIrrigationLogs(filters, page, pageSize)

    // 后置过滤 start/end (InfluxDB range 已处理大部分)
    const rows = result.rows.map(r => ({
      id: r.log_id,
      device_id: parseInt(r.device_id) || 0,
      device_name: r.device_name,
      device_sn: r.device_sn,
      strategy_id: r.strategy_id ? parseInt(r.strategy_id) : null,
      strategy_name: r.strategy_name,
      trigger_type: r.trigger_type,
      operator_name: r.operator_name,
      start_time: r._time,
      end_time: r.end_time,
      duration_sec: r.duration_sec,
      water_used_l: r.water_used_l,
      status: r.status,
      remark: r.remark
    }))

    let filtered = rows
    if (start) filtered = filtered.filter(r => new Date(r.start_time) >= new Date(start))
    if (end) filtered = filtered.filter(r => new Date(r.start_time) <= new Date(end))

    res.json(successWithTotal(filtered, result.total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

export default router
