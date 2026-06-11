/**
 * Smart Agriculture Irrigation System - PPT Generator
 * Uses PptxGenJS to create an optimized, professional presentation
 *
 * 改进点:
 * 1. 修复空页 (原 slide11/slide31)
 * 2. 更新 Socket.io 架构 (替代 Aedes MQTT)
 * 3. 新增 AI 助手功能页
 * 4. 精简过于密集的页面
 * 5. 统一视觉风格，农业绿色主题
 */

import PptxGenJS from 'pptxgenjs'

const pptx = new PptxGenJS()

// ── Theme Setup ──
pptx.defineLayout({ name: 'WIDE', width: '13.333', height: '7.5' })
pptx.layout = 'WIDE'

// Color palette
const C = {
  primary:     '0D9488', // teal-600
  primaryDark: '0F766E', // teal-700
  primaryLight:'14B8A6', // teal-500
  green:       '16A34A', // green-600
  greenDark:   '15803D',
  blue:        '2563EB', // blue-600
  orange:      'EA580C',
  red:         'DC2626',
  dark:        '1E293B', // slate-800
  gray:        '64748B', // slate-500
  lightGray:   'E2E8F0', // slate-200
  bg:          'F8FAFC', // slate-50
  white:       'FFFFFF',
  black:       '0F172A',
  yellow:      'EAB308',
}

const FONT = 'Microsoft YaHei'
const FONT_TITLE = 'Microsoft YaHei'

// ── Helpers ──
function slideBase(slide, title, subtitle) {
  slide.background = { fill: C.bg }

  // Top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: C.primary }
  })

  // Title
  if (title) {
    slide.addText(title, {
      x: 0.6, y: 0.25, w: '80%', h: 0.6,
      fontSize: 28, fontFace: FONT_TITLE, bold: true,
      color: C.dark, align: 'left'
    })
  }

  // Subtitle / divider line
  if (subtitle) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: 0.82, w: 1.2, h: 0.04,
      fill: { color: C.primary }
    })
    slide.addText(subtitle, {
      x: 0.6, y: 0.9, w: '80%', h: 0.4,
      fontSize: 13, fontFace: FONT, color: C.gray
    })
  }
}

function addSectionBox(slide, x, y, w, h, title, content, opts = {}) {
  const { titleColor = C.primary, bgColor = C.white, fontSize = 11, lineSpacingMultiple = 1.3 } = opts

  // Card background
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: bgColor },
    shadow: { type: 'outer', blur: 4, offset: 2, color: '000000', opacity: 0.08 },
    rectRadius: 0.08
  })

  // Title
  slide.addText(title, {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.35,
    fontSize: 14, fontFace: FONT, bold: true, color: titleColor
  })

  // Content
  slide.addText(content, {
    x: x + 0.15, y: y + 0.4, w: w - 0.3, h: h - 0.5,
    fontSize, fontFace: FONT, color: C.dark, valign: 'top',
    lineSpacingMultiple
  })
}

function addDataCard(slide, x, y, w, h, label, value, color = C.primary) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: C.white },
    shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
    rectRadius: 0.06
  })
  slide.addText(value, {
    x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h * 0.5,
    fontSize: 24, fontFace: FONT, bold: true, color, align: 'center'
  })
  slide.addText(label, {
    x: x + 0.1, y: y + h * 0.5, w: w - 0.2, h: h * 0.4,
    fontSize: 11, fontFace: FONT, color: C.gray, align: 'center'
  })
}

function addFooter(slide, text) {
  slide.addText(text || '智慧农业灌溉系统 · Smart Agriculture Irrigation System', {
    x: 0.6, y: 6.95, w: '90%', h: 0.35,
    fontSize: 9, fontFace: FONT, color: C.gray, align: 'left'
  })
  // Page number placeholder
  slide.addText('', {
    x: 11.5, y: 6.95, w: 1.2, h: 0.35,
    fontSize: 9, fontFace: FONT, color: C.gray, align: 'right'
  })
}

function addTable(slide, x, y, w, h, headers, rows, opts = {}) {
  const { colW, fontSize = 10 } = opts
  const headerRow = headers.map(h => ({ text: h, options: {
    bold: true, color: C.white, fill: { color: C.primary },
    fontSize: 11, fontFace: FONT, align: 'center', valign: 'middle'
  }}))

  const dataRows = rows.map(row =>
    row.map((cell, i) => ({ text: cell, options: {
      fontSize, fontFace: FONT, color: C.dark,
      fill: { color: i % 2 === 0 ? C.bg : C.white },
      align: 'center', valign: 'middle'
    }}))
  )

  slide.addTable([headerRow, ...dataRows], {
    x, y, w, colW,
    border: { type: 'solid', pt: 0.5, color: C.lightGray },
    rowH: 0.35,
    autoPage: false
  })
}

// ======================================================================
// SLIDE 1: Title
// ======================================================================
{
  const slide = pptx.addSlide()
  slide.background = { fill: C.primaryDark }

  // Decorative shape
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: C.primaryDark }
  })
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: '100%',
    fill: { color: C.primaryLight }
  })

  slide.addText('智慧农业灌溉系统', {
    x: 1, y: 1.8, w: 11, h: 1.2,
    fontSize: 42, fontFace: FONT_TITLE, bold: true,
    color: C.white, align: 'center'
  })
  slide.addText('Smart Agriculture Irrigation System', {
    x: 1, y: 2.9, w: 11, h: 0.6,
    fontSize: 20, fontFace: FONT_TITLE, color: C.primaryLight, align: 'center'
  })

  // Tech stack line
  slide.addText('华为云 IoTDA + BearPi-HM Nano + Node.js + Vue 3 + InfluxDB + Redis + Docker', {
    x: 1, y: 3.8, w: 11, h: 0.5,
    fontSize: 13, fontFace: FONT, color: '94A3B8', align: 'center'
  })

  // Divider
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.5, y: 4.5, w: 4.3, h: 0.03,
    fill: { color: C.primaryLight }
  })

  slide.addText('端到端物联网智能灌溉解决方案', {
    x: 1, y: 4.8, w: 11, h: 0.5,
    fontSize: 16, fontFace: FONT, color: 'CBD5E1', align: 'center'
  })

  slide.addText('2026.06', {
    x: 1, y: 6.2, w: 11, h: 0.4,
    fontSize: 11, fontFace: FONT, color: '94A3B8', align: 'center'
  })
}

