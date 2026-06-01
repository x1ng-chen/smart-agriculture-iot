// Strategy Engine — 统一灌溉策略检查（供 MQTT 和华为云回调复用）

import { query } from "./db.js";

/**
 * 检查传感器数据是否触发灌溉策略，并自动执行
 * @param {number} deviceId
 * @param {number} plotId
 * @param {string} deviceSn
 * @param {object} payload - { soil_moisture, soil_temp, air_temp, air_humidity, light }
 * @returns {Promise<Array<{strategy_id:number, strategy_name:string, duration_sec:number}>>} 触发的策略日志
 */
export async function runStrategies(deviceId, plotId, deviceSn, payload) {
  const strategies = await query(
    "SELECT * FROM irrigation_strategies WHERE plot_id = ? AND enabled = 1 AND humidity_min <= ? AND humidity_max >= ?",
    [plotId, payload.soil_moisture, payload.soil_moisture]
  );

  const results = [];

  for (const s of strategies) {
    // 检查是否有正在执行中的同策略灌水
    const running = await query(
      "SELECT id FROM irrigation_logs WHERE device_id = ? AND strategy_id = ? AND status = 'running' LIMIT 1",
      [deviceId, s.id]
    );
    if (running.length > 0) continue;

    // 冷却间隔检查
    if (s.cooldown_interval) {
      const cooldownOk = await query(
        "SELECT id FROM irrigation_logs WHERE device_id = ? AND strategy_id = ? AND start_time > DATE_SUB(NOW(), INTERVAL ? SECOND) LIMIT 1",
        [deviceId, s.id, s.cooldown_interval]
      );
      if (cooldownOk.length > 0) continue;
    }

    await query(
      "INSERT INTO irrigation_logs (device_id, strategy_id, trigger_type, start_time, status) VALUES (?, ?, 'auto', NOW(), 'running')",
      [deviceId, s.id]
    );

    await query(
      "INSERT INTO alerts (device_id, alert_type, severity, message, resolved) VALUES (?, 'irrigation_started', 0, ?, 0)",
      [deviceId, "自动灌溉已启动 (策略: " + s.strategy_name + ")"]
    );

    console.log("[strategy] irrigation: device=" + deviceSn + " strategy=" + s.strategy_name);

    results.push({
      strategy_id: s.id,
      strategy_name: s.strategy_name,
      duration_sec: s.irrigation_duration_max,
    });
  }

  return results;
}
