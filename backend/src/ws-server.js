import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import EventEmitter from 'events'
import config from './config.js'

let io = null

// 用于跨模块触发灌溉指令（替代原 Aedes broker.on('autoIrrigate')）
export const irrigationEmitter = new EventEmitter()

/**
 * 将 Socket.io 挂载到 HTTP Server 上
 * @param {http.Server} httpServer
 * @returns {Server}
 */
export function createWsServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.server.env === 'production'
        ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
        : '*',
      methods: ['GET', 'POST']
    },
    path: '/ws',
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000
  })

  // ── WebSocket 认证中间件 ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) {
      return next(new Error('未提供认证 Token'))
    }
    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      socket.userId = decoded.user_id
      socket.username = decoded.username
      socket.role = decoded.role
      next()
    } catch {
      next(new Error('Token 无效或已过期'))
    }
  })

  io.on('connection', (socket) => {
    console.log('[ws] client connected:', socket.id, 'user:', socket.username)

    // 客户端可订阅特定设备的房间
    socket.on('subscribe:device', (deviceSn) => {
      if (deviceSn) {
        socket.join(`device:${deviceSn}`)
        console.log(`[ws] ${socket.id} joined device:${deviceSn}`)
      }
    })

    socket.on('unsubscribe:device', (deviceSn) => {
      if (deviceSn) {
        socket.leave(`device:${deviceSn}`)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`[ws] client disconnected: ${socket.id} reason=${reason}`)
    })
  })

  console.log('[ws] Socket.io server ready on path /ws')
  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized — call createWsServer first')
  return io
}

/**
 * 向所有客户端广播传感器实时数据
 */
export function broadcastSensorData(deviceSn, payload) {
  if (!io) return
  console.log('[ws] broadcastSensorData:', deviceSn, JSON.stringify(payload).substring(0, 100))
  // 全局广播
  io.emit('sensor:data', {
    device_sn: deviceSn,
    ...payload,
    timestamp: new Date().toISOString()
  })
  // 同时向该设备专属房间发送
  io.to(`device:${deviceSn}`).emit('sensor:data', {
    device_sn: deviceSn,
    ...payload,
    timestamp: new Date().toISOString()
  })
}

/**
 * 向所有客户端广播传感器故障
 */
export function broadcastSensorFault(deviceSn, deviceName, faults) {
  if (!io) return
  const msg = {
    device_sn: deviceSn,
    device_name: deviceName,
    faults,
    timestamp: new Date().toISOString()
  }
  io.emit('sensor:fault', msg)
  io.to(`device:${deviceSn}`).emit('sensor:fault', msg)
}

/**
 * 向所有客户端广播新告警
 */
export function broadcastAlert(alert) {
  if (!io) return
  io.emit('alert:new', {
    ...alert,
    timestamp: new Date().toISOString()
  })
}

/**
 * 向所有客户端广播灌溉状态变化
 */
export function broadcastIrrigation(deviceSn, status, detail = {}) {
  if (!io) return
  const msg = {
    device_sn: deviceSn,
    status, // 'started' | 'stopped'
    ...detail,
    timestamp: new Date().toISOString()
  }
  io.emit('irrigation:status', msg)
  io.to(`device:${deviceSn}`).emit('irrigation:status', msg)
}