// ======================================================================
// SLIDE 2: 项目概述
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '项目概述', '端到端物联网灌溉系统 · 板子采集 → 华为云 → 后端处理 → 前端展示')

  // 4 data cards
  const cards = [
    { label: '硬件设备', value: '2台', sub: 'BearPi-HM Nano', color: C.primary },
    { label: '后端服务', value: '11模块', sub: 'Node.js + Express', color: C.blue },
    { label: '前端页面', value: '10页面', sub: 'Vue 3 + Element Plus', color: C.green },
    { label: '数据库', value: '3引擎', sub: 'MySQL + InfluxDB + Redis', color: C.orange },
  ]
  cards.forEach((c, i) => {
    const cx = 0.6 + i * 3.15
    addDataCard(slide, cx, 1.5, 2.9, 1.3, c.label, c.value, c.color)
    slide.addText(c.sub, {
      x: cx + 0.15, y: 2.65, w: 2.6, h: 0.3,
      fontSize: 11, fontFace: FONT, color: C.gray, align: 'center'
    })
  })

  // Left section - Hardware
  addSectionBox(slide, 0.6, 3.2, 3.85, 3.5,
    '🔧 硬件平台',
    '• BearPi-HM Nano ×2 (Hi3861 RISC-V 160MHz)\n• SHT30 温湿度 (±0.3°C) + BH1750 光照\n• 土壤湿度 ADC 采集 + GPIO_8 继电器水泵\n• WiFi 2.4GHz MQTT 接入华为云 IoTDA\n• 华为云 REST API 命令下发 + UART 备用\n• Flash 配置存储 + 云端 SetConfig 远程配网',
    { titleColor: C.primary }
  )

  // Middle section - Backend
  addSectionBox(slide, 4.75, 3.2, 3.85, 3.5,
    '⚙️ 后端服务',
    '• Node.js 22 + Express + Socket.io WebSocket\n• JWT 认证 + bcrypt 加密 + Redis 限流\n• Webhook 接收华为云数据 → 双写 MySQL+InfluxDB\n• 告警引擎 (30min 冷却) + 策略引擎 (自动触发)\n• AI 决策引擎 (MiMo) + AI 异常检测 (Z-Score)\n• FRP 内网穿透 (阿里云 ECS)\n• 3级命令下发: REST API → UART → MQTT',
    { titleColor: C.blue }
  )

  // Right section - Frontend
  addSectionBox(slide, 8.9, 3.2, 3.85, 3.5,
    '🎨 前端应用',
    '• Vue 3 Composition API + Vite 5 构建\n• Element Plus 企业级 UI + ECharts 图表\n• Socket.io WebSocket 实时数据推送\n• 10个功能页面 + JWT 路由守卫\n• Pinia 状态管理 + Axios 拦截器\n• 响应式设计 + 骨架屏加载 + Toast 反馈\n• AI 助手对话页面 (MiMo 对接)',
    { titleColor: C.green }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 2.5: 完整系统架构图 (7层架构)
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '系统架构总览', '7 层架构 · BearPi → WiFi/MQTT → 华为云 IoTDA → FRP → 后端 → 数据库 → 前端 · 端到端 < 1s')

  const layers = [
    { y: 1.24, label: '前端展示层\nPresentation', color: C.red, items: [
      'Vue 3 + Vite :3000\nElement Plus UI\nECharts 可视化', 'Socket.io Client\nws://:8080/ws\n实时数据推送', '10 功能页面\nJWT 路由守卫\nAI 助手对话', 'Pinia 状态管理\nmqttStore.latestData\n毫秒级 DOM 刷新'
    ]},
    { y: 2.02, label: '后端服务层\nBackend :8080', color: C.green, items: [
      'Express 4\n11 API 模块\nJWT + bcrypt 安全', 'Socket.io Server\n4 类事件广播\n:8080/ws 统一端口', '4 业务引擎\n告警 · 策略 · AI 决策\nAI 异常检测', '串口网关\nserial-gateway.js\nUART 备用通道'
    ]},
    { y: 2.80, label: '数据存储层\nData Storage', color: C.cyan, items: [
      'MySQL 8.0 :3306\n8 张业务表\nInnoDB + FK 索引', 'InfluxDB 2.x :8086\n4 Measurement\nfloat 字段统一', 'Redis 7 :6379\n去重 · 限流 · 缓存\nAOF 持久化', '数据双写策略\nWebhook → MySQL+InfluxDB\nMQTT 二次写入冗余'
    ]},
    { y: 3.58, label: '网络穿透层\nFRP Tunnel', color: C.orange, items: [
      '阿里云 ECS frps\n47.96.100.108\n控制 :9090', 'WSL Ubuntu frpc\nlocalIP 192.168.32.1\nToken 认证', '端口映射\n:8081 → :8080 后端\n:8080 → :3000 前端', '安全组\n放行 7000/8080/8081\n透明 TCP 代理'
    ]},
    { y: 4.36, label: '云平台层\nHuawei Cloud', color: C.purple, items: [
      'IoTDA cn-north-4\nMQTT 117.78.5.125:1883\n产品 SmartAgriculture', '设备影子\nsmart-001 / smart-002\n实时状态同步', '规则引擎\ndevice.property → report\n→ HTTP POST Webhook', 'IAM Token (20min)\nREST API 命令下发\nStartIrrigation 等'
    ]},
    { y: 5.14, label: '通信层\nCommunication', color: C.blue, items: [
      'WiFi 2.4GHz\n802.11b/g/n · WPA2\nHi3861 仅2.4GHz', 'MQTT QoS 1\n至少一次送达\n$oc/devices/{id}/...', 'HMAC-SHA256\n设备密码认证\noc_mqtt v5 Profile', 'UART 串口备用\nCH340 USB-UART\n115200 baud 8N1'
    ]},
    { y: 5.92, label: '设备层\nHardware', color: C.primary, items: [
      'BearPi #1 smart-001\nSHT30+BH1750+Soil ADC\nE53_IA1 · COM3 · DB:22', 'BearPi #2 smart-002\n+ GPIO_8 继电器水泵\nCOM4/6 · DB:28', 'Hi3861 RISC-V 160MHz\n352KB SRAM · 2MB Flash\nHuawei LiteOS RTOS', '3线程+消息队列\nFlash 4KB 配置存储\nGN+Ninja 编译'
    ]},
  ]

  const labelW = 1.15
  const gap = 0.05
  const cardW = (12.1 - labelW - gap * 5) / 4

  layers.forEach((l) => {
    // Layer label
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.45, y: l.y, w: labelW, h: 0.72,
      fill: { color: l.color }, rectRadius: 0.03
    })
    slide.addText(l.label, {
      x: 0.45, y: l.y, w: labelW, h: 0.72,
      fontSize: 8, fontFace: FONT, bold: true, color: C.white,
      align: 'center', valign: 'middle', lineSpacingMultiple: 1.1
    })

    // Cards
    l.items.forEach((item, i) => {
      const cx = 0.45 + labelW + gap + i * (cardW + gap)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: l.y + 0.02, w: cardW, h: 0.68,
        fill: { color: C.white },
        shadow: { type: 'outer', blur: 2, offset: 0.5, color: '000000', opacity: 0.04 },
        rectRadius: 0.03
      })
      slide.addShape(pptx.ShapeType.rect, {
        x: cx, y: l.y + 0.02, w: cardW, h: 0.025,
        fill: { color: l.color }
      })
      slide.addText(item, {
        x: cx + 0.05, y: l.y + 0.07, w: cardW - 0.1, h: 0.58,
        fontSize: 7, fontFace: FONT, color: C.dark,
        align: 'center', valign: 'middle', lineSpacingMultiple: 1.2
      })
    })
  })

  // Right side: data flow arrows with latency
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 12.2, y: 1.3, w: 0.9, h: 5.3,
    fill: { color: C.dark }
  })
  slide.addText('端\n到\n端\n延\n迟\n<\n1\ns', {
    x: 12.2, y: 1.5, w: 0.9, h: 4.8,
    fontSize: 11, fontFace: FONT, bold: true, color: C.primaryLight,
    align: 'center', valign: 'middle', lineSpacingMultiple: 1.1
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 3: 完整数据链路
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '完整数据链路', '从传感器采集到前端展示的全闭环数据流')

  const steps = [
    { title: '① 嵌入式采集层', items: 'WiFi 2.4GHz · MQTT QoS1\nHMAC-SHA256 认证\n30s 周期 5属性上报', color: C.primary },
    { title: '② 华为云 IoTDA', items: '产品: SmartAgriculture\n设备影子实时同步\n数据转发规则引擎\nIAM Token 身份认证', color: C.blue },
    { title: '③ FRP 穿透', items: '阿里云 ECS frps\nWSL Ubuntu frpc\n:8081 → :8080\n无需公网IP', color: C.orange },
    { title: '④ 业务处理层', items: 'Webhook 接收解析\n双写 MySQL+InfluxDB\n告警/策略/AI引擎\nSocket.io 推送前端', color: C.green },
    { title: '⑤ 展示层', items: 'Vue 3 Dashboard\nECharts 24h 趋势\n实时监控卡片\n毫秒级 DOM 刷新', color: C.red },
  ]

  steps.forEach((s, i) => {
    const sx = 0.4 + i * 2.55
    // Step number circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: sx + 0.85, y: 1.4, w: 0.5, h: 0.5,
      fill: { color: s.color }
    })
    slide.addText(String(i + 1), {
      x: sx + 0.85, y: 1.42, w: 0.5, h: 0.46,
      fontSize: 18, fontFace: FONT, bold: true, color: C.white, align: 'center'
    })

    // Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: 2.05, w: 2.35, h: 2.8,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    slide.addText(s.title, {
      x: sx + 0.12, y: 2.15, w: 2.1, h: 0.4,
      fontSize: 13, fontFace: FONT, bold: true, color: s.color
    })
    slide.addText(s.items, {
      x: sx + 0.12, y: 2.55, w: 2.1, h: 2.2,
      fontSize: 10, fontFace: FONT, color: C.dark, valign: 'top',
      lineSpacingMultiple: 1.5
    })

    // Arrow between steps
    if (i < steps.length - 1) {
      slide.addText('→', {
        x: sx + 2.3, y: 2.8, w: 0.3, h: 0.5,
        fontSize: 20, fontFace: FONT, bold: true, color: C.gray, align: 'center'
      })
    }
  })

  // Bottom: latency chain
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 5.1, w: 12.1, h: 0.04,
    fill: { color: C.lightGray }
  })
  slide.addText('端到端延迟: 采集 30s → MQTT <100ms → IoTDA <200ms → FRP <300ms → 后端 <50ms → InfluxDB <10ms → Socket.io <5ms → 前端DOM <16ms | 总计 < 1s (不含采集周期)', {
    x: 0.6, y: 5.3, w: 12.1, h: 0.5,
    fontSize: 10, fontFace: FONT, color: C.gray, align: 'left'
  })

  // Key metrics at bottom
  const metrics = [
    { label: '采集周期', value: '30s' },
    { label: '上报属性', value: '5项' },
    { label: 'QoS 等级', value: 'QoS 1' },
    { label: '端到端延迟', value: '< 1s' },
    { label: '数据双写', value: 'MySQL+InfluxDB' },
  ]
  metrics.forEach((m, i) => {
    const mx = 0.6 + i * 2.5
    slide.addText(m.label, {
      x: mx, y: 6.0, w: 2.2, h: 0.3,
      fontSize: 9, fontFace: FONT, color: C.gray, align: 'center'
    })
    slide.addText(m.value, {
      x: mx, y: 6.25, w: 2.2, h: 0.35,
      fontSize: 14, fontFace: FONT, bold: true, color: C.primary, align: 'center'
    })
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 4: 硬件平台
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '硬件平台', 'BearPi-HM Nano (Hi3861 RISC-V) + Huawei LiteOS + E53_IA1 传感器扩展板')

  // Left: Specs table
  addTable(slide, 0.6, 1.5, 5.8, 3.2,
    ['组件', '型号/规格', '详细说明'],
    [
      ['主控芯片', 'Hi3861V100', 'RISC-V 32-bit, 160MHz, 352KB SRAM, 2MB Flash'],
      ['操作系统', 'Huawei LiteOS', 'RTOS 实时内核, 多任务调度, 消息队列, 定时器'],
      ['WiFi', '2.4GHz 802.11b/g/n', '仅支持 2.4GHz (Hi3861 不支持 5GHz), WPA2 加密'],
      ['SHT30 (I2C)', 'GPIO_0=SDA, GPIO_1=SCL', '精度 ±0.3°C / ±2%RH, 0-100%RH'],
      ['BH1750 (I2C)', '同 I2C 总线', '量程 1-65535 lux, 数字输出无需校准'],
      ['土壤湿度', '外接 ADC (Ch2)', '模拟量采集 → 百分比转换, 0%干 ↔ 100%湿'],
      ['继电器/水泵', 'GPIO_8 (高电平ON)', 'E53_IA1 板载继电器, 控制 220V 水泵启停'],
      ['状态 LED', 'GPIO_14', '调试指示'],
      ['调试串口', 'CH340 USB-UART', '115200 baud, 8N1, 日志输出 + HiBurn 烧录'],
    ],
    { colW: [1.2, 1.8, 2.8], fontSize: 9 }
  )

  // Right: Device info cards
  const devs = [
    { db: 22, sn: 'BPN-20240001', hw: '..._smart-001', com: 'COM3', fw: 'smart001_fix.bin' },
    { db: 28, sn: 'BPN-20240002', hw: '..._smart-002', com: 'COM4/6', fw: 'smart002_fixed.bin' },
  ]
  devs.forEach((d, i) => {
    const dy = 1.5 + i * 2.5
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.8, y: dy, w: 5.75, h: 2.25,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    slide.addText(`BearPi #${i + 1}`, {
      x: 7, y: dy + 0.1, w: 2, h: 0.35,
      fontSize: 16, fontFace: FONT, bold: true, color: C.primaryDark
    })
    slide.addText(`数据库 ID: ${d.db}  |  设备编号: ${d.sn}\n华为云 ID: ${d.hw}\n串口: ${d.com}  |  固件: ${d.fw}\nWiFi: iqoo11 (2.4GHz)  |  MQTT Server: 117.78.5.125:1883`, {
      x: 7, y: dy + 0.5, w: 5.3, h: 1.5,
      fontSize: 10, fontFace: FONT, color: C.dark, lineSpacingMultiple: 1.5
    })
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 5: 嵌入式固件架构
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '嵌入式固件架构', '3 线程 + 消息队列 · 16 槽位解耦采集与上报 · 华为云 oc_mqtt v5 SDK')

  // Three thread boxes
  const threads = [
    {
      name: 'task_main_entry', color: C.primary,
      desc: '1. WifiConnect(ssid, pwd)\n2. oc_mqtt_init() 华为云 SDK\n3. queue_create("rcvmsg", 16)\n4. oc_mqtt_profile_connect()\n   设备密码认证 → IoTDA\n   注册 msg_rcv_callback\n5. while(1): queue_pop(∞)\n   · en_msg_report → deal_report_msg()\n     oc_mqtt_profile_propertyreport()\n     5 属性上报 (QoS 1)\n   · en_msg_cmd → deal_cmd_msg()\n     StartIrrigation / StopIrrigation\n     SetConfig (云端配网)'
    },
    {
      name: 'task_sensor_entry', color: C.green,
      desc: '1. E53_IA1_Init()\n   I2C 初始化 (GPIO_0, GPIO_1)\n2. SoilMoisture_Init()\n3. while(1):\n   E53_IA1_Read_Data(&data)\n   → Temperature (float °C)\n   → Humidity (float %)\n   → Lux (float)\n   SoilMoisture_Read()\n   → soil (float %)\n   queue_push(app_msg, 5s超时)\n   队列满 → free 丢弃\n   sleep(SENSOR_INTERVAL_SEC=30)'
    },
    {
      name: 'task_config_entry', color: C.blue,
      desc: '仅在 Flash 无有效配置时启动\n配网方式:\n  params:\n    wifi_ssid / wifi_pwd\n    cloud_id / cloud_pwd\n  → Config_Save() 写入 Flash\n  → 提示重启\n  → 重启后加载新配置\n\n云端 SetConfig 命令:\n  前端/后端 → 华为云 REST API\n  → 板子 deal_cmd_msg()\n  → 解析 JSON paras\n  → Config_Save() → 重启'
    },
  ]

  threads.forEach((t, i) => {
    const tx = 0.4 + i * 4.25
    slide.addShape(pptx.ShapeType.roundRect, {
      x: tx, y: 1.3, w: 4.05, h: 4.8,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    slide.addText(t.name, {
      x: tx + 0.15, y: 1.38, w: 3.75, h: 0.38,
      fontSize: 14, fontFace: 'Consolas', bold: true, color: t.color
    })
    slide.addText(t.desc, {
      x: tx + 0.15, y: 1.8, w: 3.75, h: 4.1,
      fontSize: 9, fontFace: 'Consolas', color: C.dark,
      valign: 'top', lineSpacingMultiple: 1.25
    })
  })

  // Bottom: Queue structure
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.3, w: 12.1, h: 0.95,
    fill: { color: C.primaryDark }
  })
  slide.addText('消息队列结构:  app_msg_t { msg_type: enum {cmd, report}, union { cmd_t {request_id}, report_t {temp(int), hum(int), lum(int), soil(float), motor_status(int)} } }  |  数据流: task_sensor → queue_push(x16) → task_main → queue_pop(∞) → deal_report_msg() → oc_mqtt publish QoS1', {
    x: 0.8, y: 6.35, w: 11.7, h: 0.85,
    fontSize: 9, fontFace: 'Consolas', color: C.white, lineSpacingMultiple: 1.3, valign: 'middle'
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 6: Flash 配置存储 + SDK 构建
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'Flash 配置存储 & SDK 构建系统', 'USER_RESERVE 4KB · Magic 校验 · 云端 SetConfig 远程配网 · GN+Ninja 编译')

  // Left: Flash layout + config struct
  addSectionBox(slide, 0.6, 1.5, 6.2, 5.25,
    '💾 Flash 配置存储 (0x1F0000, 4KB)',
    'flash_config_t (372 bytes):\n' +
    '  struct { magic: "SAGC"(0x53414743), version: 1,\n' +
    '    cfg: { wifi_ssid[32], wifi_pwd[32],\n' +
    '           cloud_id[64], cloud_server[32], cloud_port[8] } }\n\n' +
    'Config_Load():  hi_flash_read(0x1F0000, 372B) → magic=="SAGC"?\n' +
    'Config_Save():  hi_flash_erase(0x1F0000, 4096B)\n' +
    '                → hi_flash_write(0x1F0000, 372B) → "saved OK"\n\n' +
    'Flash 无效时 → 从 config.h 硬编码默认值填充\n\n' +
    '关键技术点:\n' +
    '• hi_flash_write() 直写绕过文件系统层 (避免 #8 Bug)\n' +
    '• 512B → 4KB sector 对齐 (最小擦除单位)\n' +
    '• 云端 SetConfig 命令: REST API → 板子 deal_cmd_msg()\n' +
    '  → 解析 4 参数 → Config_Save() → 重启生效\n' +
    '• 彻底摆脱串口配网，实现零接触远程部署',
    { fontSize: 9 }
  )

  // Right: SDK build system
  addSectionBox(slide, 7.1, 1.5, 5.7, 3.0,
    '🔨 SDK 构建系统 (GN + Ninja)',
    'SDK:  D:\\bearpi-hm_nano (Windows) → WSL /mnt/d/bearpi-hm_nano\n' +
    '构建: GN (Generate Ninja) + Ninja 快速增量编译\n' +
    '编译器: riscv32-unknown-elf-gcc 7.3.0 (RISC-V 交叉编译)\n' +
    '产品配置: build/lite/product/BearPi-HM_Nano.json\n' +
    '  → board: hi3861v100, kernel: liteos_riscv\n\n' +
    '华为云 SDK: third_party/iot_link/oc_mqtt/\n' +
    '  ├ oc_mqtt_al/          MQTT 抽象层\n' +
    '  ├ oc_mqtt_profile_v5/  属性模型 v5\n' +
    '  └ paho_mqtt/           底层 MQTT 协议栈\n\n' +
    '源码: applications/BearPi/BearPi-HM_Nano/\n' +
    '       sample/smart_ag_cloud/',
    { fontSize: 9 }
  )

  // Build outputs
  addSectionBox(slide, 7.1, 4.75, 5.7, 2.0,
    '📦 编译产物 & 烧录',
    '产物 (~821KB):\n' +
    '  • Hi3861_wifiiot_app_burn.bin  烧录用镜像 (~821KB)\n' +
    '  • Hi3861_wifiiot_app_ota.bin   OTA 升级包 (~490KB)\n' +
    '  • Hi3861_wifiiot_app_allinone.bin  全量镜像\n\n' +
    '烧录工具: HiBurn (Windows GUI)\n' +
    '  连接: USB Type-C → CH340 虚拟串口\n' +
    '  设置: COM端口 + 921600 baud → Auto burn\n' +
    '  → 按板子 RESET → "Execution Successful"\n' +
    '编译时间: ~30-60s (增量) / ~3min (全量)',
    { fontSize: 9 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 7: 关键 Bug 修复
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '关键 Bug 修复 (10项)', '从硬件驱动 → 通信协议 → 数据格式 → 云平台对接，全链路排查与修复')

  addTable(slide, 0.4, 1.5, 12.5, 5.2,
    ['#', '现象', '根因分析', '修复方案'],
    [
      ['1', 'APP_FEATURE_INIT 阶段\nprintf 导致 HardFault', 'Hi3861 启动阶段调用 printf\n触发未初始化的 UART 外设', '延迟 printf 到系统就绪后,\n用 osDelay 等待 UART 初始化'],
      ['2', '电机上电误转', 'RELAY_ACTIVE_LOW 宏设为 1\n(低电平有效)', '改为 RELAY_ACTIVE_LOW=0\n(高电平有效)'],
      ['3', 'E53_IA1_IO_Init 覆盖\nGPIO_8 (继电器)', '传感器初始化函数中调用\nRelay_Init() 重复初始化 GPIO', 'Relay_Init() 自包含,\n解除与传感器初始化耦合'],
      ['4', '数据入库全 null', 'Webhook 解析仅匹配\nsnake_case 属性名', '兼容 PascalCase/camelCase/\nsnake_case 三段式属性匹配'],
      ['5', '命令执行无响应', '设备端原用 device.property\n→ report, 华为云不转发', '改为 device.property → report\n→ HTTP Webhook 标准转发规则'],
      ['6', 'WiFi 连接失败', 'Hi3861 仅支持 2.4GHz,\n路由器为 5GHz', '更换 2.4GHz 热点 (iqoo11),\n确认设备只能在 2.4GHz 环境'],
      ['7', '串口配置崩溃', 'getchar() 在 Hi3861 上不可用,\n阻塞整个线程', '改为云端 SetConfig 命令配网,\n串口仅输出调试日志'],
      ['8', 'Flash 写入崩溃', '命令处理线程中调用\n文件系统 API 导致异常', '改用 hi_flash_write() 直写,\n绕过文件系统层'],
      ['9', 'strcmp(NULL) 崩溃', 'cJSON_GetStringValue 对\n不存在的字段返回 NULL', '所有 cJSON 解析后\n增加 NULL 检查防护'],
      ['10', 'REST API 401/403/404', 'Endpoint 用了基础版 +\nIAM 用户缺 IoTDA 权限', '改用 iotda-app endpoint +\n授予 IoTDA FullAccess 策略'],
    ],
    { colW: [0.4, 2.8, 3.2, 3.2], fontSize: 8 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 8: 前端应用总览
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '前端应用', 'Vue 3 + Vite + Element Plus + ECharts + Socket.io · 10 个功能页面 · 企业级 B 端设计')

  // Page grid
  const pages = [
    { name: '仪表盘 Dashboard', desc: '4 统计卡片 + 24h ECharts\n趋势折线图 · 设备概览', color: C.primary },
    { name: '实时监控 Monitor', desc: '设备卡片网格 · 5项传感器\n实时数据 · 灌溉开关控制', color: C.blue },
    { name: '设备管理 Devices', desc: '设备 CRUD · 串口绑定\n华为云绑定 · 在线状态', color: C.green },
    { name: '地块管理 Plots', desc: '地块 CRUD · 种植作物\n面积关联灌溉策略', color: C.orange },
    { name: '策略配置 Strategies', desc: '阈值条件 · 灌溉时长\n冷却间隔 · 启用/禁用', color: C.red },
    { name: '定时任务 Schedules', desc: 'Cron 表达式定时灌溉\n任务 CRUD · 启停控制', color: '7C3AED' },
    { name: '灌溉记录 Logs', desc: '历史灌溉列表 · 分页筛选\n状态: running/completed/stopped', color: '0891B2' },
    { name: '告警中心 Alerts', desc: '告警列表 · 级别: info/warn/critical\n标记已处理 · 实时推送', color: 'DB2777' },
    { name: 'AI 助手 AI Chat', desc: 'MiMo AI 对话 · 智能问答\n灌溉建议 · 故障诊断', color: '4F46E5' },
    { name: '系统设置 Settings', desc: '用户管理 · 系统参数\nWebhook 配置 · 日志查看', color: C.gray },
  ]

  pages.forEach((p, i) => {
    const col = i % 5
    const row = Math.floor(i / 5)
    const px = 0.4 + col * 2.55
    const py = 1.5 + row * 2.75

    slide.addShape(pptx.ShapeType.roundRect, {
      x: px, y: py, w: 2.35, h: 2.5,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    // Color bar at top
    slide.addShape(pptx.ShapeType.rect, {
      x: px, y: py, w: 2.35, h: 0.06,
      fill: { color: p.color }
    })
    slide.addText(p.name, {
      x: px + 0.12, y: py + 0.18, w: 2.1, h: 0.45,
      fontSize: 12, fontFace: FONT, bold: true, color: C.dark
    })
    slide.addText(p.desc, {
      x: px + 0.12, y: py + 0.7, w: 2.1, h: 1.6,
      fontSize: 9, fontFace: FONT, color: C.gray, valign: 'top', lineSpacingMultiple: 1.4
    })
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 9: 前端技术选型
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '前端技术选型', '现代化前端技术栈 · 企业级组件库 · 实时通信 · 数据可视化')

  const stacks = [
    { category: '框架 & 构建', color: C.primary, items: [
      'Vue 3 Composition API',
      'Vite 5 开发服务器 (HMR <1s)',
      'ES Module 原生支持',
      '按需编译 · 极速冷启动',
    ]},
    { category: '状态 & 路由', color: C.blue, items: [
      'Pinia Store 响应式状态',
      'mqttStore.latestData[sn] 实时索引',
      'Vue Router 4 路由守卫',
      'beforeEach JWT 验证',
    ]},
    { category: 'UI & 图表', color: C.green, items: [
      'Element Plus 企业级组件库',
      'El-Table · El-Form · El-Dialog',
      'Vue-ECharts 数据可视化',
      '24h 传感器趋势图 · 实时刷新',
    ]},
    { category: '通信 & 安全', color: C.orange, items: [
      'Socket.io WebSocket 实时推送',
      'ws://localhost:8080/ws 统一端口',
      'Axios 拦截器 · 自动注入 Bearer Token',
      '401 → 清除 token → 跳转 /login',
    ]},
  ]

  stacks.forEach((s, i) => {
    const sx = 0.4 + i * 3.2
    addSectionBox(slide, sx, 1.5, 3.0, 3.2, s.category,
      s.items.map(t => `• ${t}`).join('\n'),
      { titleColor: s.color, fontSize: 11 }
    )
  })

  // Bottom: Architecture summary
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 5.0, w: 12.1, h: 1.7,
    fill: { color: C.white },
    shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
    rectRadius: 0.06
  })
  slide.addText('项目结构', {
    x: 0.8, y: 5.08, w: 2, h: 0.35,
    fontSize: 13, fontFace: FONT, bold: true, color: C.primary
  })
  slide.addText(
    'frontend/\n' +
    '├── src/views/          # 页面组件 (10个)\n' +
    '│   ├── dashboard/      DashboardView.vue    仪表盘 (统计卡片 + 24h趋势)\n' +
    '│   ├── monitor/        MonitorView.vue      实时监控 (传感器卡片 + 灌溉控制)\n' +
    '│   ├── devices/        DevicesView.vue      设备管理 (CRUD + 串口/华为云绑定)\n' +
    '│   ├── plots/          PlotsView.vue        地块管理 (种植作物/面积)\n' +
    '│   ├── strategies/     StrategiesView.vue   策略配置 (阈值/时长/冷却)\n' +
    '│   ├── schedules/      SchedulesView.vue    定时任务 (Cron表达式)\n' +
    '│   ├── irrigation-logs/ IrrigationLogsView.vue  灌溉记录审计\n' +
    '│   ├── alerts/         AlertsView.vue       告警中心 (实时推送)\n' +
    '│   ├── ai-chat/        AiChatView.vue       AI助手 (MiMo对话)\n' +
    '│   └── settings/       SettingsView.vue     系统设置\n' +
    '├── src/router/         Vue Router 4 路由配置\n' +
    '├── src/stores/         Pinia (auth + mqtt)\n' +
    '└── src/layouts/        MainLayout.vue (侧边栏 + 顶栏)',
    { x: 0.8, y: 5.4, w: 11.7, h: 1.2, fontSize: 8, fontFace: 'Consolas', color: C.dark, valign: 'top', lineSpacingMultiple: 1.15 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 10: 实时 WebSocket 通信
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'Socket.io WebSocket 实时通信', '全双工 WebSocket · 统一端口 8080 · 4 类事件推送 · 毫秒级 DOM 刷新')

  // Architecture diagram boxes
  slide.addText('前端 Socket.io Client', {
    x: 0.6, y: 1.5, w: 3.5, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true, color: C.white,
    fill: { color: C.blue }, align: 'center'
  })
  slide.addText('① mqttStore.connect()\n② io("ws://localhost:8080", {path:"/ws"})\n③ socket.emit("subscribe:device", sn)\n④ socket.on("sensor:data", handler)\n⑤ latestData[sn] = {...}  → UI 刷新', {
    x: 0.6, y: 1.95, w: 3.5, h: 2.2,
    fontSize: 9, fontFace: 'Consolas', color: C.dark, valign: 'top',
    fill: { color: C.white }, lineSpacingMultiple: 1.6
  })

  slide.addText('↔', {
    x: 4.2, y: 2.5, w: 1, h: 0.5,
    fontSize: 28, fontFace: FONT, bold: true, color: C.primary, align: 'center'
  })

  slide.addText('Socket.io Server (8080/ws)', {
    x: 5.0, y: 1.5, w: 3.5, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true, color: C.white,
    fill: { color: C.primaryDark }, align: 'center'
  })
  slide.addText('createWsServer(httpServer)\n• io.on("connection") → join room\n• broadcastSensorData() → io.emit()\n• broadcastSensorFault()\n• broadcastAlert()\n• broadcastIrrigation()', {
    x: 5.0, y: 1.95, w: 3.5, h: 2.2,
    fontSize: 9, fontFace: 'Consolas', color: C.dark, valign: 'top',
    fill: { color: C.white }, lineSpacingMultiple: 1.6
  })

  slide.addText('↔', {
    x: 8.6, y: 2.5, w: 1, h: 0.5,
    fontSize: 28, fontFace: FONT, bold: true, color: C.primary, align: 'center'
  })

  slide.addText('事件触发源', {
    x: 9.4, y: 1.5, w: 3.5, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true, color: C.white,
    fill: { color: C.green }, align: 'center'
  })
  slide.addText('Webhook → checkAlerts()\nWebhook → checkAnomalies()\nWebhook → runStrategies()\nirrigationEmitter.on("autoIrrigate")\nsetBrokerRef() 桥接适配器', {
    x: 9.4, y: 1.95, w: 3.5, h: 2.2,
    fontSize: 9, fontFace: 'Consolas', color: C.dark, valign: 'top',
    fill: { color: C.white }, lineSpacingMultiple: 1.6
  })

  // Event types table
  addTable(slide, 0.6, 4.5, 12.1, 2.0,
    ['事件类型', '事件名', '触发条件', '数据内容', '前端处理'],
    [
      ['传感器数据', 'sensor:data', 'Webhook 数据入库后', 'device_sn + 5项传感器值\n+ timestamp', 'mqttStore.latestData[sn]\n→ MonitorView 实时刷新'],
      ['传感器故障', 'sensor:fault', 'cleanPayload 检测故障码\n(999/998)', 'device_sn + faults[]\n+ device_name', 'Dashboard 红色告警\n→ AlertsView 列表'],
      ['新告警', 'alert:new', 'alert-engine 阈值超出\n+ 30min 冷却检查', 'alert_type + level\n+ message', 'AlertsView 追加\n+ ElNotification 弹窗'],
      ['灌溉状态', 'irrigation:status', '灌溉开始/停止\n(started/stopped)', 'device_sn + status\n+ duration_sec', 'MonitorView 按钮状态\n+ 倒计时显示'],
    ],
    { colW: [1.4, 1.5, 2.6, 2.8, 2.8], fontSize: 9 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 11: 灌溉控制逻辑
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '灌溉控制逻辑', '前端 → 后端 → 华为云 REST API → 板子 → GPIO_8 → 水泵 · 服务端 setTimeout 兜底')

  addSectionBox(slide, 0.6, 1.5, 6.2, 5.2,
    '🖱️ 前端交互 (MonitorView.vue)',
    'irrigateDuration[deviceId]  →  v-model 双向绑定\n' +
    'irrigateState[deviceId]     →  { running, loading, timerId }\n\n' +
    'async handleStartIrrigate(device):\n' +
    '  → POST /api/v1/devices/:id/irrigate/start\n' +
    '  → irrigateState[id] = { running: true }\n' +
    '  → 按钮切换为 "停止" (type="danger")\n' +
    '  → 前端定时器: setTimeout(stopIrrigation, dur*1000)\n' +
    '     → 到期自动调用 stop API (UI 即时反馈)\n\n' +
    'async handleStopIrrigate(device):\n' +
    '  → POST /api/v1/devices/:id/irrigate/stop\n' +
    '  → clearTimeout(timerId)\n' +
    '  → irrigateState[id] = { running: false }\n\n' +
    '模板渲染:\n' +
    '  v-if="!irrigateState[id]?.running"  → 开始按钮 (带loading)\n' +
    '  v-else type="danger"                → 停止按钮\n' +
    '  v-for device in devices  →  5项传感器实时数据\n' +
    '  {{ getVal(device_sn, "soil_moisture") }}% 等',
    { fontSize: 9 }
  )

  addSectionBox(slide, 7.1, 1.5, 5.7, 2.8,
    '⚡ 后端处理 & 命令下发 (3级优先级)',
    '优先级1: 华为云 REST API (主力)\n' +
    '  IAM Token (缓存20min) → POST /v5/iot/{project}/\n' +
    '  devices/{id}/commands  { name:"StartIrrigation",\n' +
    '  service_id:"SmartAgriculture", paras:{duration_sec} }\n' +
    '  → 板子 oc_mqtt 接收 → deal_cmd_msg()\n' +
    '  → Relay_On() + osTimerStart(1000ms)\n\n' +
    '优先级2: UART 串口 (备用)\n' +
    '  connection_type==uart && com_port存在 && REST失败\n' +
    '  → serialManager.sendCommand(com_port, "pump_on", N)\n\n' +
    '优先级3: 内部 MQTT (兜底)\n' +
    '  前两级不可用时: brokerRef.publish({topic:"cmd/{sn}/pump"})',
    { fontSize: 9 }
  )

  addSectionBox(slide, 7.1, 4.55, 5.7, 2.15,
    '🛡️ 服务端 setTimeout 自动停止 (兜底)',
    'setTimeout(async () => {\n' +
    '  // 1. 检查 irrigation_logs 状态是否为 running\n' +
    '  // 2. 下发停止指令 (优先 REST API, fallback UART/MQTT)\n' +
    '  // 3. UPDATE irrigation_logs\n' +
    '  //    SET status="completed", duration_sec=...,\n' +
    '  //        water_used_l = duration_sec × water_flow_rate\n' +
    '}, duration_sec * 1000)\n\n' +
    '即使前端关闭、网络断开，水泵一定会在指定时长后停止！\n\n' +
    '灌溉水量自动计算:  water_used_l = duration_sec × rate (L/s)\n' +
    '灌溉停止时:  UPDATE end_time=NOW(), water_used_l=自动计算',
    { fontSize: 9, titleColor: C.red }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 12: MySQL 数据库设计
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'MySQL 数据库设计', 'MySQL 8.0 InnoDB · 8 张业务表 · 完整 ER 模型 · 索引优化')

  addTable(slide, 0.3, 1.5, 12.7, 5.0,
    ['分类', '表名', '核心字段', '说明'],
    [
      ['用户 & 权限', 'users', 'id, username, password(bcrypt),\nreal_name, role(admin/operator),\nphone, email, status', 'admin / admin123\nJWT 签发给 userId'],
      ['设备 & 地块\n(主数据)', 'devices', 'id, device_sn(UQ), device_name,\ndevice_type, firmware_ver,\nconnection_type, com_port,\nhuawei_device_id, plot_id(FK),\nonline_status, last_online_at', 'huawei_device_id 关联华为云设备\ncom_port 关联物理串口\nplot_id 关联灌溉策略'],
      ['', 'plots', 'id, plot_name, crop_type,\narea_sqm', '地块 CRUD\n策略关联依托地块'],
      ['时序 & 事务\n(核心业务)', 'sensor_data\n(大表)', 'id, device_id(FK), soil_moisture,\nsoil_temp, air_temp, air_humidity,\nlight, created_at', '每次 Webhook 回调写入\n~10条/天/设备\n建议按月 RANGE 分区'],
      ['', 'irrigation_logs', 'id, device_id, strategy_id,\ntrigger_type(manual/auto),\noperator_id, start_time,\nend_time, duration_sec,\nwater_used_l(自动计算),\nstatus(running/completed/stopped)', '灌溉执行审计\nwater_used_l = duration_sec ×\nwater_flow_rate 自动计算'],
      ['规则 & 事件\n(自动化)', 'irrigation_\nstrategies', 'id, plot_id(FK), strategy_name,\nhumidity_min/max, temp_min/max,\nirrigation_duration_max(1800s),\ncooldown_interval(3600s),\nwater_flow_rate, enabled', '阈值条件 + 灌溉时长\n+ 冷却间隔\n策略引擎自动触发'],
      ['', 'alerts', 'id, device_id, alert_type,\nalert_level(info/warn/critical),\nmessage, resolved, resolved_at', '告警引擎 30min 冷却\nWebSocket 实时推送前端'],
      ['', 'scheduled_\ntasks', 'id, device_id, cron_expr,\naction, duration_sec, enabled', 'Cron 表达式定时任务\nnode-cron 调度'],
    ],
    { colW: [1.5, 1.8, 4.0, 3.4], fontSize: 8 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 13: 索引策略 & 数据双写
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '数据双写机制 & 索引策略 & 大表归档', '冗余保障 · 覆盖查询 · 自动计算 · 容量规划')

  addSectionBox(slide, 0.6, 1.5, 3.9, 3.0,
    '📝 双写保障机制',
    '每条传感器数据写入两次:\n\n' +
    '1. huawei-callback.js\n' +
    '   Webhook 接收 → 首次 INSERT\n' +
    '   → sensor_data + InfluxDB\n\n' +
    '2. mqtt-broker.js\n' +
    '   broker.on("publish") 触发\n' +
    '   → 二次 INSERT (冗余)\n\n' +
    '目的: 华为云 Webhook 偶发丢失时\n' +
    'MQTT 直接订阅作为备份通道',
    { fontSize: 10 }
  )

  addSectionBox(slide, 4.8, 1.5, 3.9, 3.0,
    '🔍 索引策略',
    'sensor_data (大表):\n' +
    '  KEY idx_device_time (device_id, created_at)\n' +
    '  → 覆盖查询: 指定设备+时间范围\n\n' +
    'irrigation_logs:\n' +
    '  KEY idx_device_start (device_id, start_time)\n' +
    '  KEY idx_status (status)\n' +
    '  → 快速查运行中的灌溉\n\n' +
    '其他表: FK 字段均建索引\n' +
    '主键: 自增 ID',
    { fontSize: 10 }
  )

  addSectionBox(slide, 9.0, 1.5, 3.9, 3.0,
    '📊 大表归档策略',
    'sensor_data 容量预估:\n' +
    '  ~10条/天/设备 × 2设备\n' +
    '  = ~600条/月 = ~7200条/年\n\n' +
    '建议:\n' +
    '• 按月 RANGE 分区\n' +
    '  PARTITION BY RANGE\n' +
    '  (TO_DAYS(created_at))\n' +
    '• 超过 1 年的数据归档到\n' +
    '  历史表或离线存储\n\n' +
    '灌溉水量自动计算:\n' +
    '  water_used_l =\n' +
    '  duration_sec × water_flow_rate\n' +
    '  (L/s 单位) — 无需人工干预',
    { fontSize: 10 }
  )

  addSectionBox(slide, 0.6, 4.8, 12.3, 1.9,
    '🔄 Webhook 数据接收完整中间件链',
    'webhookAuth (验签) → webhookIdempotent (去重: SHA256 request_id, Redis SET NX EX 300) → cleanPayload (清洗: 故障码 999/998 拦截, 物理边界校验, PascalCase/camelCase/snake_case 兼容)\n' +
    '→ writeSensorData (双写入库: MySQL sensor_data + InfluxDB sensor_data measurement) → checkAlerts (阈值检查, 30min 冷却) + checkAnomalies (Z-Score 异常检测) + runStrategies (自动灌溉触发)\n' +
    '→ broadcastSensorData (Socket.io 推送前端) · 属性兼容: soil_moisture ← soil_moisture ?? SoilMoisture ?? soil_moisture_val  ·  air_temp ← air_temperature ?? Temperature ?? air_temp',
    { fontSize: 9, titleColor: C.primary }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 14: InfluxDB 时序数据库
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'InfluxDB 时序数据库', 'InfluxDB 2.x · 4 个 Measurement · 下采样聚合 · 自动过期 · float 字段统一')

  addTable(slide, 0.4, 1.5, 12.5, 2.5,
    ['Measurement', '字段', 'Tags', '写入策略', '说明'],
    [
      ['sensor_data', 'soil_moisture / soil_temp /\nair_temp / air_humidity / light\n(全部 float 类型!)', 'device_id + device_sn', '30s 周期写入\nwritePoint() 强制 floatField', '5 个 float 字段\n数值类型统一修复\n避免 integer/float 冲突'],
      ['irrigation_logs', 'trigger_type (manual/auto/\nscheduled) / duration_sec /\nwater_used_l / remark', 'device_id + device_sn\n+ strategy_id', '灌溉开始/停止时写入\nwater_used_l 自动计算', '灌溉记录审计\n关联 strategy_id\n+ operator_id'],
      ['alerts', 'alert_type / alert_level\n(info/warning/danger) /\nmessage / resolved', 'device_id + device_sn', '阈值触发时写入\n30min 冷却防重复', '告警事件记录\nWebSocket 实时推送'],
      ['ai_anomalies', 'anomaly_type / field_name /\ncurrent_value / z_score /\nseverity / expected_range', 'device_id + anomaly_type', 'Z-Score 检测触发\n30min 冷却', 'AI 异常检测结果\n关联 anomaly_type\n+ field_name'],
    ],
    { colW: [1.7, 3.2, 2.0, 2.8, 2.8], fontSize: 9 }
  )

  addSectionBox(slide, 0.6, 4.3, 6.2, 2.5,
    '⚙️ 关键配置 & 修复',
    '• Float 字段类型统一: 之前混用 integer/float 导致写入冲突,\n' +
    '  修改 influxdb.js 和 huawei-callback.js,\n' +
    '  writePoint() 中所有数值字段强制使用 floatField 方法\n' +
    '• 下采样聚合: 30s 原始 → 1m mean → 1h mean → 1d mean\n' +
    '  保留策略: 原始 30d, 1m 聚合 90d, 1h 聚合 365d\n' +
    '• 自动过期: InfluxDB bucket retention 自动清理过期数据\n' +
    '• 查询示例: range(-2h) → aggregateWindow(1m, mean)\n' +
    '  → 用于 AI 决策引擎和异常检测的 2h 聚合窗口',
    { fontSize: 10 }
  )

  addSectionBox(slide, 7.1, 4.3, 5.7, 2.5,
    '📈 数据流与查询模式',
    '写入路径:\n' +
    '  huawei-callback.js  →  influxdb.writePoint()\n' +
    '  mqtt-broker.js      →  influxdb.writePoint() (冗余)\n\n' +
    '查询路径:\n' +
    '  GET /api/v1/devices/:id/data/latest    → last()\n' +
    '  GET /api/v1/devices/:id/data/history   → range()\n' +
    '  ai-decision-engine   → 2h 聚合 + 线性回归斜率\n' +
    '  anomaly-detector     → 2h mean + stddev → Z-Score\n' +
    '  dashboard/trends-24h → range(-24h) → aggregateWindow\n\n' +
    '库名: smart_ag_iot  |  org: smart_ag\n' +
    'token: smart_ag_token (Docker Compose 环境变量)',
    { fontSize: 10 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 15: 后端服务总览
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '后端服务', 'Node.js 22 + Express + Socket.io WebSocket + 华为云 SDK · 11 API 模块 · FRP 内网穿透')

  // Architecture layers
  const layers = [
    { label: '路由层 (11 模块)', color: C.primary, modules: [
      'auth.js', 'devices.js', 'dashboard.js', 'plots.js',
      'strategies.js', 'schedules.js', 'irrigation-logs.js',
      'alerts.js', 'export.js', 'huawei-callback.js', 'ai.js'
    ]},
    { label: '业务逻辑层', color: C.blue, modules: [
      'huawei-iot.js (IAM Token → REST API 命令下发)',
      'ws-server.js (Socket.io 实时推送)',
      'alert-engine.js (告警阈值检查, 30min 冷却)',
      'strategy-engine.js (自动灌溉触发, 冷却间隔)',
      'serial-gateway.js (UART 串口备用通信)',
    ]},
    { label: 'AI 引擎层', color: C.green, modules: [
      'ai/chat-handler.js (MiMo AI 对话)',
      'ai/ai-decision-engine.js (智能灌溉决策)',
      'ai/anomaly-detector.js (Z-Score 异常检测)',
      'ai/feature-extractor.js (特征工程: 线性回归斜率)',
    ]},
    { label: '数据访问层', color: C.orange, modules: [
      'db.js (MySQL 连接池 + 表初始化)',
      'influxdb.js (InfluxDB 2.x 读写)',
      'redis.js (Redis 7: 去重/限流/缓存)',
    ]},
  ]

  layers.forEach((l, i) => {
    const ly = 1.5 + i * 1.35
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: ly, w: 2.2, h: 1.15,
      fill: { color: l.color }
    })
    slide.addText(l.label, {
      x: 0.7, y: ly, w: 2.0, h: 1.15,
      fontSize: 11, fontFace: FONT, bold: true, color: C.white,
      align: 'center', valign: 'middle'
    })
    slide.addText(l.modules.map(m => `  ${m}`).join('\n'), {
      x: 3.0, y: ly + 0.1, w: 9.8, h: 0.95,
      fontSize: 9, fontFace: 'Consolas', color: C.dark, valign: 'middle',
      lineSpacingMultiple: 1.3
    })
  })

  // Bottom: FRP tunnel
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.65, w: 12.1, h: 0.55,
    fill: { color: C.primaryDark }
  })
  slide.addText('FRP 隧道: 阿里云 ECS 47.96.100.108 (frps) ←→ WSL Ubuntu (frpc)  |  :8081→:8080(后端/Webhook) :8080→:3000(前端)  |  Token 认证  |  安全组放行 7000/8080/8081', {
    x: 0.8, y: 6.68, w: 11.7, h: 0.5,
    fontSize: 10, fontFace: FONT, color: C.white, align: 'center', valign: 'middle'
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 16: API 路由规格
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'API 路由详细规格', 'Base URL: /api/v1 · JWT Authorization: Bearer <token> · Content-Type: application/json')

  addTable(slide, 0.2, 1.4, 12.9, 5.3,
    ['模块', '认证', '端点', '功能说明'],
    [
      ['auth', '无', 'POST /login\nGET /me', '登录返回 {token, user}\n获取当前用户信息'],
      ['devices', 'JWT', 'GET/POST/PUT/:id/DELETE/:id\nGET /:id/data/latest\nGET /:id/data/history\nPUT /:id/serial-port\nDELETE /:id/serial-port\nPUT /:id/huawei-bind\nDELETE /:id/huawei-bind\nPOST /:id/irrigate/start\nPOST /:id/irrigate/stop', '完整 CRUD\n最新数据 + 历史数据查询\n串口动态绑定/解绑\n华为云设备ID绑定/解绑\n灌溉控制 (核心功能)'],
      ['dashboard', 'JWT', 'GET /stats\nGET /trends-24h\nGET /devices-latest', '统计: 在线设备数/今日灌溉次数/总用水量\n24h 趋势数据\n所有设备最新数据'],
      ['plots', 'JWT', 'GET / · GET /:id\nPOST / · PUT /:id\nDELETE /:id', '地块 CRUD (种植作物、面积)'],
      ['strategies', 'JWT', 'GET / · GET /:id\nPOST / · PUT /:id\nDELETE /:id', '灌溉策略 CRUD (阈值、时长、冷却)'],
      ['irrigation-logs', 'JWT', 'GET / (分页+筛选)', '灌溉记录审计查询 (按设备/时间/类型)'],
      ['alerts', 'JWT', 'GET / · PUT /:id/resolve', '告警列表 + 标记已处理'],
      ['schedules', 'JWT', 'GET / · POST /\nPUT /:id · DELETE /:id', '定时任务 CRUD (Cron 表达式)'],
      ['export', 'JWT', 'GET /sensor-data (CSV)\nGET /irrigation-logs (CSV)', '数据导出 CSV 格式'],
      ['huawei', '无', 'POST /data', '华为云 Webhook 回调入口 (免认证)'],
      ['ai', 'JWT', 'POST /chat\nPOST /decision\nGET /anomalies', 'AI 对话 (MiMo)\nAI 灌溉决策\nAI 异常记录查询'],
    ],
    { colW: [1.5, 0.7, 4.2, 4.5], fontSize: 8 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 17: Webhook 数据接收流程
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'Webhook 数据接收完整流程', '华为云 IoTDA → FRP 穿透 → 后端中间件链 → 双写入库 → 自动化触发 → Socket.io 推送')

  const flowSteps = [
    { num: '1', title: '华为云转发', desc: '设备属性上报后\n转发规则匹配\nHTTP POST JSON\nnotify_data.header\n+ body.services[]', color: C.primary },
    { num: '2', title: 'FRP 穿透', desc: '47.96.100.108:8081\nfrps 接收 → 转发\nfrpc → localhost:8080\n透明 TCP 代理', color: C.blue },
    { num: '3', title: '中间件链', desc: 'webhookAuth 验签\nwebhookIdempotent 去重\ncleanPayload 清洗\n→ 兼容 3 种属性命名', color: C.orange },
    { num: '4', title: '双写入库', desc: 'MySQL sensor_data\nInfluxDB sensor_data\nwritePoint() 强制\nfloat 字段类型', color: C.green },
    { num: '5', title: '自动化触发', desc: 'checkAlerts() 阈值检查\ncheckAnomalies() Z-Score\nrunStrategies() 自动灌溉\n30min 冷却机制', color: C.red },
    { num: '6', title: 'Socket.io 推送', desc: 'broadcastSensorData()\n→ io.emit("sensor:data")\n→ 前端实时刷新\nms 级 DOM 更新', color: '7C3AED' },
  ]

  flowSteps.forEach((s, i) => {
    const fx = 0.3 + i * 2.2
    // Circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: fx + 0.65, y: 1.5, w: 0.55, h: 0.55,
      fill: { color: s.color }
    })
    slide.addText(s.num, {
      x: fx + 0.65, y: 1.5, w: 0.55, h: 0.55,
      fontSize: 18, fontFace: FONT, bold: true, color: C.white, align: 'center', valign: 'middle'
    })
    slide.addText(s.title, {
      x: fx + 0.05, y: 2.15, w: 1.9, h: 0.4,
      fontSize: 12, fontFace: FONT, bold: true, color: s.color, align: 'center'
    })
    slide.addText(s.desc, {
      x: fx + 0.05, y: 2.55, w: 1.9, h: 2.0,
      fontSize: 9, fontFace: FONT, color: C.dark, align: 'center',
      lineSpacingMultiple: 1.4, valign: 'top'
    })

    // Arrow
    if (i < flowSteps.length - 1) {
      slide.addText('→', {
        x: fx + 1.95, y: 2.8, w: 0.3, h: 0.5,
        fontSize: 18, fontFace: FONT, bold: true, color: C.gray, align: 'center'
      })
    }
  })

  // Bottom code snippet
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 4.85, w: 12.1, h: 1.85,
    fill: { color: C.dark }
  })
  slide.addText(
    '// huawei-callback.js 属性兼容逻辑\n' +
    'if (body.notify_data) {                              // 标准格式\n' +
    '  huaweiDeviceId = body.notify_data.header.device_id\n' +
    '  for (const svc of body.notify_data.body.services) Object.assign(properties, svc.properties || svc)\n' +
    '} else {\n' +
    '  huaweiDeviceId = body.device_id\n' +
    '  properties = body.data || body.properties || body   // 兼容多种格式\n' +
    '}\n' +
    '// 规范化属性名 (兼容 PascalCase / camelCase / snake_case)\n' +
    'payload.soil_moisture = properties.soil_moisture ?? properties.SoilMoisture ?? properties.soil_moisture_val ?? null\n' +
    'payload.air_temp      = properties.air_temperature ?? properties.Temperature ?? properties.air_temp ?? null',
    { x: 0.8, y: 4.92, w: 11.7, h: 1.7, fontSize: 8, fontFace: 'Consolas', color: 'A7F3D0', lineSpacingMultiple: 1.2, valign: 'top' }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 18: 命令下发 (3级优先级)
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '命令下发 (3级优先级 + 自动停止兜底)', '华为云 REST API (主力) → UART 串口 (备用) → 内部 MQTT (兜底) · 服务端 setTimeout 强制停止')

  // Priority 1
  addSectionBox(slide, 0.6, 1.5, 6.2, 3.4,
    '⭐ 优先级1: 华为云 REST API 命令下发',
    '流程:\n' +
    '1. IAM 用户 x1ng → POST iam.cn-north-4.../v3/auth/tokens\n' +
    '   → 获取 X-Subject-Token (缓存 20 分钟，过期自动刷新)\n' +
    '2. POST https://723391561e.st1.iotda-app.cn-north-4.myhuaweicloud.com\n' +
    '   /v5/iot/bd52d1199df7453a8eb21012858ae358/devices/{deviceId}/commands\n' +
    '3. Body: { "name":"StartIrrigation", "service_id":"SmartAgriculture",\n' +
    '           "paras":{"duration_sec":30, "_cmd":"StartIrrigation"} }\n' +
    '4. 板子 oc_mqtt 接收 MQTT 消息 → msg_rcv_callback()\n' +
    '   → deal_cmd_msg() 解析 JSON → strcmp("StartIrrigation")\n' +
    '   → StartIrrigation(duration) → Relay_On() + osTimerStart(1000ms)\n' +
    '5. 每秒 IrrigationTimerCallback: g_irrigation_remaining--\n' +
    '   归零 → Relay_Off() → osTimerStop()\n' +
    '6. INSERT irrigation_logs (status=running → completed)\n\n' +
    '技术要点:\n' +
    '• paras._cmd 兜底: REST API 的 name 字段不映射到 MQTT 的 command_name\n' +
    '• POST 响应 200+ → resolve(true); 404/403 → resolve(false) → 触发下级回退',
    { fontSize: 9 }
  )

  // Priority 2 & 3
  addSectionBox(slide, 7.1, 1.5, 5.7, 1.7,
    '🔻 优先级2: UART 串口 (备用)',
    '触发条件:\n' +
    '  connection_type === "uart" && com_port 不为空\n' +
    '  && REST API 失败\n\n' +
    '流程:\n' +
    '  serialManager.sendCommand(com_port, "pump_on", duration)\n' +
    '  → SerialPort.write(JSON.stringify({\n' +
    '       action:"pump_on", duration_sec:N }))\n' +
    '  → 板子串口中断接收 → 解析 → 执行',
    { fontSize: 9 }
  )

  addSectionBox(slide, 7.1, 3.45, 5.7, 1.45,
    '🔻 优先级3: 内部 MQTT (兜底)',
    '仅当前两级都不可用时:\n' +
    '  brokerRef.publish({\n' +
    '    topic: "cmd/" + device_sn + "/pump",\n' +
    '    payload: { action: "pump_off" }\n' +
    '  })\n' +
    '  → 板子订阅 cmd/# 通配符接收',
    { fontSize: 9 }
  )

  // Auto-stop
  addSectionBox(slide, 0.6, 5.15, 12.2, 1.55,
    '🛡️ 服务端自动停止 (兜底安全机制)',
    'setTimeout(async () => {\n' +
    '  // 1. 检查 irrigation_logs 状态是否为 running\n' +
    '  // 2. 下发停止指令 (优先 REST API，fallback UART/MQTT)\n' +
    '  // 3. UPDATE irrigation_logs SET status="completed", end_time=NOW(),\n' +
    '  //    duration_sec=实际运行时长, water_used_l = duration_sec × water_flow_rate\n' +
    '}, duration_sec * 1000)\n\n' +
    '保证: 即使前端关闭、网络断开、浏览器崩溃，水泵一定在指定时长后自动停止！灌溉水量自动计算，无需人工干预。',
    { fontSize: 9, titleColor: C.red }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 19: 双引擎自动化
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '双引擎自动化', '告警引擎 (alert-engine.js) + 策略引擎 (strategy-engine.js) · 30min 冷却 · 自动触发灌溉')

  // Alert engine
  addSectionBox(slide, 0.6, 1.5, 6.2, 5.2,
    '🚨 告警引擎 (alert-engine.js)',
    'checkAlerts(deviceId, plotId, deviceSn, properties):\n\n' +
    '1. 查询该地块所有已启用策略\n' +
    '   SELECT * FROM irrigation_strategies\n' +
    '   WHERE plot_id=? AND enabled=1\n' +
    '   默认阈值: humidity 20-80%, temp 0-50°C\n\n' +
    '2. 逐项阈值判断:\n' +
    '   soil_moisture < humidity_min → "土壤湿度过低"\n' +
    '   soil_moisture > humidity_max → "土壤湿度过高"\n' +
    '   air_temp > temp_max           → "温度过高"\n' +
    '   air_temp < temp_min           → "温度过低"\n\n' +
    '3. 冷却机制 (防止重复告警):\n' +
    '   SELECT COUNT(*) FROM alerts\n' +
    '   WHERE device_id=? AND alert_type=?\n' +
    '   AND created_at > NOW() - INTERVAL 30 MINUTE\n' +
    '   存在 → 跳过 (30分钟内已告警)\n\n' +
    '4. 写入告警:\n' +
    '   INSERT INTO alerts (device_id, alert_type,\n' +
    '     alert_level, message)\n' +
    '   level: humidity超出=critical | temp超出=warn\n\n' +
    '5. Socket.io 推送到前端 Dashboard',
    { fontSize: 9 }
  )

  // Strategy engine
  addSectionBox(slide, 7.1, 1.5, 5.7, 5.2,
    '🌱 策略引擎 (strategy-engine.js)',
    'runStrategies(deviceId, plotId, deviceSn, payload):\n\n' +
    '1. 查询地块所有已启用策略\n' +
    '   SELECT * FROM irrigation_strategies\n' +
    '   WHERE plot_id=? AND enabled=1\n\n' +
    '2. 阈值匹配检查:\n' +
    '   humidity_min <= soil_moisture <= humidity_max\n' +
    '   (湿度在阈值范围内，需要灌溉)\n\n' +
    '3. 冲突检测 (同一策略不重复触发):\n' +
    '   SELECT * FROM irrigation_logs\n' +
    '   WHERE device_id=? AND strategy_id=?\n' +
    '   AND status="running"\n' +
    '   有 → 跳过 (已有运行中的灌溉)\n\n' +
    '4. 冷却间隔检查:\n' +
    '   SELECT * FROM irrigation_logs\n' +
    '   WHERE device_id=? AND strategy_id=?\n' +
    '   AND start_time > NOW() - INTERVAL cooldown SECOND\n' +
    '   有 → 跳过 (冷却时间未到)\n\n' +
    '5. 触发自动灌溉:\n' +
    '   INSERT INTO irrigation_logs (device_id,\n' +
    '     strategy_id, trigger_type="auto", status="running")\n' +
    '   INSERT INTO alerts (自动灌溉通知)\n' +
    '   irrigationEmitter.emit("autoIrrigate",\n' +
    '     { deviceSn, durationSec })\n' +
    '   → serialManager.sendCommand() 串口下发\n\n' +
    '6. 返回匹配的策略列表 (可能多个)',
    { fontSize: 9 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 20: AI 决策引擎 + AI 异常检测
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'AI 智能引擎', 'MiMo AI 决策引擎 + Z-Score 异常检测 · 2h 聚合窗口 · 线性回归趋势 · 多模型协同')

  // AI Decision
  addSectionBox(slide, 0.6, 1.45, 6.2, 5.25,
    '🧠 AI 决策引擎 (ai-decision-engine.js)',
    'handleDecision(deviceId, deviceSn, features):\n' +
    '1. InfluxDB 查询 2h 聚合 (mean/min/max/stddev)\n' +
    '2. 调用 MiMo AI (mimo-v2.5-pro)\n' +
    '   OpenAI 兼容接口 | 结构化中文 Prompt\n' +
    '   → 返回 { confidence, action, duration, reason }\n' +
    '3. 决策: confidence>0.7→自动灌溉 | 0.4-0.7→推送建议 | <0.4→日志\n' +
    '4. 冷却: 5min 间隔 (避免 30s 上报都调 LLM)\n\n' +
    '特征提取器 (feature-extractor.js):\n' +
    '  extractFeatures(deviceId, hours=2):\n' +
    '  1. InfluxDB range(-2h)→aggregateWindow(1m, mean)\n' +
    '  2. slope: 线性回归趋势方向和速率\n' +
    '  3. 归一化到 [0,1]: {moisture_mean:0.87, slope:-0.03,...}\n' +
    '  4. 返回特征向量 → 传入决策引擎',
    { fontSize: 8, lineSpacingMultiple: 1.15 }
  )

  // AI Anomaly
  addSectionBox(slide, 7.1, 1.45, 5.7, 5.25,
    '🔬 AI 异常检测 (anomaly-detector.js)',
    'checkAnomalies(deviceId, deviceSn, payload):\n' +
    '1. 查询 2h 历史: SELECT mean,stddev FROM sensor_data\n' +
    '2. Z-Score: z=(current-mean)/stddev\n' +
    '   |z|>2.5→warning | |z|>3.5→critical\n' +
    '3. 写入 ai_anomalies (type,field,value,z_score,severity,range)\n' +
    '4. WebSocket → broadcastAlert() → 前端红色闪烁\n\n' +
    '数据清洗管线 (cleanPayload):\n' +
    '① 故障码检测: SENSOR_FAULT_CODES=[999,998]\n' +
    '   999: I2C/ADC 通信超时 | 998: CRC 自检失败\n' +
    '   传感器异常 → 拦截不入 InfluxDB → 写入 MySQL alerts\n' +
    '② 物理边界: soil[0,100] temp[-20,80] → 越界标记异常\n' +
    '③ 仅有效字段写入 InfluxDB sensor_data\n\n' +
    '冷却: 同设备+类型+字段 30min 不重复 | 关联 alert-engine 协同',
    { fontSize: 8, lineSpacingMultiple: 1.15 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 21: Redis 缓存 + AI 助手
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'Redis 缓存 & AI 智能助手', 'Redis 7 Alpine · 去重 + 限流 + 缓存 · MiMo AI 对话助手 · 智能问答与故障诊断')

  addSectionBox(slide, 0.6, 1.45, 6.2, 5.25,
    '⚡ Redis 7 缓存架构',
    'Redis 7 Alpine Docker | localhost:6379 | AOF 持久化\n\n' +
    '1. 幂等去重 (Webhook 防重):\n' +
    '   SHA256(request_id)→SET NX EX 300 (5min)\n\n' +
    '2. 限流保护: 单 IP 60req/min\n' +
    '   Redis INCR+TTL 滑动窗口 → 超限 429\n\n' +
    '3. 数据缓存:\n' +
    '   Dashboard 统计 1min | 设备最新 30s | IAM Token 20min\n\n' +
    '4. Session: JWT 黑名单 → logout 失效\n\n' +
    '后端集成: redis.js (ioredis) · ratelimit 中间件 · webhookIdempotent',
    { fontSize: 8, lineSpacingMultiple: 1.15 }
  )

  addSectionBox(slide, 7.1, 1.45, 5.7, 5.25,
    '🤖 AI 智能助手 (AiChatView.vue)',
    'POST /api/v1/ai/chat | MiMo AI (mimo-v2.5-pro)\n' +
    'OpenAI 兼容接口 | 结构化提示词 | Markdown 渲染\n\n' +
    '① 智能问答:\n' +
    '   "当前土壤湿度?" → AI 查最新传感器数据回答\n' +
    '   "上次灌溉时间?" → AI 查 irrigation_logs 返回\n\n' +
    '② 灌溉建议:\n' +
    '   "现在需要灌溉吗?" → AI 分析湿度/温度/光照\n' +
    '   → 返回 {confidence, action, duration, reason}\n\n' +
    '③ 故障诊断:\n' +
    '   "为什么设备离线?" → AI 分析最近告警+异常记录\n' +
    '   → 给出原因+排查建议\n\n' +
    '④ 系统操作: 对话控制灌溉启停, 查询历史报告\n\n' +
    '技术: chat-handler.js + InfluxDB 查询 + 策略规则 + 告警上下文',
    { fontSize: 8, lineSpacingMultiple: 1.15 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 22: Docker 编排 & 部署
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, 'Docker 编排 & 部署运维', 'Docker Compose 一键编排 · healthcheck 依赖控制 · FRP 内网穿透 · 桌面快捷启动')

  // Container layout
  const containers = [
    { name: 'smartag-nginx', port: '80/443', desc: '前端静态资源\n反向代理', color: C.primary },
    { name: 'smartag-backend', port: '8080', desc: 'Node.js API\nSocket.io WS', color: C.blue },
    { name: 'smartag-mysql', port: '3306', desc: 'MySQL 8.0\n8张业务表', color: C.orange },
    { name: 'smartag-redis', port: '6379', desc: 'Redis 7 Alpine\nAOF 持久化', color: C.red },
    { name: 'smartag-influxdb', port: '8086', desc: 'InfluxDB 2.x\n4个Measurement', color: C.green },
    { name: 'smartag-emqx', port: '1883/8083', desc: 'EMQX Broker\n(备选)', color: '7C3AED' },
  ]

  containers.forEach((c, i) => {
    const cx = 0.4 + i * 2.15
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.5, w: 1.95, h: 2.5,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: 1.5, w: 1.95, h: 0.06,
      fill: { color: c.color }
    })
    slide.addText(c.name, {
      x: cx + 0.1, y: 1.7, w: 1.75, h: 0.4,
      fontSize: 12, fontFace: 'Consolas', bold: true, color: C.dark, align: 'center'
    })
    slide.addText(`:${c.port}`, {
      x: cx + 0.1, y: 2.1, w: 1.75, h: 0.3,
      fontSize: 10, fontFace: 'Consolas', color: C.gray, align: 'center'
    })
    slide.addText(c.desc, {
      x: cx + 0.1, y: 2.5, w: 1.75, h: 1.3,
      fontSize: 10, fontFace: FONT, color: C.dark, align: 'center',
      lineSpacingMultiple: 1.3, valign: 'top'
    })
  })

  // Health check
  addSectionBox(slide, 0.6, 4.25, 6.2, 2.45,
    '🏥 Healthcheck 依赖控制',
    'restart: unless-stopped  |  depends_on 控制启动顺序\n\n' +
    'MySQL:   mysqladmin ping -h localhost\n' +
    'Redis:   redis-cli ping\n' +
    'InfluxDB: influx ping\n' +
    '全部 interval 10s | retries 5 | healthy 后才启 backend',
    { fontSize: 9, lineSpacingMultiple: 1.2 }
  )

  // Deployment
  addSectionBox(slide, 7.1, 4.25, 5.7, 2.45,
    '🚀 部署与一键启动',
    '桌面 Start-SmartAg.bat:\n' +
    '  Docker Desktop → 容器编排 → 后端:8080 → 前端:3000\n' +
    '  → 自动打开浏览器 http://localhost:3000\n\n' +
    'FRP 隧道:\n' +
    '  WSL: frpc -c /mnt/d/frp/client/frpc.toml\n' +
    '  阿里云 ECS: 47.96.100.108 (frps 0.61.1)\n' +
    '  端口: :8081→:8080(后端) :8080→:3000(前端)\n\n' +
    '环境: MySQL Windows 原生 | COM5 串口直连 | admin/admin123',
    { fontSize: 9, lineSpacingMultiple: 1.2 }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 23: 端到端全链路数据流 (升级版)
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '端到端全链路数据流', '30s 采集 → QoS 1 MQTT → 华为云 IoTDA → Webhook → FRP → InfluxDB+MySQL → Socket.io → Vue 3')

  // Flow stages
  const stages = [
    { title: '① 嵌入式采集', items: 'BearPi #1 smart-001\nE53_IA1 传感器板\nSHT30+BH1750+ADC\n30s 周期采集', time: '30s', color: C.primary },
    { title: '② 华为云 IoTDA', items: 'cn-north-4 区域\nMQTT QoS1 上报\n设备影子同步\n规则引擎转发', time: '<200ms', color: C.blue },
    { title: '③ FRP 穿透', items: 'ECS frps :8081\nWSL frpc 转发\n→ localhost:8080\n透明 TCP 代理', time: '<300ms', color: C.orange },
    { title: '④ 后端处理', items: '中间件链处理\n双写 MySQL+InfluxDB\n告警/策略/AI 引擎\nSocket.io 广播', time: '<50ms', color: C.green },
    { title: '⑤ 数据存储', items: 'InfluxDB 时序\nMySQL 关系型\nRedis 缓存/去重\n3引擎协同', time: '<10ms', color: C.red },
    { title: '⑥ 前端展示', items: 'Dashboard 仪表盘\nMonitor 实时监控\nECharts 24h趋势\n毫秒级 DOM 刷新', time: '<16ms', color: '7C3AED' },
  ]

  stages.forEach((s, i) => {
    const sx = 0.3 + i * 2.15
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: 1.5, w: 1.95, h: 3.0,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    slide.addShape(pptx.ShapeType.rect, {
      x: sx, y: 1.5, w: 1.95, h: 0.06,
      fill: { color: s.color }
    })
    slide.addText(s.title, {
      x: sx + 0.08, y: 1.65, w: 1.79, h: 0.35,
      fontSize: 11, fontFace: FONT, bold: true, color: s.color, align: 'center'
    })
    slide.addText(s.items, {
      x: sx + 0.08, y: 2.1, w: 1.79, h: 1.8,
      fontSize: 9, fontFace: FONT, color: C.dark, align: 'center',
      lineSpacingMultiple: 1.4, valign: 'top'
    })
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx + 0.35, y: 4.05, w: 1.25, h: 0.35,
      fill: { color: s.color }
    })
    slide.addText(s.time, {
      x: sx + 0.35, y: 4.05, w: 1.25, h: 0.35,
      fontSize: 11, fontFace: FONT, bold: true, color: C.white, align: 'center', valign: 'middle'
    })

    // Arrow
    if (i < stages.length - 1) {
      slide.addText('→', {
        x: sx + 1.93, y: 2.6, w: 0.25, h: 0.4,
        fontSize: 16, fontFace: FONT, bold: true, color: C.gray, align: 'center'
      })
    }
  })

  // Total latency bar
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 4.7, w: 12.1, h: 0.55,
    fill: { color: C.primaryDark }
  })
  slide.addText('端到端总延迟 < 1s (从传感器到屏幕)  |  采集 30s → MQTT <100ms → IoTDA <200ms → FRP <300ms → 后端 <50ms → InfluxDB <10ms → Socket.io <5ms → 前端 DOM <16ms', {
    x: 0.8, y: 4.73, w: 11.7, h: 0.5,
    fontSize: 11, fontFace: FONT, bold: true, color: C.white, align: 'center', valign: 'middle'
  })

  // Bottom: detailed flow with protocol
  addSectionBox(slide, 0.6, 5.55, 12.1, 1.15,
    '📋 全链路协议与端口',
    '采集(30s)→MQTT QoS1:1883→华为云IoTDA(117.78.5.125)→规则引擎→HTTP POST Webhook→FRP:8081→:8080→中间件链(webhookAuth→idempotent→clean→write→check→broadcast)\n' +
    '→MySQL:3306(sensor_data,alerts)+InfluxDB:8086(sensor_data,ai_anomalies)+Redis:6379(去重/限流)→Socket.io:8080/ws→前端:3000(mqttStore.latestData→ECharts+MonitorView)',
    { fontSize: 7.5, lineSpacingMultiple: 1.2, titleColor: C.primary }
  )

  addFooter(slide)
}

