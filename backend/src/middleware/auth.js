import jwt from 'jsonwebtoken'
import config from '../config.js'
import { error } from '../utils/response.js'

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(error('未授权访问'))
  }

  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    req.userId = decoded.user_id
    req.username = decoded.username
    req.role = decoded.role
    next()
  } catch (err) {
    return res.status(401).json(error('Token无效或已过期'))
  }
}
