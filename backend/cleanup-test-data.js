import { query } from './src/db.js'

console.log('=== 开始清理测试数据 ===\n')

// 1. 删除测试用户 (保留 admin)
console.log('[1/8] 删除测试用户...')
const r1 = await query("DELETE FROM users WHERE username != 'admin'")
console.log('  删除', r1.affectedRows, '个测试用户')

// 2. 删除测试地块 (通过 crop_type 英文标识匹配)
console.log('[2/8] 删除测试地块...')
const r2 = await query("DELETE FROM plots WHERE crop_type IN ('wheat','corn','vegetable','fruit')")
console.log('  删除', r2.affectedRows, '个测试地块 (CASCADE 处理关联策略)')

// 3. 删除测试设备
console.log('[3/8] 删除测试设备...')
const r3 = await query(
  "DELETE FROM devices WHERE device_type = 'bearpi_nano' OR device_sn LIKE 'BPN-%'"
)
console.log('  删除', r3.affectedRows, '个测试设备')

// 4. 清理残留灌溉策略
console.log('[4/8] 清理残留灌溉策略...')
const r4 = await query('DELETE FROM irrigation_strategies WHERE 1=1')
console.log('  删除', r4.affectedRows, '条残留策略')

// 5-8. 清理残留关联数据
for (const [label, table] of [
  ['灌溉日志', 'irrigation_logs'],
  ['告警', 'alerts'],
  ['传感器数据', 'sensor_data'],
  ['定时任务', 'scheduled_tasks'],
]) {
  const r = await query(`DELETE FROM ${table} WHERE 1=1`)
  console.log('  删除', r.affectedRows, '条', label)
}

// 最终确认
console.log('\n=== 最终数据库状态 ===')
const counts = await query(`
  SELECT 'users' tbl, COUNT(*) cnt FROM users UNION ALL
  SELECT 'plots', COUNT(*) FROM plots UNION ALL
  SELECT 'devices', COUNT(*) FROM devices UNION ALL
  SELECT 'strategies', COUNT(*) FROM irrigation_strategies UNION ALL
  SELECT 'irrigation_logs', COUNT(*) FROM irrigation_logs UNION ALL
  SELECT 'alerts', COUNT(*) FROM alerts UNION ALL
  SELECT 'sensor_data', COUNT(*) FROM sensor_data UNION ALL
  SELECT 'scheduled_tasks', COUNT(*) FROM scheduled_tasks
`)
for (const row of counts) {
  console.log('  ' + row.tbl + ': ' + row.cnt)
}

console.log('\n=== 清理完成 ===')
console.log('已保留: admin 用户')
console.log('已清空: 所有测试地块/设备/策略/日志/告警/传感器数据/定时任务')
process.exit(0)
