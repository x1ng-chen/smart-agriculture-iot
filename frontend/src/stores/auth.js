import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMe } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  function setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function setUserInfo(info) {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  function clearAuth() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  const isLoggedIn = () => !!token.value

  async function fetchUserInfo() {
    if (!token.value) return
    try {
      const res = await getMe()
      setUserInfo(res.data)
    } catch {
      clearAuth()
    }
  }

  return { token, userInfo, setToken, setUserInfo, clearAuth, isLoggedIn, fetchUserInfo }
})
