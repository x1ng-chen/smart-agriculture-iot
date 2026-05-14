import { Router } from 'express'
import { query } from '../db.js'
import { error } from '../utils/response.js'

const router = Router()

// 导出传感器数据CSV
router.get('/sensor-data', async (req, res) => {
  try {
    const { device_id, start, end } = req.query

    let where = 'WHERE 1=1'
    const params = []
    if (device_id) { where += ' AND sd.device_id = ?'; params.push(device_id) }
    if (start) { where += ' AND sd.created_at >= ?'; params.push(start) }
    if (end) { where += ' AND sd.created_at <= ?'; params.push(end) }

    const rows = await query(
      `SELECT d.device_name, d.device_sn, sd.soil_moisture, sd.soil_temp,
        sd.air_temp, sd.air_humidity, sd.light, sd.created_at
       FROM sensor_data sd
       LEFT JOIN devices d ON sd.device_id = d.id
       ${where} ORDER BY sd.created_at DESC LIMIT 10000`,
      params
    )

    const csv = toCsv(rows, ['设备名称', '序列号', '土壤湿度', '土壤温度', '空气温度', '空气湿度', '光照强度', '时间'],
      ['device_name', 'device_sn', 'soil_moisture', 'soil_temp', 'air_temp', 'air_humidity', 'light', 'created_at'])

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=sensor-data-${Date.now()}.csv`)
    res.send(csv)
  } catch (e) {
    console.error(e)
    res.status(500).json(error('导出失败'))
  }
})

// 导出灌溉记录CSV
router.get('/irrigation-logs', async (req, res) => {
  try {
    const { device_id, start, end } = req.query

    let where = 'WHERE 1=1'
    const params = []
    if (device_id) { where += ' AND l.device_id = ?'; params.push(device_id) }
    if (start) { where += ' AND l.start_time >= ?'; params.push(start) }
    if (end) { where += ' AND l.start_time <= ?'; params.push(end) }

    const rows = await query(
      `SELECT d.device_name, d.device_sn, l.trigger_type, l.start_time, l.end_time,
        l.duration_sec, l.water_used_l, l.status, l.remark
       FROM irrigation_logs l
       LEFT JOIN devices d ON l.device_id = d.id
       ${where} ORDER BY l.start_time DESC LIMIT 10000`,
      params
    )

    const csv = toCsv(rows, ['设备名称', '序列号', '触发方式', '开始时间', '结束时间', '持续(秒)', '用水(L)', '状态', '备注'],
      ['device_name', 'device_sn', 'trigger_type', 'start_time', 'end_time', 'duration_sec', 'water_used_l', 'status', 'remark'])

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=irrigation-logs-${Date.now()}.csv`)
    res.send(csv)
  } catch (e) {
    console.error(e)
    res.status(500).json(error('导出失败'))
  }
})

function toCsv(rows, headers, fields) {
  const bom = '﻿'
  const headerLine = headers.join(',')
  const dataLines = rows.map(row =>
    fields.map(f => {
      const val = row[f]
      if (val === null || val === undefined) return ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  return bom + headerLine + '\n' + dataLines.join('\n')
}

export default router
