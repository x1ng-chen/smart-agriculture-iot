const { get, put } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    alerts: [],
    filter: 'unresolved',
    page: 1,
    pageSize: 20,
    hasMore: true,
    levelMap: { info: '信息', warning: '警告', critical: '严重' }
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.setData({ page: 1, alerts: [] })
    this.loadAlerts()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, alerts: [] })
    this.loadAlerts().finally(() => wx.stopPullDownRefresh())
  },

  async loadAlerts() {
    try {
      const { filter, page, pageSize } = this.data
      const params = { page, pageSize }
      if (filter === 'unresolved') params.resolved = 0
      else if (filter === 'resolved') params.resolved = 1

      const data = await get('/alerts', params)
      const list = Array.isArray(data) ? data : (data?.data || data?.rows || [])
      this.setData({
        alerts: this.data.page === 1 ? list : [...this.data.alerts, ...list],
        hasMore: list.length >= pageSize
      })
    } catch (err) {
      console.error('[alerts] load error:', err)
    }
  },

  setFilter(e) {
    const f = e.currentTarget.dataset.filter
    if (f === this.data.filter) return
    this.setData({ filter: f, page: 1, alerts: [] })
    this.loadAlerts()
  },

  loadMore() {
    if (!this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.loadAlerts()
  },

  handleResolveTap(e) {
    const id = e.currentTarget.dataset.id
    this.handleResolve({ detail: { id } })
  },

  async handleResolve(e) {
    try {
      await put('/alerts/' + e.detail.id + '/resolve')
      wx.showToast({ title: '已标记解决', icon: 'success' })
      const alerts = this.data.alerts.map(a => {
        if (a.id === e.detail.id) return { ...a, resolved: 1 }
        return a
      })
      this.setData({ alerts })
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
