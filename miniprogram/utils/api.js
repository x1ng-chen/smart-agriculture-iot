const { BASE_URL } = require('./constants')
const { getToken, clearAuth } = require('./auth')

function request(method, path, data, params) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    let url = BASE_URL + path
    if (params) {
      const qs = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&')
      url += '?' + qs
    }
    wx.request({
      url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : ''
      },
      success(res) {
        if (res.statusCode === 401) {
          clearAuth()
          wx.reLaunch({ url: '/pages/login/login' })
          return
        }
        const body = res.data
        if (body.code === 0) resolve(body.data)
        else reject(body)
      },
      fail(err) {
        wx.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = {
  get: (path, params) => request('GET', path, undefined, params),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data)
}
