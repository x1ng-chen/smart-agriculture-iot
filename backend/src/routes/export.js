import { Router } from 'express'
import { query } from '../db.js'
import { queryFluxRaw } from '../influxdb.js'
import { error } from '../utils/response.js'

const router = Router()

// 导出传感器数据CSV
router.get('/sensor-data', async (req, res) => {
  try {
    const { device_id, start, end } = req.query

    let rangeStart = '-30d'
    if (start) rangeStart = new Date(start).toISOString()
    let rangeStop = 'now()'
    if (end) rangeStop = new Date(end).toISOString()

    let deviceFilter = ''
    if (device_id) {
      deviceFilter = ` and r.device_id == "${device_id}"`
    }

    const rows = await queryFluxRaw(
      `from(bucket: "sensor_data")
  |> range(start: ${rangeStart}, stop: ${rangeStop})
  |> filter(fn: (r) => r._measurement == "sensor_data"${deviceFilter})
  |> filter(fn: (r) => r._field == "soil_moisture" or r._field == "soil_temp" or r._field == "air_temp" or r._field == "air_humidity" or r._field == "light")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 10000)`
    )

    // 获取设备名称映射
    const devices = await query('SELECT id, device_sn, device_name FROM devices')
    const deviceMap = new Map()
    for (const d of devices) {
      deviceMap.set(d.id, d)
    }

    const csv = toCsv(rows.map(r => {
      const dev = deviceMap.get(parseInt(r.device_id) || 0)
      return {
        device_name: dev?.device_name || '',
        device_sn: r.device_sn || dev?.device_sn || '',
        soil_moisture: r.soil_moisture,
        soil_temp: r.soil_temp,
        air_temp: r.air_temp,
        air_humidity: r.air_humidity,
        light: r.light,
        created_at: r._time
      }
    }),
      ['设备名称', '序列号', '土壤湿度', '土壤温度', '空气温度', '空气湿度', '光照强度', '时间'],
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

    let rangeStart = '-365d'
    if (start) rangeStart = new Date(start).toISOString()
    let rangeStop = 'now()'
    if (end) rangeStop = new Date(end).toISOString()

    let deviceFilter = ''
    if (device_id) {
      deviceFilter = ` and r.device_id == "${device_id}"`
    }

    const rows = await queryFluxRaw(
      `from(bucket: "sensor_data")
  |> range(start: ${rangeStart}, stop: ${rangeStop})
  |> filter(fn: (r) => r._measurement == "irrigation_logs"${deviceFilter})
  |> filter(fn: (r) => r._field == "trigger_type" or r._field == "duration_sec" or r._field == "water_used_l" or r._field == "status" or r._field == "remark" or r._field == "device_name" or r._field == "device_sn")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 10000)`
    )

    const csv = toCsv(rows.map(r => ({
      device_name: r.device_name || '',
      device_sn: r.device_sn || '',
      trigger_type: r.trigger_type || '',
      start_time: r._time,
      end_time: r.end_time || '',
      duration_sec: r.duration_sec,
      water_used_l: r.water_used_l,
      status: r.status || '',
      remark: r.remark || ''
    })),
      ['设备名称', '序列号', '触发方式', '开始时间', '结束时间', '持续(秒)', '用水(L)', '状态', '备注'],
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
