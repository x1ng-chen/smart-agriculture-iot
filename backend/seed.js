import bcrypt from 'bcryptjs'
import { query } from './src/db.js'

const hash = await bcrypt.hash('123456', 10)

// Clear existing test data
await query('DELETE FROM scheduled_tasks WHERE id > 0')
await query('DELETE FROM alerts WHERE id > 0')
await query('DELETE FROM irrigation_logs WHERE id > 0')
await query('DELETE FROM sensor_data WHERE id > 0')
await query('DELETE FROM irrigation_strategies WHERE id > 0')
await query('DELETE FROM devices WHERE id > 0')
await query('DELETE FROM plots WHERE id > 0')
await query("DELETE FROM users WHERE username != 'admin'")

// Users
await query(
  "INSERT INTO users (username, password, real_name, role, phone, status) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)",
  ['zhangsan', hash, '张三', 'operator', '13800001111', 1,
   'lisi', hash, '李四', 'operator', '13800002222', 1,
   'wangwu', hash, '王五', 'operator', '13800003333', 1]
)
console.log('Users: 3 operators created')

// Plots
const plotResult = await query(
  `INSERT INTO plots (plot_name, crop_type, area_sqm, description) VALUES
   (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
  ['一号小麦田', 'wheat', 5000, '北区主试验田，种植冬小麦，配备智能滴灌系统',
   '二号玉米地', 'corn', 3200, '东区高产玉米示范田，土壤为砂壤土',
   '三号蔬菜大棚', 'vegetable', 800, '温室大棚，种植番茄和黄瓜',
   '四号果园', 'fruit', 2100, '南区苹果园，树龄5年']
)
const plotBaseId = plotResult.insertId
console.log('Plots: 4 created, base ID:', plotBaseId)

// Devices
const devResult = await query(
  `INSERT INTO devices (device_sn, device_name, device_type, firmware_ver, plot_id, latitude, longitude, online_status, last_online_at, status) VALUES
   (?, ?, ?, ?, ?, ?, ?, 1, NOW(), 1),
   (?, ?, ?, ?, ?, ?, ?, 1, NOW(), 1),
   (?, ?, ?, ?, ?, ?, ?, 1, NOW(), 1),
   (?, ?, ?, ?, ?, ?, ?, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), 1),
   (?, ?, ?, ?, ?, ?, ?, 1, NOW(), 1)`,
  ['BPN-2026-001', '小麦田传感器A', 'bearpi_nano', 'v1.2.3', plotBaseId, 34.7568, 113.6523,
   'BPN-2026-002', '小麦田传感器B', 'bearpi_nano', 'v1.2.3', plotBaseId, 34.7571, 113.6528,
   'BPN-2026-003', '玉米地传感器A', 'bearpi_nano', 'v1.2.3', plotBaseId + 1, 34.7580, 113.6535,
   'BPN-2026-004', '大棚传感器A', 'bearpi_nano', 'v1.2.3', plotBaseId + 2, 34.7560, 113.6510,
   'BPN-2026-005', '果园传感器A', 'bearpi_nano', 'v1.2.3', plotBaseId + 3, 34.7590, 113.6500]
)
const devBaseId = devResult.insertId
console.log('Devices: 5 created, base ID:', devBaseId)

// Strategies - insert one by one to capture IDs
const stratResult1 = await query(
  `INSERT INTO irrigation_strategies (strategy_name, plot_id, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled) VALUES
   (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ['小麦常规灌溉', plotBaseId, 20, 45, 15, 35, 1200, 3600, 2.5, 1]
)
const sid1 = stratResult1.insertId
await query(
  `INSERT INTO irrigation_strategies (strategy_name, plot_id, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled) VALUES
   (?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ['小麦干旱应急', plotBaseId, 10, 20, 18, 38, 1800, 1800, 3.0, 1,
   '玉米日常灌溉', plotBaseId + 1, 25, 50, 15, 32, 1500, 2400, 2.0, 1,
   '大棚精细滴灌', plotBaseId + 2, 40, 60, 18, 30, 600, 900, 0.5, 1,
   '果园深灌', plotBaseId + 3, 20, 40, 10, 35, 2400, 7200, 4.0, 1,
   '冬季低流量', plotBaseId, 15, 35, 0, 12, 900, 7200, 1.5, 0]
)
const sid2 = stratResult1.insertId + 1 // second strategy
const sid3 = sid2 + 1
const sid4 = sid2 + 2
const sid5 = sid2 + 3
const sid6 = sid2 + 4
console.log('Strategies: 6 created')

// Sensor data - 20 records across devices
for (let i = 0; i < 5; i++) {
  const devId = devBaseId + i
  const baseMoisture = [35, 38, 40, 45, 28][i]
  const baseTemp = [22, 22, 23, 24, 21][i]
  for (let h = 24; h > 0; h -= 5) {
    const moisture = baseMoisture - (24 - h) * 0.4 + Math.random() * 2
    const soilTemp = baseTemp + (24 - h) * 0.08
    const airTemp = 25 + (24 - h) * 0.2 + Math.random() * 3
    const humidity = 65 - (24 - h) * 0.6 - Math.random() * 5
    const light = 1600 + (h < 6 || h > 20 ? 100 : 800) + Math.random() * 400
    await query(
      `INSERT INTO sensor_data (device_id, soil_moisture, soil_temp, air_temp, air_humidity, light, created_at)
       VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [devId, +moisture.toFixed(1), +soilTemp.toFixed(1), +airTemp.toFixed(1), +humidity.toFixed(1), +light.toFixed(0), h]
    )
  }
}
console.log('Sensor data: 20 records created')

