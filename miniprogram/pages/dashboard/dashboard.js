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
    statCards: [],
    deviceCount: 0,
    alertCount: 0,
    alertLevelMap: { info: '信息', warning: '警告', critical: '严重' },
    _entranceDone: false
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

  onHide() { this.stopPolling() },
  onUnload() { this.stopPolling() },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    try {
      const data = await get('/dashboard/stats')
      const statCards = [
        { color: 'cyan',  icon: '📡', label: '在线设备',   value: String(data.onlineDevices || 0) },
        { color: 'green', icon: '💧', label: '今日灌溉(次)', value: String(data.todayIrrigation || 0) },
        { color: 'coral', icon: '⚠️', label: '活跃告警',   value: String(data.activeAlerts || 0) },
        { color: 'amber', icon: '🪣', label: '今日用水量', value: (data.totalWater || 0) + ' L' }
      ]
      this.setData({
        stats: data,
        statCards,
        deviceCount: (data.onlineDeviceList || []).length,
        alertCount: (data.recentAlerts || []).length
      })
      if (!this.data._entranceDone) {
        this.data._entranceDone = true
      }
    } catch (err) {
      console.error('[dashboard] load error:', err)
    }
  },

  startPolling() {
    this.stopPolling()
    this.timer = setInterval(() => this.loadData(), 5000)
  },

  stopPolling() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  },

  /* Spring press micro-interaction handlers */
  onCardTouch(e) {
    // CSS :active handles the visual — touchstart ensures instant feedback
  },
  onCardRelease(e) {
    // Spring-back handled by CSS transition
  },
  onItemTouch(e) { /* CSS :active */ },
  onItemRelease(e) { /* CSS */ }
})
