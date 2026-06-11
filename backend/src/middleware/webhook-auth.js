import crypto from 'crypto'
import config from '../config.js'

/**
 * 华为云 IoTDA Webhook 签名验证中间件
 *
 * 支持三种模式（通过 WEBHOOK_AUTH_MODE 配置）：
 * - "signature": 华为云 HMAC-SHA256 签名验证（生产推荐）
 * - "token":    简单固定 Token 校验（开发/测试用）
 * - "none":     关闭验证（仅内网调试时使用）
 *
 * 华为云签名算法：
 *   1. 将 body 按 JSON 字典序排序后取 MD5 → bodyMd5
 *   2. 拼接 stringToSign = timestamp + bodyMd5
 *   3. 用预共享 token 做 HMAC-SHA256 → signature
 *   4. 对比请求头 X-Huawei-Signature
 */

export function webhookAuth(req, res, next) {
  const mode = config.webhook.authMode

  if (mode === 'none') {
    return next()
  }

  if (mode === 'token') {
    return verifyToken(req, res, next)
  }

  if (mode === 'signature') {
    return verifyHuaweiSignature(req, res, next)
  }

  console.error('[webhook-auth] unknown auth mode:', mode)
  return res.status(403).json({ code: 403, message: 'unknown auth mode' })
}

// ── 简单 Token 校验 ──────────────────────────────

function verifyToken(req, res, next) {
  const expectedToken = config.webhook.fixedToken
  if (!expectedToken) {
    return res.status(500).json({ code: 500, message: 'webhook token not configured' })
  }

  // 支持三种传递方式：Header > Query > Body
  const token =
    req.headers['x-webhook-token'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.query.token ||
    (req.body && req.body._token)

  if (!token || token !== expectedToken) {
    console.warn('[webhook-auth] token mismatch from', req.ip)
    return res.status(403).json({ code: 403, message: 'invalid token' })
  }

  next()
}

// ── 华为云 HMAC-SHA256 签名验证 ─────────────────

function verifyHuaweiSignature(req, res, next) {
  const token = config.webhook.signatureToken
  if (!token) {
    return res.status(500).json({ code: 500, message: 'webhook signature token not configured' })
  }

  const timestamp = req.headers['x-huawei-timestamp']
  const signature = req.headers['x-huawei-signature']

  if (!timestamp || !signature) {
    console.warn('[webhook-auth] missing Huawei signature headers from', req.ip)
    return res.status(403).json({ code: 403, message: 'missing signature headers' })
  }

  // 防重放：时间戳不能偏差超过 5 分钟
  const now = Date.now()
  const reqTime = parseInt(timestamp)
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300_000) {
    console.warn('[webhook-auth] timestamp expired from', req.ip, 'diff:', Math.abs(now - reqTime))
    return res.status(403).json({ code: 403, message: 'timestamp expired' })
  }

  // 计算期望签名: HMAC-SHA256(token, timestamp + bodyMd5)
  const rawBody = JSON.stringify(req.body)
  const bodyMd5 = crypto.createHash('md5').update(rawBody).digest('hex')
  const expected = crypto
    .createHmac('sha256', token)
    .update(timestamp + bodyMd5)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    console.warn('[webhook-auth] signature mismatch from', req.ip)
    return res.status(403).json({ code: 403, message: 'invalid signature' })
  }

  next()
}
