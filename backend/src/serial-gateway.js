import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { query } from './db.js'
import { randomUUID } from 'crypto'
// huawei-iot 改为 REST API，不再通过 MQTT 上报属性/状态
import config from './config.js'

const TOPIC_SENSOR_DATA = (sn) => `sensor/${sn}/data`
const TOPIC_HEARTBEAT = (sn) => `sensor/${sn}/heartbeat`
const TOPIC_CMD_PUMP = (sn) => `cmd/${sn}/pump`
const TOPIC_CMD_CONFIG = (sn) => `cmd/${sn}/config`
const TOPIC_EVENT_RESPONSE = (sn) => `event/${sn}/response`
const TOPIC_EVENT_RESPONSE_WILD = 'event/+/response'

const DEFAULT_BAUD = parseInt(process.env.SERIAL_DEFAULT_BAUD) || 115200
const RECONNECT_MAX = parseInt(process.env.SERIAL_RECONNECT_MAX_ATTEMPTS) || 5
const RECONNECT_INITIAL_MS = parseInt(process.env.SERIAL_RECONNECT_INITIAL_DELAY_MS) || 1000
const HEARTBEAT_TIMEOUT_MULT = parseInt(process.env.SERIAL_HEARTBEAT_TIMEOUT_MULTIPLIER) || 3
const COMMAND_TIMEOUT_MS = parseInt(process.env.SERIAL_CMD_TIMEOUT_MS) || 15000

class SerialConnection {
  constructor(comPort, broker, options = {}) {
    this.comPort = comPort
    this.broker = broker
    this.baudRate = options.baudRate || DEFAULT_BAUD
    this.heartbeatInterval = options.heartbeatInterval || 60
    this.port = null
    this.parser = null
    this.deviceSn = null
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.lastDataAt = null
    this.pendingCommands = new Map()
  }

