---
marp: true
theme: uncover
class:
  - lead
  - invert
size: 16:9
paginate: true
backgroundColor: '#0B0F19'
color: '#e4ecf7'
header: '智慧农业 · 微信小程序'
footer: 'Smart Agriculture Mini Program'
style: |
  :root {
    --color-background: #0B0F19;
    --color-foreground: #e4ecf7;
    --color-accent: #00b4d8;
    --color-dimmed: #556080;
  }
  section {
    background: linear-gradient(135deg, #0B0F19 0%, #111624 50%, #0B0F19 100%);
    font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
    justify-content: flex-start;
    padding-top: 65px;
  }
  h1 { color: #00b4d8; font-size: 2em; }
  h2 { color: #48cae4; font-size: 1.25em; border-bottom: 2px solid rgba(0,180,216,0.2); padding-bottom: 0.2em; margin-bottom: 0.3em; }
  h3 { color: #67e8f9; font-size: 1em; margin: 0.3em 0; }
  table { font-size: 0.55em; margin: 0 auto; line-height: 1.15; }
  th { background: rgba(0,180,216,0.2); color: #48cae4; padding: 3px 6px; }
  td { border-color: rgba(255,255,255,0.07); padding: 2px 6px; }
  code { background: rgba(0,180,216,0.12); color: #48cae4; font-size: 0.85em; }
  pre { background: #0d1220; border: 1px solid rgba(255,255,255,0.07); font-size: 0.38em; line-height: 1.1; padding: 8px 12px; margin: 0.3em 0; }
  ul { margin: 0.2em 0; padding-left: 1.2em; }
  ul li { margin: 0.12em 0; font-size: 0.78em; }
  p { margin: 0.3em 0; font-size: 0.78em; }
  strong { color: #ffd166; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8em; }
  .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.6em; }
  .small { font-size: 0.62em; }
  .tiny { font-size: 0.5em; line-height: 1.1; }
  .tight p, .tight ul li { margin: 0.08em 0; font-size: 0.68em; }
---

<!-- _class: lead -->
<!-- _footer: '' -->
<!-- _header: '' -->

# 智慧农业灌溉
## 微信小程序

**Smart Agriculture · WeChat Mini Program**
**电影级动态交互 · 原生高性能**

<div style="margin-top:2em;color:#556080;font-size:0.7em;">
2026 年 6 月 | 技术汇报
</div>

---

<!-- _header: '技术方案' -->

## 技术选型

<div class="columns">
<div class="tight">

**框架 & 通信**
- 微信原生 WXML + WXSS + JS
- 零第三方依赖
- API：`47.96.100.108:8081`
- 认证：wx.login → JWT
- 实时：HTTP 轮询 (5s)

**为什么选原生？**
- 包体积最小，启动最快
- 无框架运行时开销
- 避免 uni-app / Taro 损耗

</div>
<div class="tight">

**与 Web 端对比**

| 维度 | 小程序 | Web 前端 |
|------|--------|----------|
| 框架 | 原生 | Vue 3 + Vite |
| 组件 | 手写 4 个 | Element Plus |
| 实时 | 5s 轮询 | MQTT WS |
| 包体 | <200KB | ~2MB |

**为什么用轮询？**
- 小程序 WS 连接数有限
- 用户停留短，5s 足够
- 避免 Buffer polyfill

</div>
</div>

---

<!-- _header: '页面架构' -->

## 页面全览（5 页 · 48 文件）

<div class="tiny">

| 页面 | 核心功能 |
|------|---------|
| **登录** `pages/login` | 浮动粒子背景 + 卡片弹性入场 + wx.login → JWT |
| **仪表盘** `pages/dashboard` | 4 色 stat cards + 设备在线列表 + 近期告警 |
| **设备监控** `pages/monitor` | 传感器 3 列网格 6 项指标 + 灌溉控制入口 |
| **灌溉控制** `pages/control` | 时长药丸选择 + 倒计时 + 开始/停止 + 记录 |
| **告警中心** `pages/alerts` | 筛选 Tab + 分页 + 标记已解决 |

</div>

**4 个可复用组件**：`stat-card` · `device-card` · `sensor-item` · `alert-item`

---

<!-- _header: '动效设计' -->

## 电影级动态交互（8 组 · 全 GPU 加速）

<div class="tiny">

| 动效 | 实现方式 | 应用场景 |
|------|---------|---------|
| **spring-press** | `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性缩放 | 按钮/卡片/列表 — 触感反馈 |
| **staggerIn** | `@keyframes` + inline `animation-delay` 错落 | 列表逐项淡入上移入场 |
| **dot-pulse** | 伪元素 `scale(0.5→1.8)` + opacity 涟漪 | 设备在线绿色指示灯 |
| **pill-ripple** | 边框 `scale(1→1.08)` 脉冲扩散 | 灌溉时长药丸选中态 |
| **btn-shimmer** | 倾斜光条 `translateX` 无限扫过 | 开始灌溉 / 登录按钮 |
| **wave** | 5 条 `scaleY` + opacity 错相波动 | 监控页数据同步状态栏 |
| **particle-float** | 6 粒子 XY 漂移 + opacity 呼吸 | 登录页背景氛围粒子 |
| **page-enter** | `translateY(12rpx→0)` + opacity | 页面切入动画 |

</div>

---

## 动效原理 — spring-press + staggerIn

<div class="columns">
<div>

**spring-press 弹性交互**
```
touchstart → scale(0.95) + 光晕
touchend  → spring-back 弹回
```
- `will-change: transform` 预声明
- 全部元素均具备，零延迟反馈

**staggerIn 错落入场**
```
卡片1: 0.00s → ↑36rpx + opacity
卡片2: 0.08s → ↑36rpx + opacity
卡片3: 0.16s → ↑36rpx + opacity
```
- 仅首次 onShow 触发
- 缓出函数保证丝滑

</div>
<div>

**关键 CSS**
```css
.spring-press {
  transition: transform 0.25s
    cubic-bezier(0.34,1.56,0.64,1);
  will-change: transform;
}
.spring-press:active {
  transform: scale(0.95);
}

@keyframes staggerIn {
  from { opacity:0; transform:
    translateY(36rpx) scale(0.96); }
  to   { opacity:1; transform:
    translateY(0) scale(1); }
}
```

</div>
</div>

---

<!-- _header: '设计系统' -->

## 视觉设计系统

<div class="columns">
<div>

**配色方案**

| Token | 色值 | 用途 |
|-------|------|------|
| bg-primary | `#0B0F19` | 主背景 |
| bg-card | `rgba(20,26,44,.55)` | 毛玻璃卡片 |
| accent | `#00b4d8` | 主强调青蓝 |
| green | `#06d6a0` | 在线/成功 |
| coral | `#ff6b6b` | 离线/错误 |
| amber | `#f0a500` | 用水提醒 |

</div>
<div>

**液态毛玻璃卡片**
```
bg: rgba(20,26,44,0.55)
border: 1px rgba(255,255,255,0.07)
shadow: 0 4rpx 32rpx rgba(0,0,0,0.4)
        inset 0 1rpx 0 rgba(255,255,255,0.03)
::before — 顶部微光条
::after  — 内部高光渐变
```
- 半透明 + 微白边框
- 多层阴影悬浮深度

</div>
</div>

---

<!-- _header: '性能保障' -->

## 60fps 性能策略

<div class="columns tight">
<div>

**GPU 硬件加速**
- 仅用 `transform` + `opacity`
- 零重排（reflow）
- `will-change` 预通知
- CSS animation 非 JS 驱动

**CSS 变量系统**
- 全局 Design Token
- 运行时零开销

</div>
<div>

**渲染优化**
- 入场用 @keyframes
- 延迟用 inline style
- 无 JS 动画帧阻塞
- 隐藏时暂停轮询

**包体控制**
- 零 npm 依赖
- 48 文件纯手写
- <200KB 总代码量

</div>
</div>

---

<!-- _header: '核心代码' -->

## 关键代码 — 卡片 + 动效

<div class="columns">
<div>

```css
/* 液态毛玻璃卡片 */
.card {
  background: rgba(20,26,44,0.55);
  border: 1px solid
    rgba(255,255,255,0.07);
  border-radius: 20rpx;
  box-shadow:
    0 4rpx 32rpx rgba(0,0,0,0.4),
    inset 0 1rpx 0
    rgba(255,255,255,0.03);
}
.card::before {
  /* 顶部微光条 */
  height: 2rpx;
  background: linear-gradient(
    90deg, transparent,
    rgba(255,255,255,0.12),
    transparent);
}
```

</div>
<div>

```css
/* spring-press 弹性按压 */
.spring-press {
  transition: transform 0.25s
    cubic-bezier(
      0.34, 1.56, 0.64, 1);
  will-change: transform;
}
.spring-press:active {
  transform: scale(0.95);
}

/* staggerIn 错落入场 */
.stagger-item {
  opacity: 0;
  animation: staggerIn 0.55s
    cubic-bezier(
      0.22, 0.61, 0.36, 1) forwards;
}
```

</div>
</div>

---

## 关键代码 — 粒子背景 + 按钮光扫

<div class="columns">
<div>

```css
/* 6 粒子浮动背景 (登录页) */
.particle {
  position: absolute;
  width: 6rpx; height: 6rpx;
  border-radius: 50%;
  background: rgba(0,180,216,0.25);
  animation: particle-float
    var(--d) ease-in-out infinite;
}
@keyframes particle-float {
  0%,100% { transform:
    translateY(0) translateX(0);
    opacity:0; }
  20% { opacity:0.7; }
  50% { transform:
    translateY(-60rpx)
    translateX(30rpx);
    opacity:0.3; }
}
```

</div>
<div>

```css
/* 按钮光扫 (shimmer) */
.btn-shine {
  position: absolute;
  top: 0; left: -80%;
  width: 60%; height: 100%;
  background: linear-gradient(
    90deg, transparent,
    rgba(255,255,255,0.12),
    transparent);
  transform: skewX(-15deg);
  animation: btn-shimmer
    3s ease-in-out infinite;
}
@keyframes btn-shimmer {
  0%,100% { left: -80%; }
  50%     { left: 120%; }
}
```

</div>
</div>

---

<!-- _header: '后端配套' -->

## 后端配套接口

<div class="columns">
<div>

**users 表扩展**
```sql
ALTER TABLE users
ADD COLUMN wechat_openid
  VARCHAR(64);
```

**新增路由**
```
POST /api/v1/auth/wechat-login
{ code, nickName? }
→ openid → JWT Token
```

1. code2Session 换 openid
2. 查找/创建用户
3. 签发 JWT 返回

</div>
<div>

**config.js 配置**
```javascript
wechat: {
  appId:
   'wx1cb278030c740ba3',
  appSecret:
   '199c3cf53e...'
}
```

**models/user.js**
```javascript
findByWechatOpenid(openid)
createWechatUser(
  { openid, nickName }
)
```

</div>
</div>

---

<!-- _header: '项目状态' -->

## 开发进度

<div class="small">

| 模块 | 状态 | 说明 |
|------|:----:|------|
| 项目骨架 | ✅ | 48 文件，5 页面 + 4 组件 |
| 登录流程 | ✅ | wx.login → JWT，Token 持久化 |
| 仪表盘 | ✅ | 4 stat cards + 设备列表 + 告警 |
| 设备监控 | ✅ | 传感器 3 列网格，6 指标 |
| 灌溉控制 | ✅ | 时长选择 + 倒计时 + 启停 |
| 告警中心 | ✅ | 筛选 + 分页 + 标记解决 |
| 动效系统 | ✅ | 8 组动画，全部 GPU 加速 |
| TabBar 图标 | ⬜ | 待替换正式图标 |
| 合法域名 | ⬜ | 微信后台添加 request 域名 |
| 真机测试 | ⬜ | 扫码验证 |

</div>

---

<!-- _class: lead -->
<!-- _header: '' -->
<!-- _footer: '' -->

# 谢谢
## Thank You

**智慧农业灌溉 · 微信小程序**
Smart Agriculture · WeChat Mini Program

<div style="margin-top:3em;color:#556080;font-size:0.7em;">
原生高性能 · 电影级动效 · 5 页 48 文件 · AppID: wx1cb278030c740ba3
</div>
