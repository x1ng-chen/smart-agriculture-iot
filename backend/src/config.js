import 'dotenv/config'

export default {
  server: {
    port: parseInt(process.env.SERVER_PORT) || 8080,
    env: process.env.NODE_ENV || 'development',
    https: {
      enabled: process.env.HTTPS_ENABLED === 'true',
      cert: process.env.HTTPS_CERT_PATH || '',   // /path/to/fullchain.pem
      key: process.env.HTTPS_KEY_PATH || '',     // /path/to/privkey.pem
      port: parseInt(process.env.HTTPS_PORT) || 8443
    }
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_agriculture',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
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
    service: process.env.HUAWEI_IOT_SERVICE || 'iotda',
    iam: {
      username: process.env.HUAWEI_IAM_USERNAME || '',
      password: process.env.HUAWEI_IAM_PASSWORD || '',
      domainId: process.env.HUAWEI_IAM_DOMAIN_ID || ''
    }
  },
  influxdb: {
    url: process.env.INFLUXDB_URL || 'http://127.0.0.1:8086',
    token: process.env.INFLUXDB_TOKEN || '',
    org: process.env.INFLUXDB_ORG || 'smart-agriculture',
    bucket: process.env.INFLUXDB_BUCKET || 'sensor_data',
    rejectUnauthorized: process.env.INFLUXDB_SSL_REJECT !== 'false'
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  },
  webhook: {
    // 验签方式: "signature" (华为 HMAC-SHA256) | "token" (简单 Token) | "none" (关闭)
    authMode: process.env.WEBHOOK_AUTH_MODE || 'token',
    signatureToken: process.env.WEBHOOK_SIGNATURE_TOKEN || '',
    fixedToken: process.env.WEBHOOK_FIXED_TOKEN || 'smart-ag-webhook-secret',
    // 幂等去重 TTL (秒)
    dedupTtl: parseInt(process.env.WEBHOOK_DEDUP_TTL) || 300
  },
  sensor: {
    // 传感器故障码（拦截不写入 InfluxDB）
    faultCodes: (process.env.SENSOR_FAULT_CODES || '999,998').split(',').map(Number),
    // 物理量合理范围
    bounds: {
      soil_moisture: [0, 100],
      soil_temp: [-20, 80],
      air_temp: [-30, 70],
      air_humidity: [0, 100],
      light: [0, 200000]
    }
  },
  ai: {
    // AI 决策最小间隔（秒），避免每次 sensor 上报都调 LLM
    decisionCooldown: parseInt(process.env.AI_DECISION_COOLDOWN) || 300
  },
  mimo: {
    apiKey: process.env.MIMO_API_KEY || '',
    baseURL: process.env.MIMO_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
    chatModel: process.env.MIMO_CHAT_MODEL || 'mimo-v2-flash',
    decisionModel: process.env.MIMO_DECISION_MODEL || 'mimo-v2-pro'
  }
}
