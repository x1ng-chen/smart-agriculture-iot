import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import config from '../config.js'
import { findByUsername, findById } from '../models/user.js'
import { success, error } from '../utils/response.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findById(req.userId)
    if (!user) return res.status(401).json(error('用户不存在'))
    res.json(success({
      user_id: user.id,
      username: user.username,
      role: user.role,
      real_name: user.real_name
    }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('服务器内部错误'))
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json(error('请输入用户名和密码'))
    }

    const user = await findByUsername(username)
    if (!user) {
      return res.status(401).json(error('用户名或密码错误'))
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json(error('用户名或密码错误'))
    }

    const token = jwt.sign(
      { user_id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: `${config.jwt.expireHours}h` }
    )

    return res.json(success({
      token,
      user_id: user.id,
      username: user.username,
      role: user.role,
      real_name: user.real_name
    }))
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json(error('服务器内部错误'))
  }
})

export default router
