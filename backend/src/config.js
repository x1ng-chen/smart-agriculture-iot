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
  }
}
