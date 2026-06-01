const { get } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    devices: [],
    connected: false
  },

  timer: null,

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.loadData()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    try {
      const data = await get('/dashboard/devices-latest')
      this.setData({ devices: data || [], connected: true })
    } catch (err) {
      console.error('[monitor] load error:', err)
      this.setData({ connected: false })
    }
  },

  startPolling() {
    this.stopPolling()
    this.timer = setInterval(() => this.loadData(), 5000)
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
})
