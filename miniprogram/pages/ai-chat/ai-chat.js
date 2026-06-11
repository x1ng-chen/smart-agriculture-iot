const { post } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    quickQuestions: [
      '今天土壤湿度怎么样？',
      '最近有什么告警？',
      '分析一下最近的灌溉情况',
      '查看所有设备状态'
    ]
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  async sendMessage() {
    const text = this.data.inputText.trim()
    if (!text || this.data.loading) return

    const messages = this.data.messages
    messages.push({ role: 'user', content: text })
    this.setData({ inputText: '', messages, loading: true }, () => {
      this.scrollToBottom()
    })

    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const data = await post('/ai/chat', { message: text, history })
      messages.push({ role: 'assistant', content: data.reply })
    } catch {
      messages.push({ role: 'assistant', content: 'AI 服务暂时不可用，请稍后重试。' })
    } finally {
      this.setData({ messages, loading: false }, () => {
        this.scrollToBottom()
      })
    }
  },

  sendQuick(e) {
    const q = e.currentTarget.dataset.question
    this.setData({ inputText: q }, () => {
      this.sendMessage()
    })
  },

  clearChat() {
    this.setData({ messages: [] })
  },

  scrollToBottom() {
    wx.createSelectorQuery().select('#msgList').boundingClientRect().exec(() => {
      wx.pageScrollTo({ scrollTop: 99999, duration: 150 })
    })
  }
})
