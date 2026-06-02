---
marp: true
theme: uncover
class:
  - lead
  - invert
size: 16:9
paginate: true
backgroundColor: #0a0e27
color: #e0e6ff
header: '智慧农业灌溉系统'
footer: 'Smart Agriculture Irrigation System'
style: |
  :root {
    --color-background: #0a0e27;
    --color-foreground: #e0e6ff;
    --color-accent: #00d4aa;
    --color-dimmed: #6b7db3;
  }
  section {
    background: linear-gradient(135deg, #0a0e27 0%, #141b3d 50%, #0f1535 100%);
    font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
  }
  h1 { color: #00d4aa; font-size: 2.2em; }
  h2 { color: #5eead4; font-size: 1.6em; border-bottom: 2px solid #00d4aa40; padding-bottom: 0.3em; }
  h3 { color: #67e8f9; font-size: 1.2em; }
  table { font-size: 0.7em; margin: 0 auto; }
  th { background: #00d4aa30; color: #00d4aa; }
  td { border-color: #2a3a5c; }
  code { background: #1a2540; color: #5eead4; }
  pre { background: #111b35; border: 1px solid #2a3a5c; }
  ul li { margin: 0.3em 0; }
  strong { color: #fbbf24; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
  .small { font-size: 0.65em; }
  .tiny { font-size: 0.55em; }
---

<!-- _class: lead -->
<!-- _footer: '' -->
<!-- _header: '' -->

![bg right:35% 80%](https://img.icons8.com/fluency/256/iot.png)

# 智慧农业灌溉系统
## Smart Agriculture Irrigation System

**基于华为云 IoTDA + BearPi-HM Nano**
**端到端全链路物联网解决方案**

<div style="margin-top:2em;color:#6b7db3;font-size:0.8em;">
2026 年 6 月 | 项目技术汇报
</div>

---

<!-- _header: '系统总览' -->

## 项目概述

本系统是一套完整的**智慧农业物联网灌溉解决方案**，实现了从传感器数据采集、云端传输、业务处理到前端可视化的端到端闭环。

<div class="columns">
<div>

**技术栈**
- 嵌入式：Hi3861 RISC-V + LiteOS
- 云平台：华为云 IoTDA
- 后端：Node.js + Express
- 数据库：MySQL 8.0
- 前端：Vue 3 + Element Plus
- 通信：MQTT + WebSocket + FRP

</div>
<div>

**核心功能**
- 多传感器实时采集（30s 周期）
- 华为云 IoT 设备管理及数据转发
- 自动告警 + 智能灌溉策略
- 手动/定时/自动三种灌溉模式
- 历史数据查询及 CSV 导出
- 实时 Dashboard 仪表盘

</div>
</div>

---

## 系统架构全景图

```
┌──────────────┐   MQTT    ┌─────────────────┐   Webhook    ┌──────────────┐
│ BearPi Nano  │ ────────▶ │  华为云 IoTDA     │ ──────────▶ │  后端 :8080   │
│  ×2 传感器板  │           │  数据转发+命令下发  │             │  Express+Aedes│
└──────────────┘           └─────────────────┘             └───┬────┬─────┘
      ▲                          │                             │    │
      │ 命令下发                   │  FRP 隧道                   │    │ MQTT/WS
      │ REST API                  ▼                             │    │
      └──────────────────── 47.96.100.108 ◀────────────────────┘    ▼
                            阿里云 ECS 中转                    ┌──────────┐
                                                              │ Vue3 前端 │
┌──────────────────────────────────────────────────────┐      │  :3000    │
│                   MySQL 8.0                           │      └──────────┘
│  users | devices | plots | sensor_data | alerts      │
│  irrigation_strategies | irrigation_logs | schedules │
└──────────────────────────────────────────────────────┘
```

---

<!-- _header: '一、前端' -->

## 前端 — 技术选型

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | **Vue 3** (Composition API) | 响应式 UI 框架 |
| 构建工具 | **Vite 5** | 极速冷启动 + HMR |
| 状态管理 | **Pinia** | Vue 3 官方推荐 |
| UI 组件库 | **Element Plus** | 企业级中后台组件 |
| 图表 | **ECharts 5** | 传感器趋势图、仪表盘 |
| MQTT 客户端 | **mqtt.js** | 浏览器端 MQTT over WebSocket |
| HTTP 客户端 | **Axios** | API 请求 + JWT 拦截器 |
| 路由 | **Vue Router 4** | 路由守卫 + 权限控制 |

<div class="small">

- 中文界面 (Element Plus 中文 locale)
- 全响应式布局适配 PC/平板
- JWT Token 自动注入 Authorization 头
- 401 自动跳转登录页

</div>

---

## 前端 — 页面功能总览

| 路由 | 页面 | 核心功能 |
|------|------|---------|
| `/login` | **登录页** | 用户名密码登录，JWT Token 持久化 |
| `/dashboard` | **仪表盘** | 在线设备数、今日灌溉次数、总用水量、24h 趋势图 (ECharts) |
| `/monitor` | **实时监控** | 设备卡片、MQTT 实时数据、灌溉开关按钮、状态指示灯 |
| `/devices` | **设备管理** | 设备 CRUD、串口绑定、华为云 ID 绑定、在线状态 |
| `/plots` | **地块管理** | 地块 CRUD、种植物类型、面积管理 |
| `/strategies` | **灌溉策略** | 温湿度阈值、时长上限、冷却间隔、启用/禁用 |
| `/irrigation-logs` | **灌溉记录** | 历史灌溉查询、状态标记 (running/completed) |
| `/alerts` | **告警中心** | 阈值告警列表、标记已处理 |
| `/schedules` | **定时任务** | 定时灌溉计划、Cron 表达式配置 |
| `/settings` | **系统设置** | 全局参数配置 |

---

## 前端 — 实时数据流

```
  华为云 Webhook → 后端 huawei-callback.js
       │
       ├── 1. INSERT INTO sensor_data (MySQL)
       │
       └── 2. brokerRef.publish("sensor/BPN-xxx/data")
                    │
                    ▼
         ┌─────────────────────┐
         │  Aedes MQTT Broker   │
         │  ws://localhost:8083 │
         └────────┬────────────┘
                  │ WebSocket
                  ▼
         ┌─────────────────────┐
         │   前端 mqttStore     │
         │   订阅: sensor/+/data │
         └────────┬────────────┘
                  │
                  ▼
         latestData[deviceSn] = { soil_moisture, air_temp, ... }
                  │
                  ▼
         MonitorView.vue 设备卡片实时刷新
```

---

## 前端 — MQTT 实时推送 核心代码

```javascript
// stores/mqtt.js — Pinia Store
const broker = 'ws://localhost:8083/mqtt'
client.value = mqtt.connect(broker)

client.value.on('connect', () => {
  client.value.subscribe('sensor/+/data')  // 通配符订阅所有设备
})

client.value.on('message', (topic, message) => {
  const data = JSON.parse(message.toString())
  const deviceSn = topic.split('/')[1]       // 提取设备 SN
  latestData.value[deviceSn] = { ...data, timestamp: Date.now() }
})
```

```vue
<!-- MonitorView.vue — 灌溉按钮 -->
<el-button @click="handleStartIrrigate(device)">开始灌溉</el-button>

// 调用后端 API → 华为云 REST 命令下发 → 板子继电器动作
await startIrrigation(device.id, { duration_sec: dur })
```

---

<!-- _header: '小程序' -->

## 小程序 — 技术方案

<div class="columns">
<div>

**技术栈**
- 框架：微信原生 WXML + WXSS + JS
- API 基地址：`http://47.96.100.108:8081`
- 认证：wx.login → code 换 JWT
- 实时数据：HTTP 轮询（5s）
- 共用后端 API，零额外接口

**为什么选原生框架？**
- 包体积最小（无框架运行时）
- 启动速度最快
- 避免 uni-app / Taro 兼容层损耗

</div>
<div>

**为什么用 HTTP 轮询？**
- 小程序 WebSocket 连接数有限
- 用户停留短，5s 轮询足够
- mqtt.js 需 Buffer polyfill
- 降低实现复杂度

**技术对比**
- Web 端：Vue 3 + Element Plus + MQTT WebSocket
- 小程序：原生框架 + 手写组件 + HTTP 轮询
- 共用后端 API + 数据库 + 华为云 IoT

</div>
</div>

---

## 小程序 — 页面全览（5 页 · 48 文件）

| 页面 | 路径 | 核心功能 |
|------|------|---------|
| **登录** | `pages/login` | 微信一键登录，wx.login → JWT |
| **仪表盘** | `pages/dashboard` | 4 统计卡片 + 设备列表 + 近期告警 |
| **设备监控** | `pages/monitor` | 传感器卡片网格，3 列布局展示 6 项指标 |
| **灌溉控制** | `pages/control` | 时长药丸选择 + 开始/停止 + 倒计时 + 记录 |
| **告警中心** | `pages/alerts` | 全部/未解决/已解决筛选 + 分页 + 标记已解决 |

**4 个可复用组件**: `stat-card` / `device-card` / `sensor-item` / `alert-item`

---

## 小程序 — 电影级动态交互设计

<div class="tiny">

| 动效 | 技术实现 | 应用场景 |
|------|---------|---------|
| **spring-press** | `cubic-bezier(0.34,1.56,0.64,1)` 弹性缩放 | 所有按钮、卡片、列表项触感反馈 |
| **staggerIn** | CSS @keyframes + inline animation-delay 错落入场 | 每个页面列表项依次淡入上移 |
| **dot-pulse** | 伪元素 scale + opacity 呼吸涟漪 | 在线设备绿色状态指示灯 |
| **pill-ripple** | 激活药丸边框扩散脉冲 | 灌溉时长选择器选中态 |
| **btn-shimmer** | 倾斜光条 translateX 无限扫过 | 开始灌溉 / 登录按钮 |
| **wave** | 5 条 scaleY + opacity 错相波动 | 监控页数据同步状态栏 |
| **particle-float** | 6 粒子 XY 漂移 + opacity 呼吸 | 登录页背景氛围 |

</div>

**设计系统**：深科技蓝 #0B0F19 → #1A1F2C + 液态毛玻璃卡片 + accent #00b4d8
**性能保障**：全部使用 `transform` + `opacity`（GPU 合成层，零重排）

---

<!-- _header: '二、数据库' -->

## 数据库 — MySQL 8.0 表结构

<div style="font-size:0.45em; line-height:1.2;">

| 表名 | 核心字段 | 说明 |
|------|---------|------|
| `users` | id, username, password(bcrypt), real_name, role(admin/operator), status | 用户认证 |
| `devices` | id, **device_sn**(唯一), device_name, **huawei_device_id**, com_port, plot_id, online_status | 设备主数据 |
| `plots` | id, plot_name, crop_type, area_sqm | 地块信息 |
| `sensor_data` | id, device_id(FK), **soil_moisture**, soil_temp, **air_temp**, **air_humidity**, light, created_at | 时序传感器数据 |
| `irrigation_strategies` | id, plot_id(FK), humidity_min/max, temp_min/max, **irrigation_duration_max**, **cooldown_interval**, enabled | 自动灌溉规则 |
| `irrigation_logs` | id, device_id, strategy_id, **trigger_type**(manual/auto), start_time, end_time, **duration_sec**, **water_used_l**, status(running/completed) | 灌溉执行记录 |
| `alerts` | id, device_id, alert_type, alert_level(info/warn/critical), message, resolved | 告警记录 |
| `scheduled_tasks` | id, device_id, task_name, **cron_expr**, action, duration_sec, enabled | 定时灌溉计划 |

</div>

**关键设计**: `devices.huawei_device_id` 关联华为云设备；`irrigation_strategies.cooldown_interval` 防止频繁灌溉

---

## 数据库 — ER 关系图

```
   ┌──────────┐         ┌──────────────┐
   │  users   │         │    plots     │
   │──────────│         │──────────────│
   │ id (PK)  │         │ id (PK)      │
   │ username │         │ plot_name    │
   │ password │         │ crop_type    │
   │ role     │         │ area_sqm     │
   └────┬─────┘         └──────┬───────┘
        │                      │ 1
        │ N                    ├────────────┐
        ▼                      │ N          │ 1
 ┌──────────────┐     ┌────────┴──────┐    │
 │irrigation_logs│     │   devices     │    │
 │──────────────│     │───────────────│    │
 │ id (PK)      │◄────│ id (PK)       │    │
 │ device_id FK │  N  │ device_sn UQ  │    │
 │ strategy_id  │     │ huawei_       │    │
 │ trigger_type │     │   device_id   │    │
 │ start_time   │     │ com_port      │    │
 │ end_time     │     │ online_status │    │
 │ duration_sec │     └──┬────┬───────┘    │
 │ status       │        │ 1  │ 1          │
 └──────┬───────┘        │    │            │
        │ N              │    │            │
        ▼                ▼    ▼            ▼
 ┌──────────────┐  ┌──────────┐  ┌──────────────┐
 │irrigation_   │  │sensor_data│  │   alerts     │
 │ strategies   │  │──────────│  │──────────────│
 │──────────────│  │ id (PK)  │  │ id (PK)      │
 │ plot_id FK   │  │ device_id │  │ device_id FK │
 │ humidity_min │  │ soil_moist│  │ alert_type   │
 │ humidity_max │  │ soil_temp │  │ alert_level  │
 │ duration_max │  │ air_temp  │  │ message      │
 │ cooldown_int │  │ air_humid │  │ resolved     │
 │ enabled      │  │ light     │  └──────────────┘
 └──────────────┘  │ created_at│
                   └──────────┘

       ┌────────────────┐
       │scheduled_tasks │
       │────────────────│
       │ device_id FK   │
       │ cron_expr      │
       │ action         │
       │ duration_sec   │
       │ enabled        │
       └────────────────┘
```

---

## 数据库 — 表容量估算

| 表 | 日增量 | 月增量 | 年增量 | 索引策略 |
|------|--------|--------|--------|---------|
| sensor_data | ~5,760 条 (2设备×30s) | ~173K | ~2.1M | device_id + created_at |
| irrigation_logs | ~10 条 | ~300 | ~3,600 | device_id + start_time |
| alerts | ~5 条 | ~150 | ~1,800 | device_id + alert_type |

<div class="small">

- `sensor_data` 为核心大表，建议按月分区或定期归档
- 每条传感器记录约 80 bytes，日增量约 460KB
- 灌溉日志记录自动计算 `water_used_l = duration_sec × water_flow_rate`

</div>

---

<!-- _header: '三、后端' -->

## 后端 — 技术架构

| 类别 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | 22.x |
| Web 框架 | Express | 4.x |
| 数据库驱动 | mysql2/promise | — |
| MQTT Broker | Aedes | — |
| WebSocket | ws | — |
| 认证 | JWT (jsonwebtoken) | — |
| 密码加密 | bcryptjs | — |
| 华为云 SDK | @huaweicloud/huaweicloud-sdk-core | — |
| 串口通信 | serialport | — |
| 日志 | morgan | — |

---

## 后端 — API 路由全景

| 路由前缀 | 文件 | 端点 | 认证 |
|----------|------|------|------|
| `/api/v1/auth` | auth.js | `POST /login` `GET /me` | 否/是 |
| `/api/v1/devices` | devices.js | CRUD + 串口绑定 + 华为云绑定 + 灌溉启停 | JWT |
| `/api/v1/dashboard` | dashboard.js | `GET /stats` `GET /trends-24h` | JWT |
| `/api/v1/plots` | plots.js | 完整 CRUD | JWT |
| `/api/v1/strategies` | strategies.js | 完整 CRUD | JWT |
| `/api/v1/irrigation-logs` | irrigation-logs.js | 分页查询 | JWT |
| `/api/v1/alerts` | alerts.js | 列表查询 + 标记处理 | JWT |
| `/api/v1/schedules` | schedules.js | CRUD + 启用/禁用 | JWT |
| `/api/v1/export` | export.js | CSV 导出 (sensor + irrigation) | JWT |
| `/api/v1/huawei` | huawei-callback.js | `POST /data` (Webhook) | 无 |

---

## 后端 — 核心流程：Webhook 数据接收

```
  POST /api/v1/huawei/data          ← 华为云 HTTP 转发
          │
          ▼
  ┌─────────────────────────────────────────┐
  │         huawei-callback.js              │
  │                                         │
  │  1. 解析 device_id (支持 PascalCase)     │
  │  2. SELECT devices WHERE huawei_device_id│
  │  3. 规范化属性名 (兼容多种命名格式)       │
  │  4. INSERT INTO sensor_data             │
  │  5. UPDATE devices.online_status        │
  │  6. checkAlerts() — 告警阈值检查          │
  │  7. runStrategies() — 自动灌溉判定       │
  │  8. brokerRef.publish() → MQTT 推送前端  │
  └─────────────────────────────────────────┘
```

**属性兼容**: 同时匹配 `soil_moisture` / `SoilMoisture` / `soil_moisture_val`

---

## 后端 — 核心流程：命令下发

```
  前端点击 "开始灌溉"
          │
          ▼
  POST /api/v1/devices/:id/irrigate/start
          │
          ▼
  ┌────────────────────────────────────────────┐
  │             devices.js                      │
  │                                            │
  │  1. 查询设备 (device_sn, huawei_device_id)  │
  │  2. 检查无正在进行的灌溉                     │
  │                                            │
  │  ┌─── 优先级1: 华为云 REST API ───┐         │
  │  │ huawei-iot.js                  │         │
  │  │ IAM 用户/密码 → Token           │         │
  │  │ POST .../devices/{id}/commands │         │
  │  │ {"name":"StartIrrigation",     │         │
  │  │  "paras":{"duration_sec":30}}  │         │
  │  └────────────────────────────────┘         │
  │                                            │
  │  ┌─── 优先级2: UART 串口 ─────────┐         │
  │  └────────────────────────────────┘         │
  │                                            │
  │  ┌─── 优先级3: 内部 MQTT ─────────┐         │
  │  │ cmd/{device_sn}/pump           │         │
  │  └────────────────────────────────┘         │
  │                                            │
  │  3. INSERT irrigation_logs (status=running) │
  │  4. setTimeout 自动停止 (兜底机制)           │
  └────────────────────────────────────────────┘
```

---

## 后端 — 告警 & 策略引擎

<div class="columns">
<div>

### alert-engine.js

```
checkAlerts(deviceId, plotId, sn, props)
│
├── 加载地块灌溉策略 (阈值)
├── 检查: 土壤湿度 < humidity_min
│        土壤湿度 > humidity_max
│        温度 > temp_max
│        温度 < temp_min
│
├── 30分钟冷却机制
│   同设备同类型不重复告警
│
└── INSERT INTO alerts
    (warn / critical)
```

</div>
<div>

### strategy-engine.js

```
runStrategies(deviceId, plotId, sn, payload)
│
├── 查询地块启用策略
├── 判断: 湿度在阈值范围内
├── 检查: 无重叠运行策略
├── 检查: 冷却间隔已过
│
├── 匹配 → 触发自动灌溉
│   ├── INSERT irrigation_logs
│   │   (trigger_type=auto)
│   ├── INSERT alerts
│   └── 返回 { duration_sec }
│
└── 未匹配 → 跳过 (已是最优状态)
```

</div>
</div>

---

## 后端 — FRP 内网穿透架构

本机没有公网 IP，华为云 Webhook 无法直接访问。通过 FRP 将阿里云服务器流量转发到本地。

```
  华为云 IoTDA               阿里云 ECS (47.96.100.108)             本机 Windows
  ──────────                ────────────────────────             ──────────────
                            ┌─────────────────────┐            ┌──────────────┐
  Webhook POST ──────────▶  │ frps (服务端)        │  FRP隧道   │ frpc (客户端) │
  http://47.96.100.108      │ :7000 控制 (TCP)     │◀──────────│ WSL Ubuntu    │
  :8081/api/v1/huawei/data  │ :8080 → 3000 (HTTP)  │           │ :8080→8080   │
                            │ :8081 → 8080 (TCP)   │           │ :3000→3000   │
                            └─────────────────────┘            └──────────────┘
                            认证: Token 23485615...             localIP: 192.168.32.1
```

**阿里云安全组已放行**: 7000, 8080, 8081 端口

---

<!-- _header: '四、嵌入式开发' -->

## 嵌入式 — 硬件配置

| 项目 | 规格 |
|------|------|
| **主控芯片** | Hi3861V100 (RISC-V 32-bit, 160MHz) |
| **操作系统** | Huawei LiteOS (RTOS) |
| **RAM** | 352KB SRAM |
| **Flash** | 2MB |
| **WiFi** | 2.4GHz IEEE 802.11b/g/n |
| **传感器扩展板** | E53_IA1 |
| **温湿度** | SHT30 (I2C, GPIO_0/GPIO_1) |
| **光照** | BH1750 (I2C, 同总线) |
| **土壤湿度** | 外接 ADC 采集 (Channel 2) |
| **继电器** | GPIO_8 (高电平=ON, 控制水泵) |
| **状态 LED** | GPIO_14 |
| **串口** | CH340 USB-Serial, 115200 baud |

---

## 嵌入式 — 固件架构

```
SmartAgEntry()                          // APP_FEATURE_INIT 入口
│
├── Relay_Init()                        // GPIO_8 初始化 (防上电误转)
├── Config_Load() / Config_ApplyDefaults()  // Flash 读取 / 默认配置
│
├──▶ task_main_entry (prio=26, 10KB 栈)
│   ├── WifiConnect(ssid, pwd)
│   ├── dtls_al_init() + mqtt_al_init() + oc_mqtt_init()
│   ├── queue_create("queue_rcvmsg", 16)
│   ├── oc_mqtt_profile_connect()         // 华为云 MQTT 连接
│   │   ├── device_id / device_passwd (密码认证)
│   │   ├── server: 117.78.5.125:1883
│   │   └── 注册 msg_rcv_callback (命令接收)
│   └── while(1): queue_pop() → dispatch
│       ├── en_msg_report → deal_report_msg()
│       │   └── oc_mqtt_profile_propertyreport()
│       │       5属性: Temperature Humidity Luminance
│       │              SoilMoisture MotorStatus
│       └── en_msg_cmd → deal_cmd_msg()
│           ├── StartIrrigation → Relay_On() + osTimerStart
│           ├── StopIrrigation  → Relay_Off()
│           └── SetConfig → Config_Save()  (Flash 持久化)
│
├──▶ task_sensor_entry (prio=24, 4KB 栈)
│   ├── E53_IA1_Init() + SoilMoisture_Init()
│   └── while(1):
│       ├── E53_IA1_Read_Data() + SoilMoisture_Read()
│       ├── queue_push(report)              // 推送到主任务
│       └── sleep(SENSOR_INTERVAL_SEC)      // 30 秒
│
└──▶ task_config_entry (仅无配置时, prio=28)
    └── 打印配网提示 (通过 SetConfig 云端命令配网)
```

---

## 嵌入式 — 存储架构

```
┌─────────────────────────────────────────────────┐
│              Hi3861 Flash (2MB)                  │
├──────────┬──────────┬──────────┬────────────────┤
│ Boot     │  NV      │  App     │  USER_RESERVE  │
│ Loader   │  (参数)   │  (固件)   │  (配置存储)     │
│          │          │          │  0x1F0000 4KB  │
└──────────┴──────────┴──────────┴────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ flash_config_t  │
                                    │─────────────────│
                                    │ magic: "SAGC"   │
                                    │ version: 1      │
                                    │ cfg:            │
                                    │  wifi_ssid[32]  │
                                    │  wifi_pwd[32]   │
                                    │  cloud_id[64]   │
                                    │  cloud_pwd[48]  │
                                    │  cloud_server[] │
                                    │  cloud_port[]   │
                                    └─────────────────┘

Config_Load(): Flash 读取 → magic 校验 → memcpy
Config_Save(): Flash 擦除 (4KB) → 写入 → 重启生效
Config_ApplyDefaults(): 回退到 config.h 硬编码值
```

---

## 嵌入式 — SDK & 构建系统

| 项目 | 值 |
|------|-----|
| SDK 路径 | `D:\bearpi-hm_nano` |
| 构建系统 | **GN + Ninja** |
| 编译器 | riscv32-unknown-elf-gcc 7.3.0 |
| 产品配置 | `build/lite/product/BearPi-HM_Nano.json` |
| 编译命令 | `python3 build.py BearPi-HM_Nano` |
| 产物 | `Hi3861_wifiiot_app_burn.bin` (烧录用) |
| | `Hi3861_wifiiot_app_ota.bin` (OTA) |
| | `Hi3861_wifiiot_app_allinone.bin` (全量) |
| 烧录工具 | HiBurn (Windows GUI, 921600 baud) |
| 华为云 SDK | `third_party/iot_link/` (oc_mqtt v5) |

---

## 嵌入式 — 关键 Bug 修复记录

<div class="tiny">

| # | 现象 | 根因 | 修复 |
|---|------|------|------|
| 1 | 串口无输出 | APP_FEATURE_INIT 中 printf 卡死 | 删除 init printf |
| 2 | 电机一直转 (上电误触发) | RELAY_ACTIVE_LOW 设反 + 初始化冲突 | config.h 改为 0 + Relay_Init 自包含 |
| 3 | 数据入库全 null | webhook 只匹配 snake_case | 兼容 PascalCase |
| 4 | 数据转发不触发 | 华为云规则选了"设备消息" | 控制台改为"设备属性" |
| 5 | WiFi 连不上 | 5GHz 不兼容 Hi3861 | 换 2.4GHz 热点 |
| 6 | 串口配网崩溃 | getchar() 在 Hi3861 不可用 | 改为云命令配网 (SetConfig) |
| 7 | KV Store 写入崩 | 命令处理线程调文件系统 crash | 改用 hi_flash_write 直写 |
| 8 | strcmp(NULL) 崩 | cJSON_GetStringValue 返回 NULL | NULL guard + _cmd 兜底 |
| 9 | REST API 401/403/404 | endpoint 错误 + IAM 权限 | iotda-app endpoint + IoTDA FullAccess |
| 10 | service_id 不匹配 | 华为云产品模型改为 `SetConfig` | `SERVICE_ID` 宏同步修改 |

</div>

---

<!-- _header: '总结' -->

## 项目亮点

<div class="columns">
<div>

**技术深度**
- 端到端全链路：板子 → 云 → 后端 → 前端
- 华为云 IoTDA 全功能：设备管理 + MQTT + Webhook + REST 命令
- RTOS 多任务并发 (3 个线程 + 消息队列)
- Flash 直写持久化配置
- FRP 内网穿透解决开发环境网络限制

</div>
<div>

**工程实践**
- 3 级命令下发优先级 (云端 → 串口 → MQTT)
- 30 分钟告警冷却防重复
- 双引擎：告警 + 自动策略
- 属性名多格式兼容 (PascalCase/snake_case)
- 服务端兜底自动停止灌溉
- JWT 认证 + 路由守卫

</div>
</div>

---

<!-- _class: lead -->
<!-- _header: '' -->
<!-- _footer: '' -->

![bg opacity:.1](https://img.icons8.com/fluency/512/iot.png)

# 谢谢

## Thank You

**智慧农业灌溉系统**
Smart Agriculture Irrigation System

<div style="margin-top:3em;color:#6b7db3;font-size:0.9em;">
端到端物联网解决方案 | 华为云 IoTDA + BearPi + Vue 3
</div>
