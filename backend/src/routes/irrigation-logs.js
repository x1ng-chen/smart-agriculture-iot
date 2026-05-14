import { Router } from 'express'
import { query } from '../db.js'
import { successWithTotal, error } from '../utils/response.js'

const router = Router()

// 灌溉记录列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const offset = (page - 1) * pageSize
    const { device_id, start, end } = req.query

    let where = 'WHERE 1=1'
    const params = []

    if (device_id) { where += ' AND l.device_id = ?'; params.push(device_id) }
    if (start) { where += ' AND l.start_time >= ?'; params.push(start) }
    if (end) { where += ' AND l.start_time <= ?'; params.push(end) }

    const countRows = await query(`SELECT count(*) as cnt FROM irrigation_logs l ${where}`, params)
    const total = countRows[0].cnt

    const rows = await query(
      `SELECT l.*, d.device_name, d.device_sn, s.strategy_name,
        u.real_name as operator_name
       FROM irrigation_logs l
       LEFT JOIN devices d ON l.device_id = d.id
       LEFT JOIN irrigation_strategies s ON l.strategy_id = s.id
       LEFT JOIN users u ON l.operator_id = u.id
       ${where} ORDER BY l.start_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )
    res.json(successWithTotal(rows, total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

export default router
