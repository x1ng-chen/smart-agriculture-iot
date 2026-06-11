import Redis from 'ioredis'
import config from './config.js'

let client = null

export function getRedis() {
  if (!client) {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy() { return null },
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false
    }
    if (config.redis.tls) {
      redisConfig.tls = config.redis.tls
    }
    client = new Redis(redisConfig)

    client.on('error', () => {}) // 静默吞掉错误
  }
  return client
}

// 幂等去重：返回 true 表示首次（放行），false 表示重复（拦截）
export async function checkDedup(key, ttlSec = 300) {
  try {
    const redis = getRedis()
    // SET key value NX EX ttl → 首次返回 "OK"，重复返回 null
    const result = await redis.set(`webhook:dedup:${key}`, Date.now(), 'NX', 'EX', ttlSec)
    return result === 'OK'
  } catch (e) {
    console.error('[dedup] redis error:', e.message)
    // Redis 故障时降级放行
    return true
  }
}

// 检查 AI 决策冷却是否过期
export async function checkAiCooldown(deviceId, cooldownSec) {
  try {
    const redis = getRedis()
    const key = `ai:decision:cooldown:${deviceId}`
    const result = await redis.set(key, Date.now(), 'NX', 'EX', cooldownSec)
    return result === 'OK' // true = 冷却外（可以执行）
  } catch {
    return true // Redis 故障降级放行
  }
}

export default { getRedis, checkDedup, checkAiCooldown }
