import { defineStore } from 'pinia'
import { ref } from 'vue'
import mqtt from 'mqtt'

export const useMqttStore = defineStore('mqtt', () => {
  const client = ref(null)
  const connected = ref(false)
  const latestData = ref({})
  let reconnectTimer = null
  let intentionalDisconnect = false

  function connect() {
    if (client.value && client.value.connected) return

    intentionalDisconnect = false
    const broker = import.meta.env.VITE_MQTT_BROKER || 'ws://localhost:8083/mqtt'
    console.log('[MQTT] connecting to', broker)
    client.value = mqtt.connect(broker, { reconnectPeriod: 0 })

    client.value.on('connect', () => {
      console.log('[MQTT] connected')
      connected.value = true
      client.value.subscribe('sensor/+/data')
    })

    client.value.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString())
        const deviceSn = topic.split('/')[1]
        latestData.value[deviceSn] = { ...data, timestamp: Date.now() }
      } catch (e) {
        console.error('[MQTT] parse error:', e)
      }
    })

    client.value.on('error', (err) => {
      console.error('[MQTT] connection error:', err)
      connected.value = false
    })

    client.value.on('close', () => {
      console.log('[MQTT] disconnected')
      connected.value = false
      if (!intentionalDisconnect) {
        clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
          console.log('[MQTT] reconnecting...')
          connect()
        }, 3000)
      }
    })
  }

  function disconnect() {
    intentionalDisconnect = true
    clearTimeout(reconnectTimer)
    if (client.value) {
      client.value.end()
      client.value = null
    }
    connected.value = false
  }

  return { client, connected, latestData, connect, disconnect }
})
