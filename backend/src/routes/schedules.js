import { Router } from 'express'
import { query } from '../db.js'
import { success, successWithTotal, error } from '../utils/response.js'
import { reloadTask, stopTask } from '../scheduler.js'

const router = Router()

// 定时任务列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const offset = (page - 1) * pageSize
    const deviceId = req.query.device_id

    let where = 'WHERE 1=1'
    const params = []
    if (deviceId) { where += ' AND st.device_id = ?'; params.push(deviceId) }

    const countRows = await query(`SELECT count(*) as cnt FROM scheduled_tasks st ${where}`, params)
    const total = countRows[0].cnt

    const rows = await query(
      `SELECT st.*, d.device_name, d.device_sn
       FROM scheduled_tasks st
       LEFT JOIN devices d ON st.device_id = d.id
       ${where} ORDER BY st.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )
    res.json(successWithTotal(rows, total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 创建任务
router.post('/', async (req, res) => {
  try {
    const { device_id, task_name, cron_expr, action, duration_sec, enabled } = req.body
    if (!device_id || !task_name || !cron_expr || !action) {
      return res.status(400).json(error('设备、名称、cron表达式和动作不能为空'))
    }

    const devices = await query('SELECT id FROM devices WHERE id = ?', [device_id])
    if (devices.length === 0) return res.status(404).json(error('设备不存在'))

    const result = await query(
      `INSERT INTO scheduled_tasks (device_id, task_name, cron_expr, action, duration_sec, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [device_id, task_name, cron_expr, action, duration_sec || null, enabled ?? true]
    )
    await reloadTask(result.insertId)
    res.json(success({ id: result.insertId }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('创建失败'))
  }
})

// 更新任务
router.put('/:id', async (req, res) => {
  try {
    const { task_name, cron_expr, action, duration_sec, enabled } = req.body
    const fields = []
    const params = []

    if (task_name !== undefined) { fields.push('task_name = ?'); params.push(task_name) }
    if (cron_expr !== undefined) { fields.push('cron_expr = ?'); params.push(cron_expr) }
    if (action !== undefined) { fields.push('action = ?'); params.push(action) }
    if (duration_sec !== undefined) { fields.push('duration_sec = ?'); params.push(duration_sec) }
    if (enabled !== undefined) { fields.push('enabled = ?'); params.push(enabled) }

    if (fields.length === 0) return res.status(400).json(error('无更新内容'))

    params.push(req.params.id)
    await query(`UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = ?`, params)
    await reloadTask(req.params.id)
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('更新失败'))
  }
})

// 删除任务
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM scheduled_tasks WHERE id = ?', [req.params.id])
    stopTask(parseInt(req.params.id))
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('删除失败'))
  }
})

export default router
