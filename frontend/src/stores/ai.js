import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiChat } from '@/api'

export const useAiStore = defineStore('ai', () => {
  const messages = ref([])
  const loading = ref(false)

  async function sendMessage(text) {
    messages.value.push({ role: 'user', content: text })
    loading.value = true

    const history = messages.value.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const res = await aiChat({ message: text, history })
      messages.value.push({ role: 'assistant', content: res.data.reply })
    } catch {
      messages.value.push({ role: 'assistant', content: 'AI 服务暂时不可用，请稍后重试。' })
    } finally {
      loading.value = false
    }
  }

  function clearMessages() {
    messages.value = []
  }

  return { messages, loading, sendMessage, clearMessages }
})
