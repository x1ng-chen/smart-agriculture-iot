import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import bcrypt from 'bcryptjs'
import config from './config.js'
import { initTables, query } from './db.js'
import { error } from './utils/response.js'
import routes from './routes/index.js'
import { createMqttBroker } from './mqtt-broker.js'
import { SerialManager } from './serial-gateway.js'
import { setBrokerRef } from './routes/huawei-callback.js'

let serialManager = null

async function seedAdmin() {
  const rows = await query('SELECT count(*) as cnt FROM users WHERE username = ?', ['admin'])
  if (rows[0].cnt > 0) return

  const hash = await bcrypt.hash('admin123', 10)
  await query(
    'INSERT INTO users (username, password, real_name, role) VALUES (?, ?, ?, ?)',
    ['admin', hash, 'ϵͳ����Ա', 'admin']
  )
  console.log('[seed] Ĭ�Ϲ���Ա�Ѵ��� (admin / admin123)')
}

async function start() {
  await initTables()
  console.log('[db] ���ݿ����ʼ�����')

  await seedAdmin()

  const app = express()

  app.use(cors())
  app.use(express.json())
  if (config.server.env === 'development') {
    app.use(morgan('dev'))
  }

  app.use('/api/v1', routes)

  app.use((req, res) => {
    res.status(404).json(error('�ӿڲ�����'))
  })

  app.use((err, req, res, _next) => {
    console.error(err)
    res.status(500).json(error('�������ڲ�����'))
  })

  app.listen(config.server.port, () => {
    console.log(`[server] ��������: http://localhost:${config.server.port}`)
    console.log(`[server] ����: ${config.server.env}`)
  })

  // �����ڲ� MQTT Broker (WebSocket ��ǰ�˶��� + ��������)
  const broker = await createMqttBroker()

  // �������أ���ѡ��
  serialManager = new SerialManager(broker)
  if (config.serial.autoConnect) {
    await serialManager.autoConnect()
  }
  app.set('serialManager', serialManager)

  // ���� �� �Զ���Ȼص�
  broker.on('autoIrrigate', async ({ deviceSn, durationSec }) => {
    const result = await serialManager.sendCommandBySn(deviceSn, 'pump_on', durationSec)
    console.log(`[serial] auto-irrigate: sn=${deviceSn} result=${result.success}`)
  })

  // 华为云 HTTP Webhook → 内部 MQTT
  setBrokerRef(broker)
  console.log('[app] cmd flow: Frontend -> Backend -> Huawei REST API -> Device')

  console.log('[app] data flow: Device -> WiFi/MQTT -> Huawei IoT -> HTTP Webhook -> Backend -> DB + Internal MQTT -> Frontend')
}

start().catch(err => {
  console.error('����ʧ��:', err)
  process.exit(1)
})
