import { InfluxDB, Point } from '@influxdata/influxdb-client'
import { randomUUID } from 'crypto'
import config from './config.js'

const client = new InfluxDB({
  url: config.influxdb.url,
  token: config.influxdb.token
})

const org = config.influxdb.org
const bucket = config.influxdb.bucket
const ms = 'ms'

// ── 优雅降级：InfluxDB 不可用时所有函数返回空/默认值 ──
let _available = true
let _checked = false

async function _checkAvailable() {
  if (_checked) return _available
  try {
    // 尝试轻量查询来判断 InfluxDB 是否可达
    const rows = await client.getQueryApi(org).collectRows(
      `from(bucket: "${bucket}") |> range(start: -1m) |> limit(n: 1)`
    )
    _available = true
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || (e.message && e.message.includes('ECONNREFUSED'))) {
      _available = false
      console.warn('[influxdb] InfluxDB 不可用 (127.0.0.1:8086)，数据查询与写入将返回空值/无操作')
    }
    // 其他错误（如 bucket 不存在）说明 InfluxDB 在运行，保持可用
  }
  _checked = true
  return _available
}

// 降级守卫：fn 正常执行，InfluxDB 不可用时返回 defaultVal（不抛错）
const _guard = (fn, defaultVal) => async (...args) => {
  if (!_available && _checked) return defaultVal
  try {
    return await fn(...args)
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || (e.message && e.message.includes('ECONNREFUSED'))) {
      _available = false
      _checked = true
      console.warn('[influxdb] InfluxDB 连接失败，已切换降级模式（返回空数据）')
      return defaultVal
    }
    throw e
  }
}

// 初始化时检测一次
_checkAvailable()

let _writeApi = null
function getWriteApi() {
  if (!_writeApi) {
    _writeApi = client.getWriteApi(org, bucket, ms)
  }
  return _writeApi
}

function getQueryApi() {
  return client.getQueryApi(org)
}

// ── 写入基础方法 ──────────────────────────────────

export function writePoint(measurement, tags, fields, timestamp, opts = {}) {
  if (!_available) return
  try {
    const p = new Point(measurement)
    if (timestamp) p.timestamp(timestamp)
    if (tags) {
      for (const [k, v] of Object.entries(tags)) {
        if (v !== null && v !== undefined) p.tag(k, String(v))
      }
    }
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        if (v === null || v === undefined) continue
        if (typeof v === 'number') {
          // sensor_data 强制使用 floatField，避免 integer/float 类型冲突
          // 其他 measurement 保持原逻辑 (intField for integers)
          if (opts.forceFloat || measurement === 'sensor_data') {
            p.floatField(k, v)
          } else if (Number.isInteger(v)) {
            p.intField(k, v)
          } else {
            p.floatField(k, v)
          }
        } else if (typeof v === 'boolean') {
          p.booleanField(k, v)
        } else {
          p.stringField(k, String(v))
        }
      }
    }
    getWriteApi().writePoint(p)
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || (e.message && e.message.includes('ECONNREFUSED'))) {
      _available = false; _checked = true
      console.warn('[influxdb] writePoint 失败，已切换降级模式')
    } else { throw e }
  }
}

export const flushWrite = _guard(async () => {
  await getWriteApi().flush()
}, undefined)

// ── 查询基础方法 ──────────────────────────────────

export const queryFlux = _guard(async (flux) => {
  const rows = []
  for await (const { values, tableMeta } of getQueryApi().iterateRows(flux)) {
    rows.push(tableMeta.toObject(values))
  }
  return rows
}, [])

export const queryFluxRaw = _guard(async (flux) => {
  const rows = []
  for await (const { values, tableMeta } of getQueryApi().iterateRows(flux)) {
    const o = tableMeta.toObject(values)
    rows.push(o)
  }
  return rows
}, [])

// ── 分页辅助 ──────────────────────────────────────

async function paginatedQuery(baseFilter, fieldFilter, extraPipe, limit, offset) {
  let pipe = `from(bucket: "${bucket}")\n${baseFilter}\n${fieldFilter}`
  if (extraPipe) pipe += '\n' + extraPipe
  pipe += `\n  |> limit(n: ${limit}, offset: ${offset})`
  return await queryFlux(pipe)
}

async function countQuery(baseFilter, fieldFilter) {
  const pipe = `from(bucket: "${bucket}")\n${baseFilter}\n${fieldFilter}\n  |> count()\n  |> group()\n  |> keep(columns: ["_value"])`
  const rows = await queryFlux(pipe)
  return rows.length > 0 ? rows[0]._value : 0
}

