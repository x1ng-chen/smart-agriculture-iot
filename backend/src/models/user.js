import { query } from '../db.js'

export async function findByUsername(username) {
  const rows = await query(
    'SELECT * FROM users WHERE username = ? AND status = 1',
    [username]
  )
  return rows[0] || null
}

export async function findById(id) {
  const rows = await query(
    'SELECT * FROM users WHERE id = ? AND status = 1',
    [id]
  )
  return rows[0] || null
}

export async function findByWechatOpenid(openid) {
  const rows = await query(
    'SELECT * FROM users WHERE wechat_openid = ? AND status = 1',
    [openid]
  )
  return rows[0] || null
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
