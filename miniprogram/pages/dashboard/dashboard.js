const { get } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    stats: {
      onlineDevices: 0,
      todayIrrigation: 0,
      activeAlerts: 0,
      totalWater: 0,
      onlineDeviceList: [],
      recentAlerts: []
    },
    alertLevelMap: { info: '信息', warning: '警告', critical: '严重' }
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
      const data = await get('/dashboard/stats')
      this.setData({ stats: data })
    } catch (err) {
      console.error('[dashboard] load error:', err)
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