export async function paginate(baseFilter, fieldFilter, extraPipe, page, pageSize) {
  const offset = (page - 1) * pageSize
  const [rows, total] = await Promise.all([
    paginatedQuery(baseFilter, fieldFilter, extraPipe, pageSize, offset),
    countQuery(baseFilter, fieldFilter)
  ])
  return { rows, total: typeof total === 'number' ? total : rows.length }
}

// ── Sensor Data ───────────────────────────────────

export async function writeSensorData(deviceId, deviceSn, payload) {
  // 确保所有数值都是浮点数（InfluxDB 字段类型一致）
  const fields = {
    soil_moisture: payload.soil_moisture != null ? parseFloat(Number(payload.soil_moisture).toFixed(2)) : null,
    soil_temp: payload.soil_temp != null ? parseFloat(Number(payload.soil_temp).toFixed(2)) : null,
    air_temp: payload.air_temp != null ? parseFloat(Number(payload.air_temp).toFixed(2)) : null,
    air_humidity: payload.air_humidity != null ? parseFloat(Number(payload.air_humidity).toFixed(2)) : null,
    light: payload.light != null ? parseFloat(Number(payload.light).toFixed(2)) : null
  }

  writePoint('sensor_data',
    { device_id: String(deviceId), device_sn: deviceSn },
    fields,
    new Date()
  )
}

export async function getLatestSensorData(deviceId) {
  const rows = await queryFlux(
    `from(bucket: "${bucket}")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${deviceId}")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 1)`
  )
  return rows[0] || null
}

export async function getSensorDataHistory(deviceId, start, end, page, pageSize) {
  let rangeStart = '-30d'
  if (start) rangeStart = new Date(start).toISOString()
  let rangeStop = 'now()'
  if (end) rangeStop = new Date(end).toISOString()

  const offset = (page - 1) * pageSize

  // 查询所有传感器字段（而非仅 soil_moisture），pivot 后每行包含全部字段
  const dataQuery = `from(bucket: "${bucket}")
  |> range(start: ${rangeStart}, stop: ${rangeStop})
  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${deviceId}")
  |> filter(fn: (r) => r._field == "soil_moisture" or r._field == "soil_temp" or r._field == "air_temp" or r._field == "air_humidity" or r._field == "light")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> group()
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: ${pageSize}, offset: ${offset})`

  const rows = await queryFlux(dataQuery)

  // 用 soil_moisture 计数（每个时间点一条，代表实际数据行数）
  const countQuery = `from(bucket: "${bucket}")
  |> range(start: ${rangeStart}, stop: ${rangeStop})
  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${deviceId}")
  |> filter(fn: (r) => r._field == "soil_moisture")
  |> count()
  |> group()
  |> keep(columns: ["_value"])`

  const countRows = await queryFlux(countQuery)
  const total = countRows.length > 0 ? countRows[0]._value : 0

  return { rows, total }
}

export async function getSensorData24hTrends(deviceId) {
  let filter = ''
  if (deviceId) {
    filter = `  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${deviceId}")`
  } else {
    filter = `  |> filter(fn: (r) => r._measurement == "sensor_data")`
  }
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -24h)
${filter}
  |> filter(fn: (r) => r._field == "soil_moisture" or r._field == "soil_temp" or r._field == "air_temp" or r._field == "air_humidity")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> group()`
  )
  return rows.map(r => ({
    hour_bucket: r._time,
    avg_moisture: r.soil_moisture,
    avg_soil_temp: r.soil_temp,
    avg_air_temp: r.air_temp,
    avg_humidity: r.air_humidity
  }))
}

export async function getDevicesLatestData() {
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r._field == "soil_moisture" or r._field == "soil_temp" or r._field == "air_temp" or r._field == "air_humidity" or r._field == "light")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> group(columns: ["device_id"])
  |> last()
  |> group()`
  )
  return rows.map(r => ({
    device_id: parseInt(r.device_id) || 0,
    soil_moisture: r.soil_moisture,
    soil_temp: r.soil_temp,
    air_temp: r.air_temp,
    air_humidity: r.air_humidity,
    light: r.light,
    last_data_at: r._time
  }))
}

// ── Irrigation Logs ───────────────────────────────

export async function createIrrigationLog(log) {
  const logId = randomUUID()
  const tags = { device_id: String(log.device_id), log_id: logId }
  const fields = {
    trigger_type: log.trigger_type || 'manual',
    status: 'running',
    device_sn: log.device_sn || '',
    device_name: log.device_name || '',
    strategy_name: log.strategy_name || '',
    operator_name: log.operator_name || '',
    remark: log.remark || ''
  }
  if (log.strategy_id) tags.strategy_id = String(log.strategy_id)
  if (log.operator_id) tags.operator_id = String(log.operator_id)

  writePoint('irrigation_logs', tags, fields, log.start_time || new Date())
  await flushWrite()
  return logId
}

