import crypto from 'crypto'
import config from '../config.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16   // 128-bit IV
const TAG_LENGTH = 16  // 128-bit auth tag
const KEY_LENGTH = 32  // 256-bit key

/**
 * 从环境变量派生加密密钥
 * ENCRYPTION_KEY 必须是 32 字节 (64 hex chars) 或任意长度的 passphrase
 */
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || ''
  if (!raw) {
    // 开发环境用固定密钥（生产必须设置 ENCRYPTION_KEY）
    if (config.server.env === 'production') {
      throw new Error('[crypto] ENCRYPTION_KEY 未设置，生产环境拒绝启动')
    }
    return crypto.scryptSync('dev-encryption-key-not-for-production', 'smart-agri-salt', KEY_LENGTH)
  }
  // 如果是 64 位 hex 字符串，直接用
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  // 否则用 scrypt 派生
  return crypto.scryptSync(raw, 'smart-agri-salt', KEY_LENGTH)
}

let _key = null
function ensureKey() {
  if (!_key) _key = getKey()
  return _key
}

/**
 * 加密字符串 → 返回 base64 编码的 "iv:tag:ciphertext"
 * @param {string} plaintext 明文
 * @returns {string} 加密后的字符串
 */
export function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext

  const key = ensureKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const tag = cipher.getAuthTag()

  // 格式: base64(iv) : base64(tag) : base64(ciphertext)
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')
}

/**
 * 解密字符串
 * @param {string} encryptedText "iv:tag:ciphertext" 格式的加密字符串
 * @returns {string} 明文
 */
export function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText
  if (!encryptedText.includes(':')) return encryptedText // 非加密格式，原样返回

  const parts = encryptedText.split(':')
  if (parts.length !== 3) return encryptedText

  try {
    const key = ensureKey()
    const iv = Buffer.from(parts[0], 'base64')
    const tag = Buffer.from(parts[1], 'base64')
    const ciphertext = Buffer.from(parts[2], 'base64')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(ciphertext)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    // 解密失败（可能是旧的明文数据），原样返回
    return encryptedText
  }
}

/**
 * 哈希函数（不可逆，用于指纹/索引）
 * @param {string} data
 * @returns {string} hex digest
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex')
}

/**
 * 生成随机 Token
 * @param {number} bytes 字节数
 * @returns {string} hex string
 */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * 生成加密密钥（供首次配置使用）
 * @returns {string} 64 位 hex 字符串
 */
export function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}
