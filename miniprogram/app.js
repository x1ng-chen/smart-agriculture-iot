App({
  globalData: {
    userInfo: null,
    token: ''
  },
  onLaunch() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = wx.getStorageSync('userInfo') || null
    }
  }
})