export async function updateIrrigationLog(logId, fields) {
  // 查找原记录获取 tags 和 time
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.log_id == "${logId}")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> limit(n: 1)`
  )
  if (rows.length === 0) return false

  const original = rows[0]
  const tags = { device_id: original.device_id, log_id: logId }
  if (original.strategy_id) tags.strategy_id = original.strategy_id
  if (original.operator_id) tags.operator_id = original.operator_id

  const merged = {
    trigger_type: original.trigger_type,
    status: original.status,
    device_sn: original.device_sn || '',
    device_name: original.device_name || '',
    strategy_name: original.strategy_name || '',
    operator_name: original.operator_name || '',
    remark: original.remark || '',
    ...fields
  }

  writePoint('irrigation_logs', tags, merged, new Date(original._time))
  await flushWrite()
  return true
}

export async function checkRunningIrrigation(deviceId) {
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.device_id == "${deviceId}")
  |> filter(fn: (r) => r._field == "status")
  |> filter(fn: (r) => r._value == "running")
  |> limit(n: 1)`
  )
  return rows.length > 0
}

export async function checkRecentIrrigation(deviceId, strategyId, withinSeconds) {
  const rows = await queryFlux(
    `from(bucket: "${bucket}")
  |> range(start: -${withinSeconds}s)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.device_id == "${deviceId}" and r.strategy_id == "${strategyId}")
  |> filter(fn: (r) => r._field == "status")
  |> limit(n: 1)`
  )
  return rows.length > 0
}

export async function getIrrigationLogs(filters, page, pageSize) {
  const conditions = ['r._measurement == "irrigation_logs"']
  if (filters.device_id) conditions.push(`r.device_id == "${filters.device_id}"`)
  // status filter handled via _field/_value in the query

  const rangeStart = '-365d'
  const baseFilter = `  |> range(start: ${rangeStart})\n  |> filter(fn: (r) => ${conditions.join(' and ')})`
  const fieldFilter = `  |> filter(fn: (r) => r._field == "log_id")`
  const extra = `  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")\n  |> group()\n  |> sort(columns: ["_time"], desc: true)`

  return await paginate(baseFilter, fieldFilter, extra, page, pageSize)
}

export async function getRunningIrrigationLog(deviceId) {
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -2h)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.device_id == "${deviceId}")
  |> filter(fn: (r) => r._field == "status" and r._value == "running")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> limit(n: 1)`
  )
  return rows[0] || null
}

export async function getDashboardIrrigationStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const [countRows, waterRows] = await Promise.all([
    queryFluxRaw(
      `from(bucket: "${bucket}")
  |> range(start: ${todayStr})
  |> filter(fn: (r) => r._measurement == "irrigation_logs")
  |> filter(fn: (r) => r._field == "log_id")
  |> count()
  |> group()
  |> keep(columns: ["_value"])`
    ),
    queryFluxRaw(
      `from(bucket: "${bucket}")
  |> range(start: ${todayStr})
  |> filter(fn: (r) => r._measurement == "irrigation_logs")
  |> filter(fn: (r) => r._field == "water_used_l")
  |> sum()
  |> group()
  |> keep(columns: ["_value"])`
    )
  ])

  return {
    todayIrrigation: countRows.length > 0 ? countRows[0]._value : 0,
    totalWater: waterRows.length > 0 ? Math.round(waterRows[0]._value * 100) / 100 : 0
  }
}

export async function getIrrigationLogById(logId) {
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.log_id == "${logId}")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> limit(n: 1)`
  )
  return rows[0] || null
}

// ── Alerts ────────────────────────────────────────

export async function createAlert(alert) {
  const alertId = randomUUID()
  const tags = { device_id: String(alert.device_id), alert_id: alertId, alert_type: alert.alert_type }
  const fields = {
    alert_level: alert.alert_level || 'warning',
    message: alert.message || '',
    resolved: 0,
    device_sn: alert.device_sn || '',
    device_name: alert.device_name || ''
  }
  writePoint('alerts', tags, fields, new Date())
  await flushWrite()
  return alertId
}

