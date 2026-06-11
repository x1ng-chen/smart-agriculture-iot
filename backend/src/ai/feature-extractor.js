import { queryFluxRaw, queryFlux } from '../influxdb.js'
import { query } from '../db.js'

/**
 * AI 决策特征提取器
 *
 * 从 InfluxDB 聚合过去 2h 传感器数据（15分钟窗口均值），
 * 计算湿度变化率 / 趋势方向 / 波动率等衍生特征，
 * 结合灌溉历史与作物上下文，构建结构化的 LLM Prompt。
 */

const SENSOR_FIELDS = ['soil_moisture', 'soil_temp', 'air_temp', 'air_humidity', 'light']

// ── 1. 从 InfluxDB 提取 2h 时序聚合 ────────────────

async function fetchSensorWindow(deviceId, hours = 2, windowMin = 15) {
  const fields = SENSOR_FIELDS.map(f => `r._field == "${f}"`).join(' or ')
  const rows = await queryFluxRaw(
    `from(bucket: "sensor_data")
  |> range(start: -${hours}h)
  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${deviceId}")
  |> filter(fn: (r) => ${fields})
  |> aggregateWindow(every: ${windowMin}m, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])`
  )
  return rows.map(r => ({
    time: r._time,
    soil_moisture: r.soil_moisture ?? null,
    soil_temp: r.soil_temp ?? null,
    air_temp: r.air_temp ?? null,
    air_humidity: r.air_humidity ?? null,
    light: r.light ?? null
  }))
}

// ── 2. 计算衍生特征 ─────────────────────────────────

function simpleLinearSlope(values) {
  // 最小二乘法斜率 (单位: 每小时变化率)
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean)
    den += (i - xMean) ** 2
  }
  return den === 0 ? 0 : num / den
}

