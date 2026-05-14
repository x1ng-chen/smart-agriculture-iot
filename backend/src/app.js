import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import bcrypt from 'bcryptjs'
import config from './config.js'
import { initTables, query } from './db.js'
import { error } from './utils/response.js'
import routes from './routes/index.js'
import { createMqttBroker } from './mqtt-broker.js'

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
  // 初始化数据库表
  await initTables()
  console.log('[db] 数据库表初始化完成')

  // 创建默认管理员
  await seedAdmin()

  const app = express()

  // 中间件
  app.use(cors())
  app.use(express.json())
  if (config.server.env === 'development') {
    app.use(morgan('dev'))
  }

  // 路由
  app.use('/api/v1', routes)

  // 404
  app.use((req, res) => {
    res.status(404).json(error('接口不存在'))
  })

  // 全局错误处理
  app.use((err, req, res, _next) => {
    console.error(err)
    res.status(500).json(error('服务器内部错误'))
  })

  app.listen(config.server.port, () => {
    console.log(`[server] 服务启动: http://localhost:${config.server.port}`)
    console.log(`[server] 环境: ${config.server.env}`)
  })

  // 启动 MQTT Broker (WebSocket)
  await createMqttBroker()
}

start().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
})
