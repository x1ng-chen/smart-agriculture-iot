import { Router } from 'express'
import { query } from '../db.js'
import { success, successWithTotal, error } from '../utils/response.js'

const router = Router()

// 策略列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const offset = (page - 1) * pageSize
    const plotId = req.query.plot_id

    let where = ''
    const params = []
    if (plotId) { where = 'WHERE s.plot_id = ?'; params.push(plotId) }

    const countRows = await query(`SELECT count(*) as cnt FROM irrigation_strategies s ${where}`, params)
    const total = countRows[0].cnt

    const rows = await query(
      `SELECT s.*, p.plot_name FROM irrigation_strategies s
       LEFT JOIN plots p ON s.plot_id = p.id
       ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )
    res.json(successWithTotal(rows, total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 单个策略
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT s.*, p.plot_name FROM irrigation_strategies s
       LEFT JOIN plots p ON s.plot_id = p.id WHERE s.id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json(error('策略不存在'))
    res.json(success(rows[0]))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 创建策略
router.post('/', async (req, res) => {
  try {
    const { strategy_name, plot_id, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled } = req.body
    if (!strategy_name || humidity_min === undefined || humidity_max === undefined) {
      return res.status(400).json(error('策略名称和湿度阈值不能为空'))
    }

    const result = await query(
      `INSERT INTO irrigation_strategies
       (strategy_name, plot_id, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [strategy_name, plot_id || null, humidity_min, humidity_max, temp_min || null, temp_max || null,
       irrigation_duration_max || 1800, cooldown_interval || 3600, water_flow_rate || null, enabled ?? 1]
    )
    res.json(success({ id: result.insertId }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('创建失败'))
  }
})

// 更新策略
router.put('/:id', async (req, res) => {
  try {
    const { strategy_name, plot_id, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled } = req.body
    const fields = []
    const params = []

    if (strategy_name !== undefined) { fields.push('strategy_name = ?'); params.push(strategy_name) }
    if (plot_id !== undefined) { fields.push('plot_id = ?'); params.push(plot_id) }
    if (humidity_min !== undefined) { fields.push('humidity_min = ?'); params.push(humidity_min) }
    if (humidity_max !== undefined) { fields.push('humidity_max = ?'); params.push(humidity_max) }
    if (temp_min !== undefined) { fields.push('temp_min = ?'); params.push(temp_min) }
    if (temp_max !== undefined) { fields.push('temp_max = ?'); params.push(temp_max) }
    if (irrigation_duration_max !== undefined) { fields.push('irrigation_duration_max = ?'); params.push(irrigation_duration_max) }
    if (cooldown_interval !== undefined) { fields.push('cooldown_interval = ?'); params.push(cooldown_interval) }
    if (water_flow_rate !== undefined) { fields.push('water_flow_rate = ?'); params.push(water_flow_rate) }
    if (enabled !== undefined) { fields.push('enabled = ?'); params.push(enabled) }

    if (fields.length === 0) return res.status(400).json(error('无更新内容'))

    params.push(req.params.id)
    await query(`UPDATE irrigation_strategies SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('更新失败'))
  }
})

// 删除策略
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM irrigation_strategies WHERE id = ?', [req.params.id])
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('删除失败'))
  }
})

export default router
