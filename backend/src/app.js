import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs'
import cors from 'cors'
import morgan from 'morgan'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import config from './config.js'
import { initTables, query } from './db.js'
import { error } from './utils/response.js'
import routes from './routes/index.js'
import { createWsServer, irrigationEmitter, broadcastIrrigation, broadcastSensorData, broadcastSensorFault, broadcastAlert } from './ws-server.js'
import { SerialManager } from './serial-gateway.js'
import { setBrokerRef } from './routes/huawei-callback.js'
import { initScheduler } from './scheduler.js'

let serialManager = null

async function seedAdmin() {
  const rows = await query('SELECT count(*) as cnt FROM users WHERE username = ?', ['admin'])
  if (rows[0].cnt > 0) return

  const hash = await bcrypt.hash('admin123', 10)
  await query(
    'INSERT INTO users (username, password, real_name, role) VALUES (?, ?, ?, ?)',
    ['admin', hash, '系统管理员', 'admin']
  )
  console.log('[seed] 默认管理员已创建 (admin / admin123)')
}

async function start() {
  // ── 安全启动检查 ──
  if (config.jwt.secret === 'dev-secret' || config.jwt.secret === 'change-me-to-a-secure-random-string') {
    if (config.server.env === 'production') {
      console.error('[security] ❌ JWT_SECRET 未设置或使用默认值，生产环境拒绝启动')
      process.exit(1)
    } else {
      console.warn('[security] ⚠ JWT_SECRET 使用默认值，生产环境请设置强密钥')
    }
  }

  await initTables()
  console.log('[db] 数据库表初始化完成')

  await seedAdmin()

  const app = express()

  // ── 安全响应头 ──
  app.use(helmet({
    contentSecurityPolicy: false,  // 前端 SPA 需要 inline script
    crossOriginEmbedderPolicy: false
  }))

  // ── CORS ──
  const corsOrigins = config.server.env === 'production'
    ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
    : '*'
  app.use(cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
  }))

  app.use(express.json({ limit: '1mb' }))
  if (config.server.env === 'development') {
    app.use(morgan('dev'))
  }

  // ── API 限流 ──
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: -1, message: '请求过于频繁，请稍后再试' }
  })
  // Webhook 独立限流（更宽松，允许设备高频上报）
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: -1, message: 'Webhook 请求过于频繁' }
  })

  // ── 健康检查端点（无限流）──
  app.get('/health', async (req, res) => {
    const checks = { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }
    try {
      await query('SELECT 1')
      checks.mysql = 'ok'
    } catch {
      checks.mysql = 'error'
      checks.status = 'degraded'
    }
    const statusCode = checks.status === 'ok' ? 200 : 503
    res.status(statusCode).json(checks)
  })

  // ── Webhook 路由（独立限流，不走 API 限流）──
  app.use('/api/v1/huawei', webhookLimiter)

  // ── API 路由（通用限流）──
  app.use('/api/v1', apiLimiter, routes)

  app.use((req, res) => {
    res.status(404).json(error('接口不存在'))
  })

  app.use((err, req, res, _next) => {
    console.error(err)
    res.status(500).json(error('服务器内部错误'))
  })

  // ── HTTP/HTTPS Server + Socket.io ──
  let httpServer

  if (config.server.https.enabled && config.server.https.cert && config.server.https.key) {
    try {
      const sslOptions = {
        cert: fs.readFileSync(config.server.https.cert),
        key: fs.readFileSync(config.server.https.key)
      }
      httpServer = https.createServer(sslOptions, app)
      httpServer.listen(config.server.https.port, () => {
        console.log(`[server] HTTPS 服务启动: https://localhost:${config.server.https.port}`)
        console.log(`[server] 环境: ${config.server.env}`)
        console.log(`[ws] WSS 就绪: wss://localhost:${config.server.https.port}/ws`)
      })
      // 同时保留 HTTP 用于健康检查和重定向
      const redirectApp = express()
      redirectApp.use((req, res) => {
        res.redirect(301, `https://${req.headers.host?.replace(/:\d+$/, '')}:${config.server.https.port}${req.url}`)
      })
      redirectApp.listen(config.server.port, () => {
        console.log(`[server] HTTP 重定向: http://localhost:${config.server.port} → https://localhost:${config.server.https.port}`)
      })
    } catch (e) {
      console.error('[server] HTTPS 证书加载失败:', e.message)
      console.log('[server] 降级为 HTTP 模式')
      httpServer = http.createServer(app)
      httpServer.listen(config.server.port, () => {
        console.log(`[server] HTTP 服务启动: http://localhost:${config.server.port}`)
      })
    }
  } else {
    httpServer = http.createServer(app)
    httpServer.listen(config.server.port, () => {
      console.log(`[server] 服务启动: http://localhost:${config.server.port}`)
      console.log(`[server] 环境: ${config.server.env}`)
      if (config.server.env === 'production') {
        console.warn('[security] ⚠ 生产环境建议启用 HTTPS (设置 HTTPS_ENABLED=true)')
      }
    })
  }

  createWsServer(httpServer)

  // ── 串口网关 ──
  serialManager = new SerialManager()
  if (config.serial.autoConnect) {
    await serialManager.autoConnect()
  }
  app.set('serialManager', serialManager)
  globalThis.__serialManager = serialManager

  // ── 定时灌溉调度器 ──
  await initScheduler()

  // ── 自动灌溉指令处理 ──
  irrigationEmitter.on('autoIrrigate', async ({ deviceSn, durationSec }) => {
    const result = await serialManager.sendCommandBySn(deviceSn, 'pump_on', durationSec)
    console.log(`[serial] auto-irrigate: sn=${deviceSn} result=${result.success}`)
    if (result.success) {
      broadcastIrrigation(deviceSn, 'started', { duration_sec: durationSec, trigger: 'auto' })
    }
  })

  // ── 华为云回调适配器 ──
  setBrokerRef({
    emit: (event, data) => {
      if (event === 'autoIrrigate') {
        irrigationEmitter.emit('autoIrrigate', data)
      } else if (event === 'alert:intrusion') {
        broadcastAlert({
          type: 'intrusion',
          level: 'danger',
          ...data,
          message: `安防入侵报警: ${data.device_name || data.device_sn} 检测到人体闯入`
        })
        broadcastIrrigation(data.device_sn, 'intrusion_alarm', { reason: 'intrusion' })
      } else if (event === 'alert:intrusion_cleared') {
        broadcastAlert({
          type: 'intrusion_cleared',
          level: 'info',
          ...data,
          message: `安防入侵解除: ${data.device_name || data.device_sn}`
        })
      }
    },
    publish: (packet, cb) => {
      try {
        const payload = JSON.parse(packet.payload.toString())
        if (packet.topic.includes('/fault')) {
          broadcastSensorFault(payload.device_sn || '', payload.device_name || '', payload.faults || [])
        } else {
          broadcastSensorData(payload.device_sn, payload)
        }
      } catch { /* ignore parse errors */ }
      if (cb) cb()
    }
  })

  console.log('[app] data flow: Device → WiFi/MQTT → Huawei IoT → HTTP Webhook → DB + InfluxDB + Socket.io → Frontend')
}

start().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
})
