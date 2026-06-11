import OpenAI from 'openai'
import config from '../config.js'
import { tools, executeToolCall } from './tools.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const systemPrompt = readFileSync(join(__dirname, 'system-prompt.txt'), 'utf-8')

function getClient() {
  if (!config.mimo.apiKey) return null
  return new OpenAI({
    apiKey: config.mimo.apiKey,
    baseURL: config.mimo.baseURL
  })
}

function extractText(msg) {
  return msg.content || msg.reasoning_content || ''
}

export async function handleChat(userMessage, history = []) {
  const client = getClient()
  if (!client) {
    return { reply: 'AI 服务未配置，请联系管理员设置 MIMO_API_KEY', toolCalls: [] }
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage }
  ]

  const toolCallLog = []

  try {
    for (let round = 0; round < 3; round++) {
      const isLastRound = round === 2

      const response = await client.chat.completions.create({
        model: config.mimo.chatModel,
        messages,
        tools,
        tool_choice: isLastRound ? 'none' : 'auto',
        max_tokens: 2048,
        temperature: 0.7,
        thinking: { type: 'disabled' }
      })

      const choice = response.choices[0]
      const msg = choice.message
      const text = extractText(msg)

      if (msg.tool_calls && msg.tool_calls.length > 0 && !isLastRound) {
        messages.push(msg)

        for (const tc of msg.tool_calls) {
          const fnName = tc.function.name
          let args = {}
          try { args = JSON.parse(tc.function.arguments) } catch (e) { /* keep {} */ }

          const result = await executeToolCall(fnName, args)
          toolCallLog.push({ name: fnName, args, result })

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result
          })
        }
      } else {
        // Final answer — prefer content, fall back to reasoning_content
        if (text) {
          return { reply: text, toolCalls: toolCallLog }
        }
        // If no text at all, try one more call without tools
        if (!isLastRound) continue
        return { reply: 'AI 分析超时，请简化您的问题后再试。', toolCalls: toolCallLog }
      }
    }

    return {
      reply: 'AI 分析超时，请简化您的问题后再试。',
      toolCalls: toolCallLog
    }
  } catch (err) {
    console.error('[ai-chat] error:', err.message)
    if (err.status === 401) {
      return { reply: 'MiMo API Key 无效，请联系管理员检查配置。', toolCalls: toolCallLog }
    }
    return { reply: `AI 服务暂时不可用：${err.message}`, toolCalls: toolCallLog }
  }
}