  async open() {
    return new Promise((resolve) => {
      try {
        this.port = new SerialPort({
          path: this.comPort,
          baudRate: this.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          autoOpen: false
        })

        this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }))

        this.parser.on('data', (line) => {
          const trimmed = line.trim()
          if (!trimmed) return
          this.lastDataAt = Date.now()
          // console.log(`[serial] ${this.comPort} rx: ${trimmed.substring(0, 200)}`)
          try {
            const msg = JSON.parse(trimmed)
            this.dispatch(msg)
          } catch {
            // 尝试解析纯文本格式: [Sensor] Temp=26.9C Hum=36.3% Lux=30 Soil=87.4% Motor=OFF
            const textMsg = this.parsePlainText(trimmed)
            if (textMsg) {
              this.dispatch(textMsg)
            }
          }
        })

        this.port.on('error', (err) => {
          console.error(`[serial] ${this.comPort} error:`, err.message)
          this.onDisconnect()
        })

        this.port.on('close', () => {
          console.log(`[serial] ${this.comPort} closed`)
          this.onDisconnect()
        })

        this.port.open((err) => {
          if (err) {
            console.error(`[serial] ${this.comPort} open failed:`, err.message)
            resolve(false)
            return
          }
          console.log(`[serial] ${this.comPort} opened (${this.baudRate} baud)`)
          this.reconnectAttempts = 0
          this.startHeartbeatWatchdog()
          resolve(true)
        })
      } catch (err) {
        console.error(`[serial] ${this.comPort} create failed:`, err.message)
        resolve(false)
      }
    })
  }

  async close() {
    this.stopHeartbeatWatchdog()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.port && this.port.isOpen) {
      return new Promise((resolve) => {
        this.port.close(() => {
          if (this.deviceSn) {
            this.updateDeviceStatus(0)
          }
          resolve()
        })
      })
    }
  }

  async write(data) {
    if (!this.port || !this.port.isOpen) return false
    const payload = typeof data === 'string' ? data : JSON.stringify(data)
    return new Promise((resolve) => {
      this.port.write(payload + '\r\n', async (err) => {
        if (err) {
          console.error(`[serial] ${this.comPort} write error:`, err.message)
          resolve(false)
        } else {
          try {
            await this.port.drain()
            console.log(`[serial] ${this.comPort} tx:`, payload)
            resolve(true)
          } catch (drainErr) {
            console.error(`[serial] ${this.comPort} drain error:`, drainErr.message)
            resolve(false)
          }
        }
      })
    })
  }

  async sendCommand(action, durationSec = null) {
    const cmdId = randomUUID()
    const cmd = { type: 'cmd', cmd_id: cmdId, action }
    if (durationSec) cmd.duration_sec = durationSec

    const ok = await this.write(cmd)
    if (!ok) return { success: false, message: '串口写入失败' }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(cmdId)
        resolve({ success: false, message: '设备应答超时' })
      }, COMMAND_TIMEOUT_MS)

      this.pendingCommands.set(cmdId, { resolve, timeout })
    })
  }

  parsePlainText(line) {
    // 格式: [Sensor] Temp=26.9C Hum=36.3% Lux=30 Soil=87.4% Motor=OFF
    const match = line.match(/\[Sensor\]\s*Temp=([\d.]+)C\s+Hum=([\d.]+)%\s+Lux=([\d.]+)\s+Soil=([\d.]+)%\s+Motor=(\w+)/)
    if (!match) return null

    const sn = this.deviceSn || 'BPN-20240001'
    return {
      type: 'sensor_data',
      sn,
      air_temp: parseFloat(match[1]),
      air_humidity: parseFloat(match[2]),
      light: parseFloat(match[3]),
      soil_moisture: parseFloat(match[4])
    }
  }

  dispatch(msg) {
    switch (msg.type) {
    case 'register':
      this.handleRegister(msg)
      break
    case 'sensor_data':
      this.handleSensorData(msg)
      break
    case 'heartbeat':
      this.handleHeartbeat(msg)
      break
    case 'cmd_ack':
      this.handleCmdAck(msg)
      break
    case 'error':
      console.error(`[serial] device error: sn=${msg.sn} code=${msg.code} message=${msg.message}`)
      break
    }
  }

  async handleRegister(msg) {
    this.deviceSn = msg.sn
    console.log(`[serial] device registered: sn=${msg.sn} com=${this.comPort} fw=${msg.fw_ver}`)

    await query(
      `UPDATE devices SET online_status = 1, last_online_at = NOW(), firmware_ver = ?,
           com_port = ?, connection_type = 'uart'
       WHERE device_sn = ?`,
      [msg.fw_ver || null, this.comPort, msg.sn]
    )

    if (config.huawei.enabled) return

    this.mqttPublish(TOPIC_EVENT_RESPONSE(msg.sn), {
      type: 'register', device_sn: msg.sn, status: 'online', com_port: this.comPort
    })
  }

  async handleSensorData(msg) {
    if (!msg.sn) return
    const sn = msg.sn

    // 华为云模式：数据由板子WiFi直连华为云，经webhook处理，串口仅做调试日志
    if (config.huawei.enabled) {
      console.log(`[serial:debug] sn=${sn} soil=${msg.soil_moisture}% temp=${msg.air_temp}C hum=${msg.air_humidity}% light=${msg.light}`)
      return
    }

    console.log(`[serial] sensor: sn=${sn} soil=${msg.soil_moisture}% temp=${msg.air_temp}C hum=${msg.air_humidity}% light=${msg.light}`)

    // 非华为云模式：走本地MQTT
    const mqttPayload = {
      device_sn: sn,
      soil_moisture: msg.soil_moisture,
      soil_temp: msg.soil_temp,
      air_temp: msg.air_temp,
      air_humidity: msg.air_humidity,
      light: msg.light
    }
    this.mqttPublish(TOPIC_SENSOR_DATA(sn), mqttPayload)
  }

  async handleHeartbeat(msg) {
    if (!msg.sn) return
    await query(
      'UPDATE devices SET online_status = 1, last_online_at = NOW() WHERE device_sn = ?',
      [msg.sn]
    )
    this.mqttPublish(TOPIC_HEARTBEAT(msg.sn), {
      device_sn: msg.sn, uptime: msg.uptime, ts: msg.ts
    })
  }

  handleCmdAck(msg) {
    const pending = this.pendingCommands.get(msg.cmd_id)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingCommands.delete(msg.cmd_id)
      pending.resolve({
        success: msg.result === 'ok',
        message: msg.message || ''
      })
    }
  }

  mqttPublish(topic, payload) {
    if (!this.broker) return
    this.broker.publish({
      topic,
      payload: Buffer.from(JSON.stringify(payload)),
      qos: 1,
      retain: false
    }, () => {})
  }

  onDisconnect() {
    this.stopHeartbeatWatchdog()
    if (this.deviceSn) {
      this.updateDeviceStatus(0)
    }
    this.attemptReconnect()
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= RECONNECT_MAX) {
      console.error(`[serial] ${this.comPort} max reconnect attempts reached`)
      return
    }
    const delay = RECONNECT_INITIAL_MS * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++
    console.log(`[serial] ${this.comPort} reconnect attempt ${this.reconnectAttempts}/${RECONNECT_MAX} in ${delay}ms`)
    this.reconnectTimer = setTimeout(async () => {
      const ok = await this.open()
      if (!ok && this.reconnectAttempts < RECONNECT_MAX) {
        this.attemptReconnect()
      }
    }, delay)
  }

  startHeartbeatWatchdog() {
    this.stopHeartbeatWatchdog()
    this.lastDataAt = Date.now()
    const timeoutMs = this.heartbeatInterval * HEARTBEAT_TIMEOUT_MULT * 1000
    this.heartbeatTimer = setInterval(() => {
      if (!this.lastDataAt) return
      const elapsed = Date.now() - this.lastDataAt
      if (elapsed > timeoutMs) {
        console.error(`[serial] ${this.comPort} heartbeat timeout (${elapsed}ms)`)
        if (this.deviceSn) {
          this.updateDeviceStatus(0)
        }
        this.port?.close()
      }
    }, 10000)
  }

  stopHeartbeatWatchdog() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  async updateDeviceStatus(online) {
    try {
      await query(
        'UPDATE devices SET online_status = ?, last_online_at = IF(? = 1, NOW(), last_online_at) WHERE device_sn = ?',
        [online, online, this.deviceSn]
      )
    } catch (e) {
      // ignore
    }
  }
}

