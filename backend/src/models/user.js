import { query } from '../db.js'
import { encrypt, decrypt } from '../utils/crypto.js'

// 需要加解密的敏感字段
const SENSITIVE_FIELDS = ['phone', 'email']

/**
 * 加密用户对象中的敏感字段（写入前调用）
 */
function encryptUser(user) {
  if (!user) return user
  const encrypted = { ...user }
  for (const field of SENSITIVE_FIELDS) {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field])
    }
  }
  return encrypted
}

/**
 * 解密用户对象中的敏感字段（读取后调用）
 */
function decryptUser(user) {
  if (!user) return user
  const decrypted = { ...user }
  for (const field of SENSITIVE_FIELDS) {
    if (decrypted[field]) {
      decrypted[field] = decrypt(decrypted[field])
    }
  }
  return decrypted
}

export async function findByUsername(username) {
  const rows = await query(
    'SELECT * FROM users WHERE username = ? AND status = 1',
    [username]
  )
  return rows[0] ? decryptUser(rows[0]) : null
}

export async function findById(id) {
  const rows = await query(
    'SELECT * FROM users WHERE id = ? AND status = 1',
    [id]
  )
  return rows[0] ? decryptUser(rows[0]) : null
}

export async function findByWechatOpenid(openid) {
  const rows = await query(
    'SELECT * FROM users WHERE wechat_openid = ? AND status = 1',
    [openid]
  )
  return rows[0] ? decryptUser(rows[0]) : null
}

export async function createWechatUser(openid, nickName) {
  const username = 'wx_' + openid.substring(0, 30)
  const realName = nickName || '微信用户'
  const result = await query(
    'INSERT INTO users (username, password, real_name, role, wechat_openid) VALUES (?, ?, ?, ?, ?)',
    [username, '', realName, 'operator', openid]
  )
  return { id: result.insertId, username, real_name: realName, role: 'operator' }
}

/**
 * 更新用户敏感信息时自动加密
 */
export async function updateUserSensitive(userId, fields) {
  const encrypted = encryptUser(fields)
  const updates = []
  const params = []
  for (const field of SENSITIVE_FIELDS) {
    if (encrypted[field] !== undefined) {
      updates.push(`${field} = ?`)
      params.push(encrypted[field])
    }
  }
  if (updates.length === 0) return
  params.push(userId)
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
}
