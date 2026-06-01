Component({
  properties: {
    device: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onNavigateControl(e) {
      const deviceId = e.currentTarget.dataset.id
      wx.navigateTo({ url: '/pages/control/control?deviceId=' + deviceId })
    }
  }
})
