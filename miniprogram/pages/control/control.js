const { get, post } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    deviceId: null,
    device: {},
    sensorData: null,
    duration: 30,
    durations: [15, 30, 60, 120, 300],
    running: false,
    remaining: 0,
    loading: false,
    logs: []
  },

  countdownTimer: null,

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    const deviceId = options.deviceId
    this.setData({ deviceId })
    this.loadAll()
  },

  onUnload() {
    this.clearCountdown()
  },

  async loadAll() {
    const { deviceId } = this.data
    try {
      const [deviceData, logs] = await Promise.all([
        get('/devices/' + deviceId + '/data/latest').catch(() => null),
        get('/irrigation-logs', { device_id: deviceId, page: 1, pageSize: 5 }).catch(() => [])
      ])
      this.setData({
        device: deviceData?.device || {},
        sensorData: deviceData,
        logs: Array.isArray(logs) ? logs : (logs?.data || [])
      })
    } catch (err) {
      console.error('[control] load error:', err)
    }
  },

  selectDuration(e) {
    this.setData({ duration: e.currentTarget.dataset.val })
  },

  async handleStart() {
    const { deviceId, duration } = this.data
    this.setData({ loading: true })
    try {
      await post('/devices/' + deviceId + '/irrigate/start', { duration_sec: duration })
      wx.showToast({ title: '灌溉已启动', icon: 'success' })
      this.setData({ running: true, remaining: duration, loading: false })
      this.startCountdown()
    } catch (err) {
      wx.showToast({ title: err.message || '启动失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  async handleStop() {
    const { deviceId } = this.data
    this.setData({ loading: true })
    try {
      await post('/devices/' + deviceId + '/irrigate/stop')
      wx.showToast({ title: '已停止', icon: 'success' })
      this.clearCountdown()
      this.setData({ running: false, remaining: 0, loading: false })
      this.loadAll()
    } catch (err) {
      wx.showToast({ title: err.message || '停止失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  startCountdown() {
    this.clearCountdown()
    this.countdownTimer = setInterval(() => {
      const r = this.data.remaining - 1
      if (r <= 0) {
        this.clearCountdown()
        this.setData({ running: false, remaining: 0 })
        this.loadAll()
      } else {
        this.setData({ remaining: r })
      }
    }, 1000)
  },

  clearCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  }
})