export async function resolveAlert(alertId, userId) {
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -365d)
  |> filter(fn: (r) => r._measurement == "alerts" and r.alert_id == "${alertId}")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> limit(n: 1)`
  )
  if (rows.length === 0) return false

  const original = rows[0]
  const tags = { device_id: original.device_id, alert_id: alertId, alert_type: original.alert_type }
  const fields = {
    alert_level: original.alert_level,
    message: original.message,
    device_sn: original.device_sn || '',
    device_name: original.device_name || '',
    resolved: 1,
    resolved_by: String(userId || ''),
    resolved_at: new Date().toISOString()
  }
  writePoint('alerts', tags, fields, new Date(original._time))
  await flushWrite()
  return true
}

export async function checkRecentAlert(deviceId, alertType, withinMinutes) {
  const rows = await queryFlux(
    `from(bucket: "${bucket}")
  |> range(start: -${withinMinutes}m)
  |> filter(fn: (r) => r._measurement == "alerts" and r.device_id == "${deviceId}" and r.alert_type == "${alertType}")
  |> filter(fn: (r) => r._field == "resolved" and r._value == 0)
  |> limit(n: 1)`
  )
  return rows.length > 0
}

export async function getAlerts(filters, page, pageSize) {
  const conditions = ['r._measurement == "alerts"']
  // resolved filter handled below
  const otherFilters = []
  if (filters.resolved !== undefined) {
    // We'll filter in pivot stage
  }

  const rangeStart = '-365d'
  const baseFilter = `  |> range(start: ${rangeStart})\n  |> filter(fn: (r) => ${conditions.join(' and ')})`
  const fieldFilter = `  |> filter(fn: (r) => r._field == "alert_id" or r._field == "device_name" or r._field == "message" or r._field == "alert_level" or r._field == "resolved" or r._field == "alert_type" or r._field == "device_sn")`
  const extra = `  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")\n  |> group()\n  |> sort(columns: ["_time"], desc: true)`

  const result = await paginate(baseFilter, fieldFilter, extra, page, pageSize)

  // 后置过滤 resolved
  if (filters.resolved !== undefined) {
    const target = parseInt(filters.resolved)
    result.rows = result.rows.filter(r => r.resolved === target || parseInt(r.resolved) === target)
  }

  return result
}

export async function getRecentAlerts(limit = 5) {
  return await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "alerts")
  |> filter(fn: (r) => r._field == "message" or r._field == "alert_level" or r._field == "resolved" or r._field == "device_name" or r._field == "device_sn" or r._field == "alert_type")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> group()
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: ${limit})`
  )
}

export async function getUnresolvedAlertCount() {
  const rows = await queryFluxRaw(
    `from(bucket: "${bucket}")
  |> range(start: -365d)
  |> filter(fn: (r) => r._measurement == "alerts")
  |> filter(fn: (r) => r._field == "resolved" and r._value == 0)
  |> count()
  |> group()
  |> keep(columns: ["_value"])`
  )
  return rows.length > 0 ? rows[0]._value : 0
}

// ── AI Anomalies ──────────────────────────────────

export async function createAnomaly(anomaly) {
  const anomalyId = randomUUID()
  const tags = {
    device_id: String(anomaly.device_id),
    anomaly_id: anomalyId,
    anomaly_type: anomaly.anomaly_type,
    field_name: anomaly.field_name || ''
  }
  const fields = {
    current_value: anomaly.current_value,
    expected_range: anomaly.expected_range || '',
    z_score: anomaly.z_score,
    severity: anomaly.severity || 'warning',
    message: anomaly.message || '',
    resolved: 0,
    device_sn: anomaly.device_sn || '',
    device_name: anomaly.device_name || ''
  }
  writePoint('ai_anomalies', tags, fields, new Date())
  await flushWrite()
  return anomalyId
}

export async function checkRecentAnomaly(deviceId, anomalyType, fieldName, withinMinutes) {
  const rows = await queryFlux(
    `from(bucket: "${bucket}")
  |> range(start: -${withinMinutes}m)
  |> filter(fn: (r) => r._measurement == "ai_anomalies" and r.device_id == "${deviceId}" and r.anomaly_type == "${anomalyType}" and r.field_name == "${fieldName}")
  |> filter(fn: (r) => r._field == "anomaly_id")
  |> limit(n: 1)`
  )
  return rows.length > 0
}

export async function getAnomalies(filters, page, pageSize) {
  const conditions = ['r._measurement == "ai_anomalies"']
  if (filters.device_id) conditions.push(`r.device_id == "${filters.device_id}"`)

  const rangeStart = '-365d'
  const baseFilter = `  |> range(start: ${rangeStart})\n  |> filter(fn: (r) => ${conditions.join(' and ')})`
  const fieldFilter = `  |> filter(fn: (r) => r._field == "anomaly_id")`
  const extra = `  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")\n  |> sort(columns: ["_time"], desc: true)`

  const result = await paginate(baseFilter, fieldFilter, extra, page, pageSize)

  if (filters.resolved !== undefined) {
    const target = parseInt(filters.resolved)
    result.rows = result.rows.filter(r => r.resolved === target || parseInt(r.resolved) === target)
  }

  return result
}
