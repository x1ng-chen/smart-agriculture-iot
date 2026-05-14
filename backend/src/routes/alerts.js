import { Router } from 'express'
import { query } from '../db.js'
import { success, successWithTotal, error } from '../utils/response.js'

const router = Router()

// 告警列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const offset = (page - 1) * pageSize
    const { resolved, limit } = req.query

    let where = 'WHERE 1=1'
    const params = []

    if (resolved !== undefined) { where += ' AND a.resolved = ?'; params.push(resolved) }

    const actualLimit = limit ? parseInt(limit) : pageSize
    const actualOffset = limit ? 0 : offset

    const countRows = await query(`SELECT count(*) as cnt FROM alerts a ${where}`, params)
    const total = countRows[0].cnt

    const rows = await query(
      `SELECT a.*, d.device_name, d.device_sn
       FROM alerts a
       LEFT JOIN devices d ON a.device_id = d.id
       ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, actualLimit, actualOffset]
    )
    res.json(successWithTotal(rows, total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 解决告警
router.put('/:id/resolve', async (req, res) => {
  try {
    await query(
      'UPDATE alerts SET resolved = 1, resolved_at = NOW(), resolved_by = ? WHERE id = ?',
      [req.userId, req.params.id]
    )
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('操作失败'))
  }
})

export default router
