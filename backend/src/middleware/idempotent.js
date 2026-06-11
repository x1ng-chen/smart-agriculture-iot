import crypto from 'crypto'
import { checkDedup } from '../redis.js'
import config from '../config.js'

/**
 * Webhook 幂等去重中间件
 *
 * 去重键生成策略：
 *   1. 优先使用华为云 request_id（notify_data.header.request_id）
 *   2. 降级为 payload 内容的哈希 + 设备 SN + 10 秒时间窗口
 *
 * 首次请求放行并写入 Redis，TTL 内重复请求返回 200（静默吞掉）
 * Redis 不可用时降级放行，不阻塞业务
 */

export async function webhookIdempotent(req, res, next) {
  const dedupKey = await buildDedupKey(req)
  const ttl = config.webhook.dedupTtl

  const isFirst = await checkDedup(dedupKey, ttl)

  if (!isFirst) {
    console.log('[idempotent] duplicate webhook ignored, key:', dedupKey.substring(0, 60))
    // 返回 200 而非 4xx，避免华为云认为回调失败而重试
    return res.status(200).json({ code: 0, message: 'ok (duplicate)' })
  }

  // 将 dedupKey 挂在 req 上，下游可用
  req._dedupKey = dedupKey
  next()
}

async function buildDedupKey(req) {
  // 策略 1: 华为云 request_id
  const huaweiReqId =
    req.headers['x-huawei-request-id'] ||
    req.body?.notify_data?.header?.request_id ||
    req.body?.request_id

  if (huaweiReqId) {
    return `hw:${huaweiReqId}`
  }

  // 策略 2: 内容哈希 + 10 秒时间窗口
  const deviceId = req.body?.notify_data?.header?.device_id || req.body?.device_id || 'unknown'
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex').substring(0, 16)
  const timeWindow = Math.floor(Date.now() / 10000) // 10秒窗口

  return `body:${deviceId}:${timeWindow}:${bodyHash}`
}