// Irrigation logs
await query(
  `INSERT INTO irrigation_logs (device_id, strategy_id, trigger_type, operator_id, start_time, end_time, duration_sec, water_used_l, status, remark) VALUES
   (?, ?, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 900 SECOND), 900, 37.5, 'completed', ?),
   (?, ?, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 720 SECOND), 720, 30.0, 'completed', ?),
   (?, ?, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 600 SECOND), 600, 20.0, 'completed', ?),
   (?, ?, 'manual', 2, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 12 HOUR), INTERVAL 450 SECOND), 450, 18.8, 'completed', ?),
   (?, ?, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 6 HOUR), NULL, NULL, NULL, 'running', ?)`,
  [devBaseId, sid1, '土壤湿度低于30%, 自动触发',
   devBaseId + 1, sid1, '土壤湿度低于30%, 自动触发',
   devBaseId + 2, sid3, '常规灌溉',
   devBaseId, sid1, '张三手动灌溉',
   devBaseId + 4, sid5, '土壤湿度低于25%, 自动触发深灌']
)
console.log('Irrigation logs: 5 created')

// Alerts
await query(
  `INSERT INTO alerts (device_id, alert_type, alert_level, message, resolved, created_at) VALUES
   (?, 'device_offline', 'warning', ?, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
   (?, 'low_moisture', 'warning', ?, 1, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
   (?, 'irrigation_started', 'info', ?, 0, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
   (?, 'high_temp', 'warning', ?, 1, DATE_SUB(NOW(), INTERVAL 1 DAY))`,
  [devBaseId + 3, '大棚传感器A 离线超过2小时',
   devBaseId, '小麦田传感器A 检测到土壤湿度低于25%',
   devBaseId + 4, '果园传感器A 自动灌溉已启动 (策略: 果园深灌)',
   devBaseId + 2, '玉米地传感器A 检测到空气温度超过32°C']
)
console.log('Alerts: 4 created')

// Scheduled tasks
await query(
  `INSERT INTO scheduled_tasks (device_id, task_name, cron_expr, action, duration_sec, enabled) VALUES
   (?, ?, '0 6 * * *', 'irrigate', 600, TRUE),
   (?, ?, '0 5 * * *', 'irrigate', 900, TRUE),
   (?, ?, '0 7 * * 1,4', 'irrigate', 1800, FALSE)`,
  [devBaseId, '小麦田每日定时灌溉',
   devBaseId + 2, '玉米地清晨灌溉',
   devBaseId + 4, '果园周灌溉']
)
console.log('Scheduled tasks: 3 created')

console.log('\n--- Test data seeded successfully! ---')
process.exit(0)
