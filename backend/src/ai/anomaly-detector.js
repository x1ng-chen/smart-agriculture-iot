import { query } from '../db.js'
import {
  getLatestSensorData, createAnomaly, checkRecentAnomaly,
  createAlert, checkRecentAlert,
  queryFluxRaw
} from '../influxdb.js'

const BOUNDS = {
  soil_moisture: [0, 100],
  soil_temp: [-10, 60],
  air_temp: [-20, 55],
  air_humidity: [0, 100],
  light: [0, 200000]
}

const FIELD_NAMES = ['soil_moisture', 'soil_temp', 'air_temp', 'air_humidity', 'light']

export async function checkAnomalies(deviceId, deviceSn, currentPayload) {
  // 取最近 60 条 sensor_data 用于统计
  const rows = await queryFluxRaw(
    `from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${deviceId}")
  |> filter(fn: (r) => r._field == "soil_moisture" or r._field == "soil_temp" or r._field == "air_temp" or r._field == "air_humidity" or r._field == "light")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 60)`
  )

  // 查设备名
  const devRows = await query("SELECT device_name FROM devices WHERE id = ?", [deviceId]);
  const deviceName = devRows[0]?.device_name || '';

  const anomalies = []

  for (const field of FIELD_NAMES) {
    const currentVal = currentPayload[field]
    if (currentVal === null || currentVal === undefined) continue

    // Check 1: 不合理值
    const [lo, hi] = BOUNDS[field]
    if (currentVal < lo || currentVal > hi) {
      anomalies.push({
        anomaly_type: 'unrealistic_value',
        field_name: field,
        current_value: currentVal,
        expected_range: `${lo}-${hi}`,
        z_score: null,
        severity: 'danger',
        message: `${field} 值异常: ${currentVal}，合理范围 ${lo}-${hi}`
      })
      continue
    }

    // 需要至少 10 条历史数据做统计
    const values = rows.map(r => r[field]).filter(v => v !== null && v !== undefined)
    if (values.length < 10) continue

    // Check 2: Z-Score 突变检测
    const recent = values.slice(0, 30)
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length
    const std = Math.sqrt(recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length)

    if (std > 0.01) {
      const zScore = Math.abs((currentVal - mean) / std)
      if (zScore > 3) {
        anomalies.push({
          anomaly_type: currentVal > mean ? 'sudden_spike' : 'sudden_drop',
          field_name: field,
          current_value: currentVal,
          expected_range: `${(mean - 2 * std).toFixed(2)} - ${(mean + 2 * std).toFixed(2)} (均值 ${mean.toFixed(2)})`,
          z_score: parseFloat(zScore.toFixed(2)),
          severity: 'warning',
          message: `${field} 出现${currentVal > mean ? '突增' : '突降'}: ${currentVal}，偏离均值 ${zScore.toFixed(1)} 个标准差`
        })
        continue
      }
    }

    // Check 3: 传感器冻结检测
    const last10 = values.slice(0, 10)
    const mean10 = last10.reduce((a, b) => a + b, 0) / last10.length
    const std10 = Math.sqrt(last10.reduce((s, v) => s + (v - mean10) ** 2, 0) / last10.length)
    if (std10 < 0.01 && values.length >= 12) {
      anomalies.push({
        anomaly_type: 'sensor_frozen',
        field_name: field,
        current_value: currentVal,
        expected_range: `标准差 ${std10.toExponential(1)} (应 > 0.01)`,
        z_score: null,
        severity: 'warning',
        message: `${field} 传感器可能冻结，连续10条数据无变化 (值=${currentVal})`
      })
      continue
    }

    // Check 4: 渐进漂移检测
    if (values.length >= 30) {
      const maRecent = last10.reduce((a, b) => a + b, 0) / 10
      const maOld = values.slice(20, 30).reduce((a, b) => a + b, 0) / 10
      const fieldRange = hi - lo
      const drift = Math.abs(maRecent - maOld) / fieldRange
      if (drift > 0.2) {
        anomalies.push({
          anomaly_type: 'gradual_drift',
          field_name: field,
          current_value: currentVal,
          expected_range: `近期均值 ${maRecent.toFixed(2)} vs 早期均值 ${maOld.toFixed(2)}`,
          z_score: null,
          severity: 'warning',
          message: `${field} 出现渐进漂移，近期均值 ${maRecent.toFixed(2)} 偏离早期 ${maOld.toFixed(2)} (${(drift * 100).toFixed(0)}%)`
        })
      }
    }
  }

  // 写入异常记录
  for (const a of anomalies) {
    const recentlyExists = await checkRecentAnomaly(deviceId, a.anomaly_type, a.field_name, 60);
    if (recentlyExists) continue;

    await createAnomaly({
      device_id: deviceId,
      anomaly_type: a.anomaly_type,
      field_name: a.field_name,
      current_value: a.current_value,
      expected_range: a.expected_range,
      z_score: a.z_score,
      severity: a.severity,
      message: a.message,
      device_sn: deviceSn,
      device_name: deviceName
    });
    console.log('[anomaly] new: device=' + deviceSn + ' type=' + a.anomaly_type + ' field=' + a.field_name);

    // danger 级别同步写入 alerts
    if (a.severity === 'danger') {
      const recentlyAlerted = await checkRecentAlert(deviceId, 'ai_anomaly', 60);
      if (!recentlyAlerted) {
        await createAlert({
          device_id: deviceId,
          alert_type: 'ai_anomaly',
          alert_level: a.severity,
          message: a.message,
          device_sn: deviceSn,
          device_name: deviceName
        });
      }
    }
  }
}
