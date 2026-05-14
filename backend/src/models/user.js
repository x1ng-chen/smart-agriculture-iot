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
