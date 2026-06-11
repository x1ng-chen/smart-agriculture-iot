import OpenAI from 'openai'
import config from '../config.js'
import { extractFeatures, buildDecisionPrompt } from './feature-extractor.js'

function getClient() {
  if (!config.mimo.apiKey) return null
  return new OpenAI({
    apiKey: config.mimo.apiKey,
    baseURL: config.mimo.baseURL
  })
}

/**
 * 基于特征提取的 AI 灌溉决策
 *
 * 流程:
 *   1. extractFeatures() → InfluxDB 2h聚合 + 衍生特征 + 灌溉历史 + 作物上下文
 *   2. buildDecisionPrompt() → 结构化 Prompt
 *   3. MiMo LLM → 严格 JSON 响应
 *   4. 校验 + 安全边界裁剪
 */
export async function generateDecision(deviceId) {
  const client = getClient()
  if (!client) {
    return { should_irrigate: false, duration_sec: 0, confidence: 0, reasoning: 'AI 服务未配置，请设置 MIMO_API_KEY' }
  }

  // Step 1 & 2: 提取特征 + 构建 Prompt
  let features, prompt
  try {
    features = await extractFeatures(deviceId)
  } catch (err) {
    console.error('[ai-decision] feature extraction error:', err.message)
    return { should_irrigate: false, duration_sec: 0, confidence: 0, reasoning: `特征提取失败: ${err.message}` }
  }

  prompt = buildDecisionPrompt(features)
  const maxDuration = features.context.strategy?.irrigation_duration_max || 1800

  // 数据不足时降级为规则建议（不调 AI，省钱）
  if (!features.data_sufficient) {
    const moisture = features.derived.soil_moisture
    const threshold = features.context.strategy
    const shouldIrrigate = moisture && threshold && moisture.current < threshold.humidity_min
    return {
      should_irrigate: !!shouldIrrigate,
      duration_sec: shouldIrrigate ? Math.min(maxDuration, 600) : 0,
      confidence: 0.3,
      reasoning: `数据不足(窗口数=${features.window_count})，降级为规则判断: 当前湿度 ${moisture?.current}% ${shouldIrrigate ? '低于' : '不低于'}阈值 ${threshold?.humidity_min}%`
    }
  }

  // Step 3: 调用 MiMo AI
  try {
    const response = await client.chat.completions.create({
      model: config.mimo.decisionModel,
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
      temperature: 0.2,
      thinking: { type: 'disabled' }
    })

    const text = response.choices[0]?.message?.content || ''
    const result = JSON.parse(text)

    // Step 4: 校验 + 安全边界裁剪
    return {
      should_irrigate: !!result.should_irrigate,
      duration_sec: Math.min(Math.max(0, parseInt(result.duration_sec) || 0), maxDuration),
      confidence: Math.min(1, Math.max(0, parseFloat(result.confidence) || 0)),
      reasoning: result.reasoning || 'AI 未提供说明'
    }
  } catch (err) {
    console.error('[ai-decision] API error:', err.message)
    // 降级：如果 AI 调用失败但湿度趋势明显下降且接近阈值，规则兜底
    const moisture = features.derived.soil_moisture
    const threshold = features.context.strategy
    const isDrying = moisture?.trend_direction === '下降'
    const nearThreshold = moisture && threshold && moisture.current < threshold.humidity_min * 1.15
    const fallback = isDrying && nearThreshold
    return {
      should_irrigate: fallback,
      duration_sec: fallback ? Math.min(maxDuration, 600) : 0,
      confidence: 0.2,
      reasoning: `AI 调用失败(${err.message})，降级判断: 湿度${moisture?.current}% 趋势${moisture?.trend_direction} ${fallback ? '→ 保守灌溉' : '→ 暂不动作'}`
    }
  }
}
