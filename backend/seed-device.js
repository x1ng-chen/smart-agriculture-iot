import { query } from './src/db.js'

const sn = process.argv[2] || 'BPN-20240001'

const existing = await query('SELECT id FROM devices WHERE device_sn = ?', [sn])
if (existing.length > 0) {
  console.log(`设备已存在: id=${existing[0].id}, sn=${sn}`)
  process.exit(0)
}

const result = await query(
  `INSERT INTO devices (device_sn, device_name, device_type, connection_type)
   VALUES (?, ?, 'bearpi_nano', 'uart')`,
  [sn, 'BearPi灌溉控制器']
)
console.log(`设备已创建: id=${result.insertId}, sn=${sn}`)
process.exit(0)
