import { defineStore } from 'pinia'
import { ref } from 'vue'
import mqtt from 'mqtt'

export const useMqttStore = defineStore('mqtt', () => {
  const client = ref(null)
  const latestData = ref({})

  function connect() {
    const broker = import.meta.env.VITE_MQTT_BROKER || 'ws://localhost:8083/mqtt'
    client.value = mqtt.connect(broker)

    client.value.on('connect', () => {
      console.log('MQTT connected')
      client.value.subscribe('sensor/+/data')
    })

    client.value.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString())
        const deviceSn = topic.split('/')[1]
        latestData.value[deviceSn] = { ...data, timestamp: Date.now() }
      } catch (e) {
        console.error('MQTT parse error:', e)
      }
    })
  }

  function disconnect() {
    if (client.value) {
      client.value.end()
      client.value = null
    }
  }

  return { client, latestData, connect, disconnect }
})
