import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'

export const useMqttStore = defineStore('mqtt', () => {
  const socket = ref(null)
  const connected = ref(false)
  const latestData = ref({})
  const faults = ref({})       // 故障数据: { deviceSn: { faults, timestamp } }
  const irrigationStatus = ref({})
  const alerts = ref([])       // 实时告警列表 (最多保留 50 条)
  let reconnectTimer = null
  let intentionalDisconnect = false

  function connect() {
    if (socket.value?.connected) return

    intentionalDisconnect = false
    const wsUrl = import.meta.env.VITE_WS_URL || ''
    console.log('[WS] connecting to', wsUrl || 'same origin')

    // 从 localStorage 获取 JWT token 用于 WebSocket 认证
    const token = localStorage.getItem('token') || ''

    const s = io(wsUrl || undefined, {
      path: '/ws',
      transports: ['websocket'],
      reconnection: false,  // 我们自己管理重连
      auth: { token }
    })
    socket.value = s

    s.on('connect', () => {
      console.log('[WS] connected:', s.id)
      connected.value = true
    })

    s.on('sensor:data', (data) => {
      if (data.device_sn) {
        latestData.value[data.device_sn] = {
          soil_moisture: data.soil_moisture,
          soil_temp: data.soil_temp,
          air_temp: data.air_temp,
          air_humidity: data.air_humidity,
          light: data.light,
          ts: Date.now(),
          timestamp: Date.now()
        }
      }
    })

    s.on('sensor:fault', (data) => {
      if (data.device_sn) {
        faults.value[data.device_sn] = {
          faults: data.faults,
          device_name: data.device_name,
          timestamp: Date.now()
        }
      }
    })

    s.on('irrigation:status', (data) => {
      if (data.device_sn) {
        irrigationStatus.value[data.device_sn] = {
          status: data.status,
          duration_sec: data.duration_sec,
          trigger: data.trigger,
          timestamp: Date.now()
        }
      }
    })

    s.on('alert:new', (alert) => {
      // 存储到告警列表
      const alertWithTs = { ...alert, timestamp: Date.now(), id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
      alerts.value.unshift(alertWithTs)
      // 最多保留 50 条
      if (alerts.value.length > 50) alerts.value.length = 50
      // 同时透传到 irrigationStatus 兼容旧逻辑
      irrigationStatus.value['__alert__'] = alertWithTs
    })

    s.on('disconnect', (reason) => {
      console.log('[WS] disconnected:', reason)
      connected.value = false
      if (!intentionalDisconnect) {
        clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
          console.log('[WS] reconnecting...')
          connect()
        }, 3000)
      }
    })

    s.on('connect_error', (err) => {
      console.error('[WS] connect error:', err.message)
      connected.value = false
      // Token 过期或无效，清除登录状态
      if (err.message.includes('Token') || err.message.includes('认证')) {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        window.location.href = '/login'
      }
    })
  }

  function disconnect() {
    intentionalDisconnect = true
    clearTimeout(reconnectTimer)
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    connected.value = false
  }

  return {
    socket,
    connected,
    latestData,
    faults,
    irrigationStatus,
    alerts,
    connect,
    disconnect
  }
})
