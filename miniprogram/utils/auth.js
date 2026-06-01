function getToken() {
  return wx.getStorageSync('token') || ''
}

function setToken(token) {
  wx.setStorageSync('token', token)
}

function getUserInfo() {
  return wx.getStorageSync('userInfo') || null
}

function setUserInfo(info) {
  wx.setStorageSync('userInfo', info)
}

function clearAuth() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
}

function isLoggedIn() {
  return !!getToken()
}

module.exports = { getToken, setToken, getUserInfo, setUserInfo, clearAuth, isLoggedIn }
