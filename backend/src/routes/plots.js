import { Router } from 'express'
import { query } from '../db.js'
import { success, error } from '../utils/response.js'

const router = Router()

// 地块列表
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*,
        (SELECT count(*) FROM devices d WHERE d.plot_id = p.id) as device_count
       FROM plots p ORDER BY p.created_at DESC`
    )
    res.json(success(rows))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 单个地块
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*,
        (SELECT count(*) FROM devices d WHERE d.plot_id = p.id) as device_count
       FROM plots p WHERE p.id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json(error('地块不存在'))
    res.json(success(rows[0]))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 创建地块
router.post('/', async (req, res) => {
  try {
    const { plot_name, crop_type, area_sqm, description } = req.body
    if (!plot_name) return res.status(400).json(error('地块名称不能为空'))

    const result = await query(
      'INSERT INTO plots (plot_name, crop_type, area_sqm, description) VALUES (?, ?, ?, ?)',
      [plot_name, crop_type || null, area_sqm || null, description || null]
    )
    res.json(success({ id: result.insertId }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('创建失败'))
  }
})

// 更新地块
router.put('/:id', async (req, res) => {
  try {
    const { plot_name, crop_type, area_sqm, description } = req.body
    const fields = []
    const params = []

    if (plot_name !== undefined) { fields.push('plot_name = ?'); params.push(plot_name) }
    if (crop_type !== undefined) { fields.push('crop_type = ?'); params.push(crop_type) }
    if (area_sqm !== undefined) { fields.push('area_sqm = ?'); params.push(area_sqm) }
    if (description !== undefined) { fields.push('description = ?'); params.push(description) }

    if (fields.length === 0) return res.status(400).json(error('无更新内容'))

    params.push(req.params.id)
    await query(`UPDATE plots SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('更新失败'))
  }
})

// 删除地块
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM plots WHERE id = ?', [req.params.id])
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('删除失败'))
  }
})

export default router