// ======================================================================
// SLIDE 24: 项目亮点总结
// ======================================================================
{
  const slide = pptx.addSlide()
  slideBase(slide, '项目亮点总结', '端到端全链路闭环 · 多级容错 · AI 智能决策 · 零接触远程部署 · 企业级工程实践')

  const highlights = [
    {
      title: '🔗 端到端全链路闭环',
      desc: '板子采集 → MQTT → 华为云 IoTDA → Webhook → FRP 穿透 → 后端处理入库 → Socket.io → 前端实时展示，全链路打通，延迟 < 1s',
      color: C.primary
    },
    {
      title: '🤖 双引擎 + AI 智能自动化',
      desc: '告警引擎 (阈值+冷却) + 策略引擎 (自动灌溉触发) + AI 决策引擎 (MiMo, 2h聚合, 线性回归趋势) + AI 异常检测 (Z-Score, 故障码过滤)',
      color: C.blue
    },
    {
      title: '🛡️ 3 级命令下发 + 自动停止兜底',
      desc: '华为云 REST API (主力) → UART 串口 (备用) → 内部 MQTT (兜底)。服务端 setTimeout 自动停止，确保水泵一定关闭',
      color: C.red
    },
    {
      title: '💾 Flash 配置存储 + 云端配网',
      desc: 'USER_RESERVE 4KB 分区，Magic+Version 校验，hi_flash_write 直写。SetConfig 云端命令远程配网，彻底摆脱串口，零接触部署',
      color: C.orange
    },
    {
      title: '🌐 FRP 内网穿透',
      desc: '阿里云 ECS frps → WSL Ubuntu frpc → 本地 Windows。无需公网 IP/VPN，华为云 Webhook 通过外网直连本地环境',
      color: C.green
    },
    {
      title: '🏗️ 全栈工程化',
      desc: '嵌入式 C (LiteOS RTOS + 华为云 SDK) | 后端 Node.js (Express + Socket.io + AI) | 前端 Vue 3 (Vite + Pinia + ECharts) | Docker Compose 一键部署',
      color: '7C3AED'
    },
    {
      title: '🐛 10 项关键 Bug 修复',
      desc: 'HardFault 定位、RELAY_ACTIVE_LOW 修正、GPIO 初始化耦合解除、属性命名兼容 (PascalCase/camelCase/snake_case)、WiFi 2.4GHz 确认、串口配网改云端、Flash 直写、cJSON NULL 防护、IAM 权限策略修复',
      color: C.red
    },
    {
      title: '📊 数据双写 + 多引擎协同',
      desc: '每条传感器数据双写 MySQL+InfluxDB 互为备份。Redis 去重 + 限流。healthcheck 依赖控制启动顺序。数据导出 CSV。10 个前端页面 + AI 对话助手',
      color: C.primary
    },
  ]

  highlights.forEach((h, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const hx = 0.4 + col * 6.4
    const hy = 1.3 + row * 1.45

    slide.addShape(pptx.ShapeType.roundRect, {
      x: hx, y: hy, w: 6.1, h: 1.3,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.06
    })
    // Color left bar
    slide.addShape(pptx.ShapeType.rect, {
      x: hx, y: hy, w: 0.07, h: 1.3,
      fill: { color: h.color }
    })
    slide.addText(h.title, {
      x: hx + 0.2, y: hy + 0.1, w: 5.7, h: 0.38,
      fontSize: 13, fontFace: FONT, bold: true, color: h.color
    })
    slide.addText(h.desc, {
      x: hx + 0.2, y: hy + 0.5, w: 5.7, h: 0.7,
      fontSize: 9, fontFace: FONT, color: C.dark, valign: 'top', lineSpacingMultiple: 1.3
    })
  })

  addFooter(slide)
}