export class SerialManager {
  constructor(broker = null) {
    this.broker = broker
    this.connections = new Map()
  }

  async autoConnect() {
    if (process.env.SERIAL_AUTO_CONNECT !== 'true') return
    try {
      const rows = await query(
        "SELECT device_sn, com_port FROM devices WHERE com_port IS NOT NULL AND connection_type = 'uart' AND status = 1"
      )
      for (const row of rows) {
        await this.openPort(row.com_port)
      }
      console.log(`[serial] auto-connected ${rows.length} device(s)`)
    } catch (e) {
      console.error('[serial] autoConnect error:', e.message)
    }
  }

  async openPort(comPort, options = {}) {
    if (this.connections.has(comPort)) {
      return { success: false, message: `端口 ${comPort} 已连接` }
    }
    const conn = new SerialConnection(comPort, this.broker, options)
    const ok = await conn.open()
    if (!ok) {
      return { success: false, message: `端口 ${comPort} 打开失败` }
    }
    this.connections.set(comPort, conn)
    return { success: true, message: `端口 ${comPort} 已连接` }
  }

  async closePort(comPort) {
    const conn = this.connections.get(comPort)
    if (!conn) return { success: false, message: `端口 ${comPort} 未连接` }
    await conn.close()
    this.connections.delete(comPort)

    if (conn.deviceSn) {
      await query(
        'UPDATE devices SET online_status = 0, com_port = NULL WHERE device_sn = ?',
        [conn.deviceSn]
      )
    }
    return { success: true, message: `端口 ${comPort} 已断开` }
  }

  async sendCommand(comPort, action, durationSec = null) {
    const conn = this.connections.get(comPort)
    if (!conn) return { success: false, message: `端口 ${comPort} 未连接` }
    return conn.sendCommand(action, durationSec)
  }

  async sendCommandBySn(deviceSn, action, durationSec = null) {
    for (const [, conn] of this.connections) {
      if (conn.deviceSn === deviceSn) {
        return conn.sendCommand(action, durationSec)
      }
    }
    return { success: false, message: `设备 ${deviceSn} 未找到串口连接` }
  }

  getConnection(comPort) {
    return this.connections.get(comPort) || null
  }

  findConnectionBySn(deviceSn) {
    for (const [comPort, conn] of this.connections) {
      if (conn.deviceSn === deviceSn) return { comPort, conn }
    }
    return null
  }
}
