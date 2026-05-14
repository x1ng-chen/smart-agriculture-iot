import { Aedes } from 'aedes'
import http from 'http'
import { WebSocketServer } from 'ws'
import { Duplex } from 'stream'
import { query } from './db.js'

const TOPIC_SENSOR = 'sensor/+/data'

export async function createMqttBroker() {
  const broker = await Aedes.createBroker()

  broker.on('client', (client) => {
    console.log(`[mqtt] client connected: ${client.id}`)
  })

  broker.on('clientDisconnect', (client) => {
    console.log(`[mqtt] client disconnected: ${client.id}`)
  })

  broker.on('publish', async (packet, client) => {
    if (!client) return
    const topic = packet.topic
    const match = topic.match(/^sensor\/(\w+)\/data$/)
    if (!match) return

    const deviceSn = match[1]
    try {
      const payload = JSON.parse(packet.payload.toString())
      const devices = await query('SELECT id, plot_id FROM devices WHERE device_sn = ? AND status = 1', [deviceSn])
      if (devices.length === 0) return

      const deviceId = devices[0].id
      const plotId = devices[0].plot_id

      await query(
        `INSERT INTO sensor_data (device_id, soil_moisture, soil_temp, air_temp, air_humidity, light)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [deviceId, payload.soil_moisture, payload.soil_temp, payload.air_temp, payload.air_humidity, payload.light]
      )

      await query(
        'UPDATE devices SET online_status = 1, last_online_at = NOW() WHERE id = ?',
        [deviceId]
      )

      if (plotId) {
        await checkStrategies(deviceId, plotId, payload)
      }
    } catch (e) {
      console.error('[mqtt] sensor data error:', e.message)
    }
  })

  const httpServer = http.createServer()
  const wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws) => {
    const stream = new Duplex({
      write(chunk, encoding, callback) {
        ws.send(chunk, callback)
      },
      read() {}
    })
    ws.on('message', (data) => {
      stream.push(data)
    })
    ws.on('close', () => {
      stream.push(null)
    })
    ws.on('error', (err) => {
      stream.destroy(err)
    })
    broker.handle(stream)
  })

  httpServer.listen(8083, () => {
    console.log('[mqtt] broker started on ws://localhost:8083')
  })

  return broker
}

async function checkStrategies(deviceId, plotId, payload) {
  const strategies = await query(
    `SELECT * FROM irrigation_strategies
     WHERE plot_id = ? AND enabled = 1
       AND humidity_min <= ? AND humidity_max >= ?`,
    [plotId, payload.soil_moisture, payload.soil_moisture]
  )

  for (const s of strategies) {
    const existing = await query(
      `SELECT id FROM irrigation_logs
       WHERE device_id = ? AND strategy_id = ? AND status = 'running'
       LIMIT 1`,
      [deviceId, s.id]
    )
    if (existing.length > 0) continue

    const cooldownOk = await query(
      `SELECT id FROM irrigation_logs
       WHERE device_id = ? AND strategy_id = ?
         AND start_time > DATE_SUB(NOW(), INTERVAL ? SECOND)
       LIMIT 1`,
      [deviceId, s.id, s.cooldown_interval]
    )
    if (cooldownOk.length > 0) continue

    await query(
      `INSERT INTO irrigation_logs (device_id, strategy_id, trigger_type, start_time, status)
       VALUES (?, ?, 'auto', NOW(), 'running')`,
      [deviceId, s.id]
    )

    await query(
      `INSERT INTO alerts (device_id, alert_type, alert_level, message)
       VALUES (?, 'irrigation_started', 'info', ?)`,
      [deviceId, `自动灌溉已启动 (策略: ${s.strategy_name})`]
    )

    console.log(`[mqtt] auto irrigation triggered: device=${deviceId} strategy=${s.strategy_name}`)
  }
}
