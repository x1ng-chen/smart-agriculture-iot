import { Router } from 'express'
import { handleChat } from '../ai/chat-handler.js'
import { generateDecision } from '../ai/ai-decision-engine.js'
import { success, successWithTotal, error } from '../utils/response.js'
import { getAnomalies } from '../influxdb.js'
import { query } from '../db.js'

const router = Router()

// POST /api/v1/ai/chat
router.post('/chat', async (req, res) => {
  const { message, history } = req.body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json(error('请输入消息'))
  }

  try {
    const result = await handleChat(message.trim(), history || [])
    res.json(success(result))
  } catch (err) {
    console.error('[ai/chat]', err)
    res.status(500).json(error('AI 服务异常'))
  }
})

// POST /api/v1/ai/decision
router.post('/decision', async (req, res) => {
  const { device_id } = req.body

  if (!device_id) {
    return res.status(400).json(error('请指定设备ID'))
  }

  try {
    const devices = await query('SELECT id FROM devices WHERE id = ?', [device_id])
    if (devices.length === 0) {
      return res.status(404).json(error('设备不存在'))
    }

    const result = await generateDecision(device_id)
    res.json(success(result))
  } catch (err) {
    console.error('[ai/decision]', err)
    res.status(500).json(error('AI 决策服务异常'))
  }
})

// GET /api/v1/ai/anomalies
router.get('/anomalies', async (req, res) => {
  const { device_id, resolved, page = 1, pageSize = 20 } = req.query

  try {
    const filters = {}
    if (device_id) filters.device_id = device_id
    if (resolved !== undefined) filters.resolved = resolved

    const result = await getAnomalies(filters, parseInt(page), parseInt(pageSize))

    const rows = result.rows.map(r => ({
      id: r.anomaly_id,
      device_id: parseInt(r.device_id) || 0,
      device_name: r.device_name,
      device_sn: r.device_sn,
      anomaly_type: r.anomaly_type,
      field_name: r.field_name,
      current_value: r.current_value,
      expected_range: r.expected_range,
      z_score: r.z_score,
      severity: r.severity,
      message: r.message,
      resolved: r.resolved,
      created_at: r._time
    }))

    res.json(successWithTotal(rows, result.total))
  } catch (err) {
    console.error('[ai/anomalies]', err)
    res.status(500).json(error('查询异常记录失败'))
  }
})

export default router
