import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import https from 'https'
import config from '../config.js'
import { query } from '../db.js'
import { findByUsername, findById, findByWechatOpenid, createWechatUser } from '../models/user.js'
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

// 修改密码
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body
    if (!old_password || !new_password) {
      return res.status(400).json(error('请输入当前密码和新密码'))
    }
    if (new_password.length < 6) {
      return res.status(400).json(error('新密码至少6位'))
    }

    const user = await findById(req.userId)
    if (!user) return res.status(404).json(error('用户不存在'))

    const valid = await bcrypt.compare(old_password, user.password)
    if (!valid) return res.status(401).json(error('当前密码错误'))

    // 禁止新旧密码相同
    if (old_password === new_password) {
      return res.status(400).json(error('新密码不能与当前密码相同'))
    }

    const hash = await bcrypt.hash(new_password, 10)
    await query('UPDATE users SET password = ? WHERE id = ?', [hash, req.userId])

    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('服务器内部错误'))
  }
})

// 微信小程序登录
router.post('/wechat-login', async (req, res) => {
  try {
    const { code, nickName, avatarUrl } = req.body

    if (!code) {
      return res.status(400).json(error('缺少登录凭证code'))
    }

    // 调用微信 code2session 接口
    const wechatRes = await new Promise((resolve, reject) => {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&js_code=${code}&grant_type=authorization_code`
      https.get(url, (resp) => {
        let data = ''
        resp.on('data', chunk => data += chunk)
        resp.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error('微信接口返回格式异常'))
          }
        })
      }).on('error', reject)
    })

    if (wechatRes.errcode) {
      console.error('[wechat-login] code2session error:', wechatRes)
      return res.status(400).json(error('微信登录失败: ' + (wechatRes.errmsg || '未知错误')))
    }

    const { openid } = wechatRes

    // 查找或创建用户
    let user = await findByWechatOpenid(openid)
    if (!user) {
      user = await createWechatUser(openid, nickName)
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
    console.error('[wechat-login] error:', err)
    return res.status(500).json(error('服务器内部错误'))
  }
})

export default router