function computeFieldStats(values, windowMin = 15) {
  const valid = values.filter(v => v !== null && v !== undefined)
  if (valid.length === 0) return null

  const n = valid.length
  const mean = valid.reduce((a, b) => a + b, 0) / n
  const std = Math.sqrt(valid.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
  const current = valid[n - 1]
  const min = Math.min(...valid)
  const max = Math.max(...valid)

  // 趋势: 斜率 × 窗口数每小时的个数 = 每小时变化量
  const slopePerWindow = simpleLinearSlope(valid)
  const windowsPerHour = 60 / windowMin
  const trendPerHour = slopePerWindow * windowsPerHour

  // 变化率 = 趋势 / 均值 (百分比)
  const trendPctPerHour = mean !== 0 ? (trendPerHour / mean) * 100 : 0

  // 趋势方向
  let direction
  if (Math.abs(trendPctPerHour) < 2) direction = '稳定'
  else if (trendPctPerHour > 0) direction = '上升'
  else direction = '下降'

  return {
    current: round(current),
    mean: round(mean),
    min: round(min),
    max: round(max),
    std: round(std, 2),
    trend_per_hour: round(trendPerHour, 2),
    trend_pct_per_hour: round(trendPctPerHour, 1),
    trend_direction: direction,
    sample_count: n
  }
}

// ── 3. 构建结构化特征对象 ──────────────────────────

export async function extractFeatures(deviceId) {
  // 并行查询
  const [timeSeries, devInfo, lastIrrigation, recentLogs] = await Promise.all([
    fetchSensorWindow(deviceId, 2, 15),
    query(
      `SELECT d.device_sn, d.device_name, p.plot_name, p.crop_type, p.area_sqm,
        s.strategy_name, s.humidity_min, s.humidity_max,
        s.irrigation_duration_max, s.cooldown_interval
       FROM devices d
       LEFT JOIN plots p ON d.plot_id = p.id
       LEFT JOIN irrigation_strategies s ON p.id = s.plot_id AND s.enabled = 1
       WHERE d.id = ?`,
      [deviceId]
    ),
    queryFluxRaw(
      `from(bucket: "sensor_data")
  |> range(start: -1d)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.device_id == "${deviceId}" and r.status == "completed")
  |> filter(fn: (r) => r._field == "duration_sec" or r._field == "trigger_type" or r._field == "water_used_l" or r._field == "remark")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 3)`
    ),
    queryFluxRaw(
      `from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.device_id == "${deviceId}" and r.status == "completed")
  |> filter(fn: (r) => r._field == "duration_sec")
  |> count()
  |> group()
  |> keep(columns: ["_value"])`
    )
  ])

  const device = devInfo[0] || {}
  const lastIrrig = lastIrrigation[0] || null

  // 计算每个字段的统计特征
  const derived = {}
  for (const field of SENSOR_FIELDS) {
    const values = timeSeries.map(r => r[field])
    derived[field] = computeFieldStats(values, 15)
  }

  // 最近一次灌溉距今时间
  let lastIrrigHoursAgo = null
  if (lastIrrig) {
    const lastTime = new Date(lastIrrig._time).getTime()
    lastIrrigHoursAgo = round((Date.now() - lastTime) / 3600000, 1)
  }

  // 7天灌溉总次数
  const weeklyIrrigationCount = recentLogs.length > 0 ? recentLogs[0]._value : 0

  // 数据充足度
  const dataSufficient = timeSeries.length >= 4 // 至少 4 个窗口 (1h) 才算充足

  return {
    data_sufficient: dataSufficient,
    time_series_2h: timeSeries.slice(-8), // 最多返回 8 个窗口 (2h)
    window_count: timeSeries.length,
    derived,
    context: {
      device_sn: device.device_sn,
      device_name: device.device_name,
      plot_name: device.plot_name,
      crop_type: device.crop_type,
      area_sqm: device.area_sqm,
      strategy: {
        name: device.strategy_name,
        humidity_min: device.humidity_min,
        humidity_max: device.humidity_max,
        irrigation_duration_max: device.irrigation_duration_max,
        cooldown_interval: device.cooldown_interval
      },
      last_irrigation: lastIrrig ? {
        time: lastIrrig._time,
        duration_sec: lastIrrig.duration_sec,
        water_used_l: lastIrrig.water_used_l,
        trigger_type: lastIrrig.trigger_type,
        hours_ago: lastIrrigHoursAgo
      } : null,
      weekly_irrigation_count: weeklyIrrigationCount,
      current_hour: new Date().getHours(),
      time_of_day: getTimeOfDay(new Date().getHours())
    }
  }
}

// ── 4. 构建结构化 Prompt ────────────────────────────

export function buildDecisionPrompt(features) {
  const ctx = features.context
  const d = features.derived

  // 构建简洁的结构化特征摘要
  const fieldSummary = SENSOR_FIELDS
    .filter(f => d[f])
    .map(f => {
      const s = d[f]
      return `${f}: 当前=${s.current}, 均值=${s.mean}, 趋势=${s.trend_direction}(${s.trend_pct_per_hour > 0 ? '+' : ''}${s.trend_pct_per_hour}%/h), 波动(std)=${s.std}`
    })
    .join('\n')

  const lastIrrigText = ctx.last_irrigation
    ? `${ctx.last_irrigation.hours_ago}小时前 (持续${ctx.last_irrigation.duration_sec}秒, 用水${ctx.last_irrigation.water_used_l}L)`
    : '今日尚无灌溉记录'

  return `你是一个智慧农业灌溉决策专家。请根据以下实时特征数据，判断当前是否需要启动灌溉。

## 设备与作物信息
- 设备: ${ctx.device_name} (${ctx.device_sn})
- 地块: ${ctx.plot_name}
- 作物: ${ctx.crop_type || '未知'}，面积: ${ctx.area_sqm || '未知'}㎡
- 策略: ${ctx.strategy.name || '默认'} (湿度阈值 ${ctx.strategy.humidity_min}%-${ctx.strategy.humidity_max}%, 最大灌溉时长 ${ctx.strategy.irrigation_duration_max || 1800}秒)

## 传感器特征 (过去2小时, 15分钟窗口聚合)
${fieldSummary}

## 灌溉历史
- 最近一次灌溉: ${lastIrrigText}
- 近7天累计灌溉次数: ${ctx.weekly_irrigation_count}次

## 时间上下文
- 当前时间: ${ctx.current_hour}:00 (${ctx.time_of_day})

## 决策准则
1. 土壤湿度趋势持续下降且接近/低于 humidity_min → 建议灌溉
2. 中午高温强光时段 → 谨慎灌溉（蒸发快）
3. 刚灌溉不久且湿度已回升 → 暂不灌溉
4. 湿度趋势稳定且在安全范围 → 暂不灌溉
5. 建议灌溉时长不超过策略上限

## 数据质量
- 数据充足度: ${features.data_sufficient ? '充足' : '不足(窗口数=' + features.window_count + ')'}

请返回严格 JSON 格式 (不要其他文本):
{"should_irrigate": true/false, "duration_sec": 数字(秒), "confidence": 0.0~1.0, "reasoning": "中文简述判断依据"}`
}

// ── 辅助 ────────────────────────────────────────────

function round(v, decimals = 1) {
  if (v === null || v === undefined) return null
  return parseFloat(Number(v).toFixed(decimals))
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 8) return '清晨'
  if (hour >= 8 && hour < 11) return '上午'
  if (hour >= 11 && hour < 14) return '中午'
  if (hour >= 14 && hour < 18) return '下午'
  if (hour >= 18 && hour < 20) return '傍晚'
  return '夜间'
}
