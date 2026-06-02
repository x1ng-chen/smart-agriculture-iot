const { post } = require('../../utils/api')
const { setToken, setUserInfo, isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    loading: false,
    errorMsg: ''
  },

  onLoad() {
    if (isLoggedIn()) {
      wx.switchTab({ url: '/pages/dashboard/dashboard' })
    }
  },

  onCardTouch() {},
  onCardRelease() {},

  async handleLogin() {
    this.setData({ loading: true, errorMsg: '' })

    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })

      const { code } = loginRes

      let nickName = ''
      try {
        const profileRes = await new Promise((resolve, reject) => {
          wx.getUserProfile({
            desc: '用于完善用户信息',
            success: resolve,
            fail: () => resolve(null)
          })
        })
        if (profileRes) {
          nickName = profileRes.userInfo.nickName
        }
      } catch {
        // 用户拒绝授权也继续登录
      }

      const data = await post('/auth/wechat-login', {
        code,
        nickName: nickName || undefined
      })

      setToken(data.token)
      setUserInfo({
        user_id: data.user_id,
        username: data.username,
        role: data.role,
        real_name: data.real_name
      })

      const app = getApp()
      app.globalData.token = data.token
      app.globalData.userInfo = data

      wx.switchTab({ url: '/pages/dashboard/dashboard' })
    } catch (err) {
      console.error('[login] error:', err)
      this.setData({
        errorMsg: err.message || '登录失败，请重试',
        loading: false
      })
    }
  }
})
