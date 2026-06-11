<template>
  <div class="ai-chat">
    <div class="chat-container">
      <!-- header -->
      <div class="chat-header">
        <div class="chat-header-icon">
          <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
            <circle cx="20" cy="20" r="16" stroke="url(#aiGrad)" stroke-width="2" fill="none"/>
            <path d="M14 18c0-2 1-4 3-5s4-1 6 0 4 4 4 7c0 4-1 8-4 10" stroke="url(#aiGrad)" stroke-width="2" stroke-linecap="round"/>
            <circle cx="17" cy="20" r="1.5" fill="#00d4ff"/>
            <circle cx="23" cy="20" r="1.5" fill="#00d4ff"/>
            <defs><linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
          </svg>
        </div>
        <div>
          <div class="chat-header-title">AI 助手 · 小农</div>
          <div class="chat-header-sub">由 MiMo 驱动 · 智慧农业专家</div>
        </div>
      </div>

      <!-- messages -->
      <div class="chat-messages" ref="msgContainer">
        <div v-if="store.messages.length === 0" class="chat-empty">
          <div class="empty-icon">
            <svg viewBox="0 0 60 60" fill="none" width="60" height="60">
              <circle cx="30" cy="30" r="24" stroke="rgba(0,212,255,0.2)" stroke-width="1.5" fill="none"/>
              <path d="M22 28c0-3 2-7 5-8s6-1 8 1 5 6 5 10c0 6-2 12-5 14" stroke="rgba(0,212,255,0.3)" stroke-width="2" stroke-linecap="round"/>
              <circle cx="26" cy="31" r="2" fill="rgba(0,212,255,0.4)"/>
              <circle cx="34" cy="31" r="2" fill="rgba(0,212,255,0.4)"/>
            </svg>
          </div>
          <p class="empty-title">你好，我是小农 🌱</p>
          <p class="empty-desc">我可以帮你查看农田数据、分析灌溉情况、解答种植问题</p>
          <div class="quick-questions">
            <button v-for="q in quickQuestions" :key="q" class="quick-chip" @click="sendQuick(q)">{{ q }}</button>
          </div>
        </div>

        <div v-for="(msg, i) in store.messages" :key="i" class="msg-row" :class="msg.role">
          <div class="msg-avatar">
            <span v-if="msg.role === 'assistant'">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <circle cx="12" cy="12" r="10" stroke="url(#aiGrad2)" stroke-width="1.5" fill="none"/>
                <path d="M8 12c0-1.5 1-3 2-4s3-1 4 0 3 3 3 5c0 3-1 5-3 7" stroke="url(#aiGrad2)" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="10.5" cy="13" r="1" fill="#a855f7"/>
                <circle cx="14.5" cy="13" r="1" fill="#a855f7"/>
                <defs><linearGradient id="aiGrad2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
              </svg>
            </span>
            <span v-else class="user-avatar-text">{{ (username || 'U')[0] }}</span>
          </div>
          <div class="msg-bubble" :class="msg.role">
            <div class="msg-text" v-text="msg.content"></div>
          </div>
        </div>

        <div v-if="store.loading" class="msg-row assistant">
          <div class="msg-avatar">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <circle cx="12" cy="12" r="10" stroke="url(#aiGrad2)" stroke-width="1.5" fill="none"/>
              <path d="M8 12c0-1.5 1-3 2-4s3-1 4 0 3 3 3 5c0 3-1 5-3 7" stroke="url(#aiGrad2)" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="10.5" cy="13" r="1" fill="#a855f7"/>
              <circle cx="14.5" cy="13" r="1" fill="#a855f7"/>
            </svg>
          </div>
          <div class="msg-bubble assistant typing">
            <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
          </div>
        </div>
      </div>

      <!-- input -->
      <div class="chat-input-area">
        <div class="chat-input-row">
          <textarea
            v-model="inputText"
            class="chat-input"
            placeholder="输入你的问题，例如：今天土壤湿度怎么样？"
            rows="1"
            @keydown.enter.exact.prevent="send()"
            @input="autoResize"
            ref="inputRef"
          ></textarea>
          <button class="send-btn" :disabled="!inputText.trim() || store.loading" @click="send()">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M4 12l16-8-6 16-2-6-6-2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <button v-if="store.messages.length > 0" class="clear-btn" @click="store.clearMessages()">
          清空对话
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useAiStore } from '@/stores/ai'
import { useAuthStore } from '@/stores/auth'

const store = useAiStore()
const authStore = useAuthStore()
const username = ref('')
const inputText = ref('')
const inputRef = ref(null)
const msgContainer = ref(null)

const quickQuestions = [
  '今天土壤湿度怎么样？',
  '最近有什么告警？',
  '分析一下最近的灌溉情况',
  '查看所有设备状态'
]

onMounted(() => {
  username.value = authStore.userInfo?.real_name || authStore.userInfo?.username || '用户'
})

function autoResize() {
  const el = inputRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }
}

async function send() {
  const text = inputText.value.trim()
  if (!text || store.loading) return
  inputText.value = ''
  await store.sendMessage(text)
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  })
}

function sendQuick(q) {
  store.sendMessage(q)
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  })
}
</script>

<style scoped>
.ai-chat {
  height: calc(100vh - 56px - 48px);
  display: flex;
  justify-content: center;
}
.chat-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  background: rgba(10, 24, 16, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

/* header */
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
}
.chat-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
}
.chat-header-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}
.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 12px 0 6px;
}
.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 20px;
}
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.quick-chip {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  background: rgba(0, 212, 255, 0.06);
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-chip:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.4);
  color: #00d4ff;
}

/* msg row */
.msg-row {
  display: flex;
  gap: 10px;
  max-width: 85%;
}
.msg-row.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.msg-row.assistant {
  align-self: flex-start;
}
.msg-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.15);
}
.user-avatar-text {
  font-weight: 700;
  font-size: 13px;
  color: #00d4ff;
}
.msg-bubble {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  color: #e2e8f0;
  word-break: break-word;
}
.msg-bubble.assistant {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-top-left-radius: 4px;
}
.msg-bubble.user {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.15));
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-top-right-radius: 4px;
  color: #e2e8f0;
}

/* typing */
.msg-bubble.typing {
  display: flex;
  gap: 5px;
  padding: 14px 18px;
}
.typing-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #64748b;
  animation: dotPulse 1.4s infinite ease-in-out both;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* input */
.chat-input-area {
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(0, 212, 255, 0.08);
}
.chat-input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.chat-input {
  flex: 1;
  resize: none;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.15);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.2s;
  max-height: 120px;
}
.chat-input:focus {
  border-color: rgba(0, 212, 255, 0.4);
}
.chat-input::placeholder {
  color: #475569;
}
.send-btn {
  width: 40px; height: 40px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #00d4ff, #a855f7);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.send-btn:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(0, 212, 255, 0.4);
}
.clear-btn {
  margin-top: 8px;
  background: none;
  border: none;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s;
}
.clear-btn:hover {
  color: #ef4444;
}
</style>
