// Alert Engine — 传感器数据入库后自动检查阈值并创建告警

import { query } from "./db.js";

/**
 * 检查最新一条 sensor_data 是否触发阈值告警
 * @param {number} deviceId
 * @param {number|null} plotId
 * @param {string} deviceSn
 * @param {object} properties - { soil_moisture, soil_temp, air_temp, air_humidity, light }
 * @param {object} options
 * @param {number} options.cooldownMinutes - 同一设备同一类型告警防抖（分钟），默认 30
 */
export async function checkAlerts(deviceId, plotId, deviceSn, properties, options = {}) {
  const cooldownMinutes = options.cooldownMinutes ?? 30;

  const strategies = plotId
    ? await query(
        "SELECT * FROM irrigation_strategies WHERE plot_id = ? AND enabled = 1",
        [plotId]
      )
    : [];

  let thresholds = {
    humidity_min: 20,
    humidity_max: 80,
    temp_min: 0,
    temp_max: 50,
  };

  for (const s of strategies) {
    if (s.humidity_min !== null && s.humidity_min > thresholds.humidity_min) {
      thresholds.humidity_min = s.humidity_min;
    }
    if (s.humidity_max !== null && s.humidity_max < thresholds.humidity_max) {
      thresholds.humidity_max = s.humidity_max;
    }
    if (s.temp_min !== null && s.temp_min > thresholds.temp_min) {
      thresholds.temp_min = s.temp_min;
    }
    if (s.temp_max !== null && s.temp_max < thresholds.temp_max) {
      thresholds.temp_max = s.temp_max;
    }
  }

  const checks = [];

  if (properties.soil_moisture !== undefined && properties.soil_moisture !== null && properties.soil_moisture < thresholds.humidity_min) {
    checks.push({
      alert_type: "low_soil_moisture",
      message: "土壤湿度过低 (" + properties.soil_moisture + "% < " + thresholds.humidity_min + "%)",
      alert_level: "danger",
    });
  }

  if (properties.soil_moisture !== undefined && properties.soil_moisture !== null && properties.soil_moisture > thresholds.humidity_max) {
    checks.push({
      alert_type: "high_soil_moisture",
      message: "土壤湿度过高 (" + properties.soil_moisture + "% > " + thresholds.humidity_max + "%)",
      alert_level: "danger",
    });
  }

  const ambientTemp = properties.air_temp ?? properties.soil_temp ?? 0;
  if (ambientTemp !== null && ambientTemp > thresholds.temp_max) {
    checks.push({
      alert_type: "high_temp",
      message: "温度过高 (" + ambientTemp + "°C > " + thresholds.temp_max + "°C)",
      alert_level: "warning",
    });
  }

  if (ambientTemp !== null && ambientTemp < thresholds.temp_min) {
    checks.push({
      alert_type: "low_temp",
      message: "温度过低 (" + ambientTemp + "°C < " + thresholds.temp_min + "°C)",
      alert_level: "warning",
    });
  }

  for (const check of checks) {
    const recent = await query(
      "SELECT id FROM alerts WHERE device_id = ? AND alert_type = ? AND resolved = 0 AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE) LIMIT 1",
      [deviceId, check.alert_type, cooldownMinutes]
    );

    if (recent.length === 0) {
      await query(
        "INSERT INTO alerts (device_id, alert_type, alert_level, message, resolved) VALUES (?, ?, ?, ?, 0)",
        [deviceId, check.alert_type, check.alert_level, check.message]
      );
      console.log("[alert] new: device=" + deviceSn + " type=" + check.alert_type + " \"" + check.message + "\"");
    }
  }
}