// ======================================================================
// SLIDE 25: Thank You
// ======================================================================
{
  const slide = pptx.addSlide()
  slide.background = { fill: C.primaryDark }

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: '100%',
    fill: { color: C.primaryLight }
  })

  slide.addText('谢谢', {
    x: 1, y: 1.8, w: 11, h: 1.2,
    fontSize: 48, fontFace: FONT_TITLE, bold: true,
    color: C.white, align: 'center'
  })
  slide.addText('Thank You', {
    x: 1, y: 2.9, w: 11, h: 0.7,
    fontSize: 24, fontFace: FONT_TITLE, color: C.primaryLight, align: 'center'
  })

  slide.addShape(pptx.ShapeType.rect, {
    x: 4.5, y: 3.8, w: 4.3, h: 0.03,
    fill: { color: C.primaryLight }
  })

  slide.addText('智慧农业灌溉系统 · Smart Agriculture Irrigation System', {
    x: 1, y: 4.1, w: 11, h: 0.6,
    fontSize: 16, fontFace: FONT, color: 'CBD5E1', align: 'center'
  })

  // Tech stack summary
  slide.addText([
    { text: '华为云 IoTDA', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'BearPi-HM Nano', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'Node.js', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'Vue 3', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'MySQL', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'InfluxDB', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'Redis', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'Docker', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'Socket.io', options: { color: 'A7F3D0' } },
    { text: '  ·  ', options: { color: '94A3B8' } },
    { text: 'MiMo AI', options: { color: 'A7F3D0' } },
  ], {
    x: 1, y: 5.0, w: 11, h: 0.5,
    fontSize: 11, fontFace: FONT, align: 'center'
  })

  // Contact info
  slide.addText([
    { text: '系统状态: ', options: { color: '94A3B8' } },
    { text: '运行中 (2台设备在线 · 阿里云ECS · Docker容器化部署)', options: { color: 'A7F3D0' } },
  ], {
    x: 1, y: 5.8, w: 11, h: 0.4,
    fontSize: 10, fontFace: FONT, align: 'center'
  })

  slide.addText('2026.06  |  Smart Agriculture Team', {
    x: 1, y: 6.4, w: 11, h: 0.4,
    fontSize: 10, fontFace: FONT, color: '94A3B8', align: 'center'
  })
}

// ── Generate ──
const outputPath = 'D:\\aiapp\\aiot\\docs\\smart-ag-report.pptx'
await pptx.writeFile({ fileName: outputPath })
console.log(`✅ PPT generated: ${outputPath}`)
console.log(`   Total slides: ${pptx.slides.length}`)
