import 'dotenv/config'

export default {
  server: {
    port: parseInt(process.env.SERVER_PORT) || 8080,
    env: process.env.NODE_ENV || 'development'
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_agriculture'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expireHours: parseInt(process.env.JWT_EXPIRE_HOURS) || 24
  },
  serial: {
    autoConnect: process.env.SERIAL_AUTO_CONNECT !== 'false',
    defaultBaud: parseInt(process.env.SERIAL_DEFAULT_BAUD) || 115200,
    reconnectMaxAttempts: parseInt(process.env.SERIAL_RECONNECT_MAX_ATTEMPTS) || 5,
    reconnectInitialDelayMs: parseInt(process.env.SERIAL_RECONNECT_INITIAL_DELAY_MS) || 1000
  },
  wechat: {
    appId: process.env.WECHAT_APPID || '',
    appSecret: process.env.WECHAT_APPSECRET || ''
  },
  huawei: {
    enabled: process.env.HUAWEI_IOT_ENABLED === 'true',
    endpoint: process.env.HUAWEI_IOT_ENDPOINT || '',
    projectId: process.env.HUAWEI_IOT_PROJECT_ID || '',
    deviceId: process.env.HUAWEI_IOT_DEVICE_ID || '',
    ak: process.env.HUAWEI_IOT_AK || '',
    sk: process.env.HUAWEI_IOT_SK || '',
    productId: process.env.HUAWEI_IOT_PRODUCT_ID || '',
    region: process.env.HUAWEI_IOT_REGION || 'cn-north-4',
    service: process.env.HUAWEI_IOT_SERVICE || 'iotda'
  }
}
