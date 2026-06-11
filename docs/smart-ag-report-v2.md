---
marp: true
theme: default
class:
  - lead
size: 16:9
paginate: true
backgroundColor: '#ffffff'
color: '#1e293b'
header: '智慧农业灌溉系统'
footer: 'Smart Agriculture · 项目答辩'
style: |
  section {
    font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
    padding: 40px 60px;
  }
  h1 {
    color: #059669;
    font-size: 1.8em;
    border-bottom: 3px solid #10b981;
    padding-bottom: 8px;
    margin-bottom: 24px;
  }
  h2 {
    color: #047857;
    font-size: 1.4em;
    border-bottom: 2px solid #6ee7b7;
    padding-bottom: 6px;
    margin-bottom: 20px;
  }
  h3 { color: #059669; font-size: 1.1em; margin-bottom: 12px; }
  table {
    font-size: 0.8em;
    margin: 12px auto;
    border-collapse: collapse;
  }
  th {
    background: #059669;
    color: white;
    padding: 6px 12px;
  }
  td {
    border: 1px solid #d1fae5;
    padding: 5px 10px;
  }
  tr:nth-child(even) td { background: #f0fdf4; }
  code {
    background: #ecfdf5;
    color: #047857;
    font-size: 0.85em;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f0fdf4;
    border: 1px solid #d1fae5;
    border-left: 3px solid #10b981;
    font-size: 0.62em;
    padding: 12px 16px;
    line-height: 1.4;
  }
  ul li { margin: 4px 0; font-size: 0.9em; }
  p { font-size: 0.9em; line-height: 1.6; }
  strong { color: #047857; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .small { font-size: 0.75em; }
  .tiny { font-size: 0.62em; }
  .center { text-align: center; }
  blockquote { border-left: 3px solid #10b981; padding-left: 16px; color: #64748b; }
---

<!-- _class: lead -->
<!-- _footer: '' -->
<!-- _header: '' -->

![bg right:40% 80%](https://img.icons8.com/fluency/256/iot.png)

# 智慧农业灌溉系统
## Smart Agriculture Irrigation System

**基于华为云 IoTDA + BearPi-HM Nano**
**端到端全链路物联网解决方案**

<div style="margin-top:3em;color:#64748b;font-size:0.85em;">
2026 年 6 月 · 项目答辩
</div>

---

<!-- _header: '项目概述' -->

## 项目概述

本系统是一套完整的**智慧农业物联网灌溉解决方案**，实现从传感器采集、云端传输、业务处理、AI 决策到多端可视化的端到端闭环。

<div class="columns">
<div>

**技术栈**
- 嵌入式：Hi3861 RISC-V + LiteOS
- 云平台：华为云 IoTDA (cn-north-4)
- 后端：Node.js + Express + Socket.io
- 数据库：MySQL 8.0 + InfluxDB 2.x + Redis 7
- 前端：Vue 3 + Element Plus + ECharts
- 通信：MQTT QoS1 + FRP 内网穿透
- AI：小米 MiMo v2.5-pro

</div>
<div>

**核心功能**
- 3 设备节点：灌溉 + 消防 + 安防
- 30s 周期多传感器实时采集
- 手动/定时/自动/AI 四种灌溉模式
- 告警 + 策略 + AI 决策 + 异常检测 四引擎
- 入侵联动：安防报警 → 自动停泵
- Web 仪表盘 + 微信小程序双端
- FRP 内网穿透解决公网访问

</div>
</div>

---

<!-- _header: '' -->
<!-- _style: |
  section { padding: 20px 30px; }
  pre { font-size: 0.72em; }
  h2 { font-size: 1.2em; margin-bottom: 8px; }
-->

## 系统架构全景图

```
                         ─── 数据上行 ───▶
                         ◀── 命令下行 ───

 ┌────────────────────────────────────────────────────────────────────┐
 │  🖥️  前端展示层                                                     │
 │  Vue 3 + Element Plus + ECharts  │  微信小程序 (原生 WXML+WXSS)     │
 │  Dashboard · Monitor · AI Chat · Alerts · 灌溉控制                 │
 └───────────────────────────────┬────────────────────────────────────┘
                                 │  WebSocket (Socket.io :8080/ws)
 ┌───────────────────────────────┴────────────────────────────────────┐
 │  ⚙️  后端服务层 :8080                                               │
 │  Express Server + 11 API 路由 + Socket.io                          │
 │  中间件链: webhookAuth → idempotent(Redis去重) → cleanPayload      │
 │  4 引擎: alert-engine │ strategy-engine │ ai-decision │ anomaly    │
 │  命令下发: huawei-iot.js (REST API) │ serial-gateway.js (UART备用)  │
 └───────────┬────────────────┬────────────────┬─────────────────────┘
             │                │                │
             ▼                ▼                ▼
 ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
 │  💾 MySQL 8.0  │ │ ⏱️ InfluxDB 2.x│ │  ⚡ Redis 7    │
 │  业务主数据     │ │  时序存储      │ │  去重 · 缓存   │
 │  8 张业务表    │ │  自动过期      │ │  快速失败模式  │
 │  InfluxDB      │ │  高吞吐写入    │ │  Webhook去重   │
 │  降级备用      │ │  Flux 查询     │ │  1200ms→10ms  │
 └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
         ▲                  ▲                   ▲
         └──────────────────┼───────────────────┘
                            │  数据双写 (Webhook 入口)
 ┌──────────────────────────┴─────────────────────────────────────────┐
 │  🔗  网络穿透层 (FRP)                                               │
 │  阿里云 ECS frps (47.96.100.108)  ←→  WSL frpc (本机)              │
 │  Webhook 入口 :8081 → 本机后端 :8080  │  前端入口 :8080 → 本机 :3000 │
 └──────────────────────────────┬─────────────────────────────────────┘
                                │  HTTP POST (Webhook 回调)
 ┌──────────────────────────────┴─────────────────────────────────────┐
 │  ☁️  华为云 IoTDA (cn-north-4)                                      │
 │  MQTT Broker (117.78.5.125:1883)  │  规则引擎 → Webhook 转发        │
 │  REST API 命令下发 (IAM Token 认证, 20min 缓存)                     │
 │  设备影子: smart-001 · smart-002 · smart-003                       │
 └──────────────────────────────┬─────────────────────────────────────┘
                                │  MQTT QoS1          │  REST API
                                │  (数据上报)          │  (命令下发)
 ┌──────────────────────────────┴─────────────────────────────────────┐
 │  📶  通信层                                                         │
 │  WiFi 2.4GHz (主通道)           │  UART 115200 (备用命令通道)       │
 └──────────────────────────────┬─────────────────────────────────────┘
                                │
 ┌──────────────────────────────┴─────────────────────────────────────┐
 │  🔧  设备层 (BearPi-HM Nano · Hi3861 RISC-V · Huawei LiteOS)        │
 │  #1 smart-001 │ E53_IA1 灌溉 │ SHT30 + BH1750 + Soil ADC + Relay   │
 │  #2 smart-002 │ E53_SF1 消防 │ MQ-2 烟雾传感器 + 蜂鸣器            │
 │  #3 smart-003 │ E53_IS1 安防 │ PIR 人体红外 + 蜂鸣器               │
 └────────────────────────────────────────────────────────────────────┘
```

**上行**: 传感器(30s) → MQTT → 华为云IoTDA → Webhook → **FRP** → 后端 → MySQL+InfluxDB+Redis → Socket.io → 前端
**下行**: 前端 → 后端 → REST API(IAM Token) → 华为云IoTDA → MQTT → 设备继电器
**端到端延迟 < 1s**（不含采集周期）· **四引擎协同**: 告警(阈值+30min冷却) + 策略(规则/AI双模) + AI决策(MiMo) + 异常检测(Z-Score)

---

<!-- _header: '一、嵌入式设备层' -->

## 嵌入式 — 硬件配置

| 项目 | 规格 |
|------|------|
| **主控芯片** | Hi3861V100 (RISC-V 32-bit, 160MHz) |
| **操作系统** | Huawei LiteOS (RTOS) |
| **RAM / Flash** | 352KB SRAM / 2MB Flash |
| **WiFi** | 2.4GHz IEEE 802.11b/g/n |
| **温湿度传感器** | SHT30 (I2C, GPIO_0/GPIO_1) |
| **光照传感器** | BH1750 (I2C, 同总线) |
| **土壤湿度** | 外接 ADC 采集 (Channel 2) |
| **继电器** | GPIO_8 (高电平=ON, 控制水泵) |
| **串口** | CH340 USB-Serial, 115200 baud |

---

## 嵌入式 — 三设备节点

| 设备 | SN | 华为云 ID | 扩展板 | 传感器 | 执行器 | 固件 |
|------|-----|-----------|--------|--------|--------|------|
| **#1 灌溉主控** | BPN-001 | `smart-001` | E53_IA1 | SHT30+BH1750+Soil ADC | Relay (水泵) | `smart_ag_cloud` |
| **#2 消防监测** | BPN-002 | `smart-002` | E53_SF1 | MQ-2 烟雾 | 蜂鸣器 | `smart_ag_fire` |
| **#3 安防监测** | BPN-003 | `smart-003` | E53_IS1 | PIR 人体红外 | 蜂鸣器 | `smart_ag_security` |

<div class="small">

- **#1** 采集 5 项传感器数据 + 控制水泵，是系统的核心节点
- **#2** MQ-2 烟雾 PPM > 200 触发消防报警
- **#3** PIR 检测人体闯入 → **联动 #1 自动停泵**（分布式安防联动）

</div>

---

## 嵌入式 — 固件线程架构 (3 线程 + 消息队列)

```c
SmartAgEntry()                       // APP_FEATURE_INIT 入口
│
├── Relay_Init()                     // GPIO_8 先初始化 (防上电误转)
├── Config_Load()                    // Flash 读取配置，无效则 ApplyDefaults
│
├─▶ task_main_entry (prio=26, 10KB)  // 主线程: MQTT 连接 + 消息分发
│   ├── WifiConnect(ssid, pwd)
│   ├── oc_mqtt_profile_connect()    // server: 117.78.5.125:1883
│   ├── queue_create("rcvmsg", 16)   // 16 槽消息队列
│   └── while(1): queue_pop() → dispatch
│       ├── en_msg_report → oc_mqtt_profile_propertyreport() // 5 属性上报
│       └── en_msg_cmd → deal_cmd_msg()
│           ├── StartIrrigation  → Relay_On() + osTimerStart
│           ├── StopIrrigation   → Relay_Off()
│           └── SetConfig → hi_flash_write() 持久化
│
├─▶ task_sensor_entry (prio=24, 4KB)  // 传感器采集线程
│   └── while(1):
│       ├── SHT30 + BH1750 + ADC 读取
│       ├── queue_push(report)         // 推送到主线程上报
│       └── osDelay(30s)               // 30 秒采集周期
│
└─▶ task_config_entry (prio=28)       // 配网提示 (仅无配置时运行)
```

---

## 嵌入式 — Flash 配置持久化

```c
// Flash 分区: USER_RESERVE 起始地址 0x1F0000, 大小 4KB
typedef struct {
    char magic[4];            // "SAGC" 魔数 — 校验配置是否有效
    uint32_t version;         // 配置版本号
    struct {
        char wifi_ssid[32];    // WiFi 名称
        char wifi_pwd[32];     // WiFi 密码
        char cloud_id[64];     // 华为云设备 ID
        char cloud_pwd[48];    // 华为云设备密钥
        char cloud_server[64]; // MQTT 服务器地址
    } cfg;                     // 共 372 bytes
} flash_config_t;

// 保存流程:  hi_flash_erase(0x1F0000, 0x1000)
//            hi_flash_write(0x1F0000, 372, &cfg)
// 读取流程:  hi_flash_read(0x1F0000, 372, &cfg)
//            检查 cfg.magic == "SAGC" → 有效配置 / 无效 → 默认值
```

<div class="small">

**为什么不用 KV Store？** 命令处理线程调用文件系统 API 会 crash（线程不安全）。改用 `hi_flash_write` 直写 Flash 寄存器解决。

</div>

---

## 嵌入式 — 关键 Bug 修复

<div class="tiny">

| # | 现象 | 根因 | 修复 |
|---|------|------|------|
| 1 | 串口无输出 | APP_FEATURE_INIT 中 printf 卡住 | 删除 init printf |
| 2 | 电机一上电就转 | RELAY_ACTIVE_LOW 宏设反(1→0) | 改 0 + Relay_Init 自包含 GPIO8 |
| 3 | 数据入库全 null | webhook 只匹配 snake_case | 兼容 PascalCase 三段式匹配 |
| 4 | 数据转发不触发 | 规则引擎选了"设备消息" | 控制台改为"设备属性"触发 |
| 5 | WiFi 连不上 | Hi3861 仅支持 2.4GHz | 换 2.4GHz 热点 iqoo11 |
| 6 | 串口配网崩溃 | getchar() 在 RTOS 上不可用 | 改云端 SetConfig 命令配网 |
| 7 | Flash 写入崩溃 | 命令线程调文件系统 API crash | hi_flash_write 直写 Flash |
| 8 | strcmp(NULL) 崩溃 | cJSON_GetStringValue 返回 NULL | NULL guard + _cmd 字段兜底 |
| 9 | REST API 401/403 | endpoint 选错 + IAM 无权限 | iotda-app endpoint + FullAccess |
| 10 | service_id 不匹配 | 产品模型与代码宏不一致 | SERVICE_ID 宏同步为 SmartAgriculture |

</div>

---

## 嵌入式 — 编译与烧录

<div class="columns">
<div>

### SDK & 构建

| 项目 | 值 |
|------|-----|
| SDK | `D:\bearpi-hm_nano` |
| 构建系统 | GN + Ninja (v1523) |
| 编译器 | riscv32-unknown-elf-gcc 7.3.0 |
| 产品配置 | `build/lite/product/BearPi-HM_Nano.json` |

### 编译命令

```bash
cd /mnt/d/bearpi-hm_nano
python3 build.py BearPi-HM_Nano
```

</div>
<div>

### 烧录产物

| 文件 | 用途 |
|------|------|
| `Hi3861_wifiiot_app_burn.bin` | 烧录用 (~815KB) |
| `Hi3861_wifiiot_app_ota.bin` | OTA 升级 |
| `Hi3861_wifiiot_app_allinone.bin` | 全量镜像 |

### 烧录工具

**HiBurn** (Windows GUI)
- 波特率: 921600
- 连接: CH340 USB-Serial
- COM 口: COM3/COM5/COM6

</div>
</div>

<div class="small">

**多设备编译**: 三设备共用同一 SDK。切换 `applications/` 下 `BUILD.gn` 注释选择编译目标，修改 `config.h` 中 `DEVICEID`/`DEVICEPWD` 宏区分设备。编译完需改回默认值。

</div>

---

<!-- _header: '二、云平台 & 通信' -->

## 华为云 IoTDA — 数据上报链路

```
BearPi 板子 (30s 周期采集)
  │
  │  MQTT QoS1, Topic: $oc/devices/{id}/sys/properties/report
  │  5 属性 JSON: Temperature, Humidity, Luminance, SoilMoisture, MotorStatus
  ▼
┌─────────────────────────────────────────┐
│          华为云 IoTDA (cn-north-4)        │
│  ┌──────────────────────────────────┐   │
│  │ MQTT Broker  117.78.5.125:1883   │   │
│  └────────────┬─────────────────────┘   │
│               │ 设备属性上报              │
│  ┌────────────▼─────────────────────┐   │
│  │ 规则引擎 (device.property 触发)    │   │
│  │ → HTTP POST Webhook              │   │
│  └────────────┬─────────────────────┘   │
└───────────────┼─────────────────────────┘
                │
                │ http://47.96.100.108:8081/api/v1/huawei/data
                ▼
          ┌──────────┐
          │ FRP 穿透  │ → 阿里云 ECS (47.96.100.108) → 本机后端 :8080
          └──────────┘
```

---

## 华为云 IoTDA — 命令下发 (3 级优先级)

```
       前端/小程序 点击"开始灌溉"
                  │
                  ▼
        POST /api/v1/devices/:id/irrigate/start
                  │
    ┌─────────────┴──────────────┐
    │                             │
    ▼                             │
┌──────────────────────┐          │
│ ⭐ 优先级1: REST API   │          │
│ huawei-iot.js         │          │
│ IAM Token (缓存20min)  │          │
│ POST /v5/iot/.../     │          │
│   devices/{id}/       │          │
│   commands            │          │
│ → MQTT 下发到设备      │          │
└──────┬───────────────┘          │
       │ 成功                     │ 失败
       ▼                          ▼
  ┌──────────┐          ┌──────────────────┐
  │ 板子执行  │          │ 🔻 优先级2: UART   │
  │ Relay_On │          │ serial-gateway.js │
  └──────────┘          │ 串口备用通道       │
                        └────────┬─────────┘
                                 │ 设备非 UART
                                 ▼
                        ┌──────────────────┐
                        │ 🔻 优先级3: 日志   │
                        │ (依赖华为云重试)   │
                        └──────────────────┘
```

---

## 华为云 — REST API 命令下发代码

```javascript
// huawei-iot.js — 华为云 REST API 命令下发
export async function sendCommand(huaweiDeviceId, commandName, params = {}) {
  // ⚠️ REST API 用 name 字段, MQTT 下发用 command_name
  // 两者字段名不同，所以在 paras 里额外塞 _cmd 供固件兜底识别
  params._cmd = commandName

  // 1. 获取 IAM Token — 缓存 20 分钟，避免每次请求都认证
  const token = await getIAMToken()  // HTTPS POST iam.cn-north-4.../v3/auth/tokens

  // 2. 调用 IoTDA REST API 下发命令
  const body = JSON.stringify({
    name: commandName,               // 命令名: StartIrrigation/StopIrrigation/SetConfig
    service_id: 'SmartAgriculture',   // 华为云产品服务 ID
    paras: params                     // 参数含 _cmd 兜底
  })
  // IoTDA 通过 MQTT 推送到设备 → 设备 deal_cmd_msg() 执行
}
```

---

## FRP 内网穿透 — 为什么需要 & 如何实现

<div class="columns">
<div>

### 问题

本机 (Windows + WSL) **没有公网 IP**。

华为云 IoTDA 的 Webhook 只能向公网地址推送数据，无法直接回调到本机后端。

### 方案

在阿里云 ECS (有公网 IP) 上部署 **frps**，本机 WSL 运行 **frpc**，两者建立 TCP 隧道，将 ECS 公网端口的流量转发到本机。

</div>
<div>

### 数据流向

```
华为云 IoTDA
  │
  │ ① Webhook HTTP POST
  │   目标: 47.96.100.108:8081
  ▼
┌─────────────────────┐
│ 阿里云 ECS (公网)     │
│ frps 服务端           │
│                      │
│ :7000 ←→ 控制通道     │
│ :8081 → frpc → :8080 │
│ :8080 → frpc → :3000 │
│                      │
│ 安全组: 7000,8080,    │
│        8081 放行      │
└────────┬────────────┘
         │
         │ ② TCP 隧道 (Token 认证)
         ▼
┌─────────────────────┐
│ 本机 WSL Ubuntu      │
│ frpc 客户端           │
│ localIP: 192.168.32.1│
│                      │
│ → localhost:8080 后端 │
│ → localhost:3000 前端 │
└─────────────────────┘
```

</div>
</div>

<div class="small">

**端口映射**: ECS `:8081` → 本机 `:8080` (后端 API + Webhook 接收) · ECS `:8080` → 本机 `:3000` (前端页面)
**关键配置**: frpc 的 `localIP` 必须设为 `192.168.32.1`（WSL 网关 IP），不能用 `127.0.0.1`

</div>

---

<!-- _header: '三、后端服务层' -->

## 后端 — 技术架构

| 类别 | 技术 | 用途 |
|------|------|------|
| 运行时 | Node.js 22 | JavaScript 服务端 |
| Web 框架 | Express 4 | HTTP API 路由 + 中间件 |
| 实时推送 | Socket.io 4 | 传感器数据推送前端 (4 类事件) |
| 数据库 | mysql2/promise | MySQL 连接池 (10 连接) |
| 时序库 | @influxdata/influxdb-client | InfluxDB 2.x Flux 查询 |
| 缓存 | ioredis | Redis 去重 / 限流 / 缓存 |
| 认证 | jsonwebtoken + bcryptjs | JWT Token + 密码哈希 |
| AI | openai SDK | MiMo API (OpenAI 兼容协议) |
| 串口 | serialport | UART 备用命令下发 |

---

## 后端 — API 路由全景

| 路由 | 文件 | 核心端点 | 认证 |
|------|------|---------|------|
| `/api/v1/auth` | auth.js | `POST /login`, `POST /wechat-login`, `GET /me` | 否/是 |
| `/api/v1/devices` | devices.js | CRUD + 串口绑定 + **灌溉启停** + 传感器历史 | JWT |
| `/api/v1/dashboard` | dashboard.js | `GET /stats`, `GET /trends-24h` | JWT |
| `/api/v1/plots` | plots.js | 地块 CRUD | JWT |
| `/api/v1/strategies` | strategies.js | 灌溉策略 CRUD + 启用/禁用 | JWT |
| `/api/v1/irrigation-logs` | irrigation-logs.js | 分页查询 + 状态筛选 | JWT |
| `/api/v1/alerts` | alerts.js | 告警列表 + `PUT /:id/resolve` | JWT |
| `/api/v1/schedules` | schedules.js | Cron 定时灌溉 CRUD | JWT |
| `/api/v1/export` | export.js | CSV 导出 (传感器 + 灌溉记录) | JWT |
| `/api/v1/huawei` | huawei-callback.js | `POST /data` Webhook 接收 | **无** |
| `/api/v1/ai` | ai.js | `POST /chat`, `POST /decision`, `GET /anomalies` | JWT |

---

## 后端 — Webhook 数据处理全链路

```
POST /api/v1/huawei/data                   ← 华为云 → FRP → 本机后端
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  中间件链 (app.js 注册, 按序执行)                             │
│  ① webhookAuth           HMAC-SHA256 签名校验 (防伪造)       │
│  ② webhookIdempotent     Redis SET NX EX 300 去重 (防重复)   │
│      └─ Redis 故障 → 降级放行, 不阻塞业务                     │
├─────────────────────────────────────────────────────────────┤
│  路由处理 (huawei-callback.js)                               │
│  ③ 解析 device_id  →  SELECT devices WHERE huawei_device_id │
│  ④ cleanPayload(): 属性名兼容 + 故障码 999/998 检测           │
│      + 物理边界检查 + 强制转浮点 (保留2位小数)                 │
│  ⑤ 安防入侵检测 → 同地块全部灌溉节点紧急 StopIrrigation       │
│  ⑥ writeSensorData() → InfluxDB (不可用时静默跳过)           │
│  ⑦ INSERT INTO sensor_readings → MySQL 冗余备份              │
│  ⑧ UPDATE devices SET online_status=1, last_sensor_data=...  │
│  ⑨ checkAlerts()      → 4 类阈值检查 (30min 冷却)            │
│  ⑩ checkAnomalies()   → AI Z-Score 异常检测 (60min 冷却)     │
│  ⑪ runStrategies()    → 自动灌溉策略判定 (规则/AI 双模式)     │
│  ⑫ broadcastSensorData() → Socket.io 推送前端 Dashboard      │
└─────────────────────────────────────────────────────────────┘
```

---

## 后端 — 数据清洗 (属性兼容 + 故障检测)

```javascript
// huawei-callback.js — cleanPayload()
const FAULT_CODES = new Set([999, 998])  // 传感器上报的故障码
const FIELD_BOUNDS = {                   // 各字段物理边界
  soil_moisture: [0, 100],              // 百分比
  soil_temp:     [-20, 80],             // °C
  air_temp:      [-30, 70],             // °C
  air_humidity:  [0, 100],              // 百分比
  light:         [0, 200000]            // Lux
}

// ⭐ 三段式属性名兼容 — 同时匹配多种命名格式
const payload = {
  soil_moisture: properties.soil_moisture       // snake_case (MQTT 原生)
              ?? properties.SoilMoisture        // PascalCase (华为云 Webhook)
              ?? properties.soil_moisture_val   // 旧格式兼容
              ?? null,
  // ... 其他字段同理
}
// 故障码 999/998 → 擦除该字段 + INSERT alerts (sensor_fault)
// 超物理边界 → 擦除该字段 + INSERT alerts (sensor_fault)
```

---

## 后端 — Redis 去重 & InfluxDB 降级

<div class="columns">
<div>

### Redis 幂等去重

```javascript
// middleware/idempotent.js
// 去重键策略:
//   优先: 华为云 request_id
//   降级: SHA256(body) + 10s 窗口

const isFirst = await checkDedup(key, 300)
if (!isFirst) {
  // ⚠️ 返回 200 (非 4xx)
  // → 避免华为云反复重试推送
  return res.json({ code:0 })
}
```

```javascript
// redis.js — 快速失败模式
retryStrategy() { return null }
// 改动前: 1200ms (10次重试)
// 改动后: 10ms (立即降级)
```

</div>
<div>

### InfluxDB 优雅降级

```javascript
// influxdb.js — 高阶守卫函数
const _guard = (fn, defaultVal) =>
  async (...args) => {
    if (!_available) return defaultVal
    try { return await fn(...args) }
    catch (e) {
      if (e.code === 'ECONNREFUSED') {
        _available = false  // 标记不可用
        return defaultVal   // 不抛错!
      }
      throw e
    }
  }

// 应用: queryFlux → 不可用时返回 []
//       writePoint → 不可用时静默跳过
// 前端查询自动回退 MySQL sensor_readings
```

</div>
</div>

---

## 后端 — 告警引擎 & 策略引擎

<div class="columns">
<div>

### alert-engine.js

```
checkAlerts(deviceId, plotId, sn, props)
│
├── 加载地块灌溉策略的阈值
│   取最严格的一组:
│   · humidity_min = max(所有策略min)
│   · humidity_max = min(所有策略max)
│
├── 4 类阈值检查:
│   · 土壤湿度过低 (< min) → danger
│   · 土壤湿度过高 (> max) → danger
│   · 温度过高 (> temp_max) → warning
│   · 温度过低 (< temp_min) → warning
│
├── 30min 冷却: 同设备同类型不重复
│
└── INSERT alerts (InfluxDB)
```

</div>
<div>

### strategy-engine.js

```
runStrategies(deviceId, plotId, sn, payload)
│
├── 查询地块启用的灌溉策略
│
├── 规则模式 (decision_mode='rule'):
│   湿度 < humidity_min → 触发灌溉
│
├── AI 模式 (decision_mode='ai'):
│   调用 MiMo 多因素分析
│   置信度 > 阈值 → 触发灌溉
│   + 300s 冷却 (节省 LLM 费用)
│
├── 防护机制:
│   · checkRunningIrrigation() 防重叠
│   · checkRecentIrrigation() 冷却
│   · duration ≤ duration_max
│
└── INSERT irrigation_logs (InfluxDB)
```

</div>
</div>

---

## 后端 — 分布式安防联动

```
  设备 #3 (smart-003) — PIR 检测到人体闯入
           │
           │  MQTT 上报: intrusion_detected=1
           ▼
  华为云 IoTDA → Webhook → FRP → huawei-callback.js
           │
           ▼
  ┌────────────────────────────────────────────┐
  │  // 1. 写入告警记录                         │
  │  INSERT alerts (level=danger,              │
  │    type=intrusion)                         │
  │                                            │
  │  // 2. 查找同地块灌溉节点 → 紧急停泵         │
  │  SELECT * FROM devices                     │
  │    WHERE plot_id = ?                       │
  │    AND device_type IN ('bearpi_nano','pump')│
  │  → sendCommand(StopIrrigation,             │
  │       reason="intrusion")                  │
  │                                            │
  │  // 3. Socket.io → 前端弹窗 + 声光报警       │
  │  broadcastAlert({ type:'intrusion',        │
  │    level:'danger' })                       │
  │                                            │
  │  // 4. 入侵解除 (event=clear) →             │
  │  → UPDATE alerts SET resolved=1            │
  │  → sendCommand(ResumeIrrigation) 恢复灌溉   │
  └────────────────────────────────────────────┘
```

---

<!-- _header: '四、AI 智能模块' -->

## AI — 小米 MiMo 模型接入

| 项目 | 配置 |
|------|------|
| 模型 | `mimo-v2.5-pro` |
| API 端点 | `https://token-plan-cn.xiaomimomo.com/v1` |
| 接入协议 | OpenAI 兼容 (openai npm SDK, 零改动) |
| 三模块 | 对话助手 · 灌溉决策 · 异常检测 |

```javascript
// ai/chat-handler.js — 多轮对话 + Function Calling
const response = await client.chat.completions.create({
  model: 'mimo-v2.5-pro',
  messages,              // system prompt + 历史 + 用户消息
  tools,                 // 5 个工具: 查设备/传感器/日志/告警/策略
  tool_choice: isLastRound ? 'none' : 'auto',  // 最后一轮强制无工具
  max_tokens: 2048,
  thinking: { type: 'disabled' }  // ⭐ 必须关闭推理模式, 否则 content 为空
})
// 回退策略: content || reasoning_content — 双重保障防止空回复
```

---

## AI — Function Calling 工具链

```
用户输入: "设备1的土壤湿度怎么样？"
              │
              ▼
┌─────────────────────────────────────────────┐
│  MiMo API (mimo-v2.5-pro)                   │
│  system: "你是智慧农业助手, 可以查询实时数据"  │
│                                             │
│  tools = [                                  │
│    get_device_info       → 查设备信息        │
│    get_latest_sensor_data → 最新传感器数据    │
│    get_irrigation_logs   → 灌溉记录          │
│    get_alerts            → 告警列表          │
│    get_strategies        → 灌溉策略配置       │
│  ]                                          │
├─────────────────────────────────────────────┤
│  Step 1: 模型决定调用                         │
│    get_latest_sensor_data({                 │
│      device_sn: "BPN-20240001"              │
│    })                                       │
│  Step 2: executeToolCall() → MySQL 查询      │
│    返回: { soil_moisture: 35.2, ... }       │
│  Step 3: 模型基于数据生成自然语言回复           │
│    → "设备1当前土壤湿度 35.2%，              │
│       低于建议的 40% 阈值，建议进行灌溉"       │
└─────────────────────────────────────────────┘
```

---

## AI — 异常检测引擎 (Z-Score + 冻结 + 漂移)

```javascript
// ai/anomaly-detector.js — 每次 Webhook 自动触发
export async function checkAnomalies(deviceId, deviceSn, currentPayload) {
  // 取最近 60 条传感器数据做统计基准 (InfluxDB Flux 查询)

  for (const field of ['soil_moisture','soil_temp','air_temp','air_humidity','light']) {
    const currentVal = currentPayload[field]

    // ① 不合理值: 超出物理边界 → danger (立即告警)
    if (currentVal < lo || currentVal > hi) { anomalies.push({...}) }

    // ② Z-Score 突变: |z| > 3 个标准差 → sudden_spike / sudden_drop
    const zScore = Math.abs((currentVal - mean) / std)

    // ③ 传感器冻结: 连续 10 条数据标准差 < 0.01 → 传感器可能卡死
    if (std10 < 0.01 && values.length >= 12) { anomalies.push({...}) }

    // ④ 渐进漂移: 近期均值偏离早期基准 > 20% → 传感器老化或环境渐变
    const drift = Math.abs(maRecent - maOld) / (hi - lo)
    if (drift > 0.2) { anomalies.push({...}) }
  }
  // 60min 同类冷却 + danger 级自动同步写入 alerts 表
}
```

---

## AI — 灌溉决策引擎

```javascript
// ai/ai-decision-engine.js — 多因素 AI 灌溉决策
export async function generateDecision(deviceId) {
  // ── 收集分析上下文 ──
  //   · 当前传感器数据 (5 项: 湿度/土温/气温/空湿/光照)
  //   · 过去 24h 历史趋势 (InfluxDB aggregateWindow)
  //   · 地块灌溉策略 (阈值 + 作物类型 + 时长上限)
  //   · 最近 5 条灌溉记录 (避免频繁灌溉)

  // ── 发送 MiMo AI → 结构化决策 ──
  return {
    should_irrigate: true,     // 是否建议灌溉
    duration_sec: 600,         // 建议灌溉时长 (秒)
    confidence: 0.85,          // 置信度 (0-1, 由模型输出)
    reasoning: "土壤湿度 28% 低于 40% 阈值, " +
               "结合 24h 温度上升趋势和作物类型, " +
               "建议灌溉 10 分钟, 预计用水 12L"
  }
}
// AI 调用冷却 300s (checkAiCooldown) — 节省 LLM 费用
// 策略引擎验证: confidence > 阈值 + cooldown 已过 → 触发自动灌溉
```

---

<!-- _header: '五、数据存储层' -->

## 数据库 — MySQL 8.0 表结构

<div class="tiny">

| 表名 | 核心字段 | 说明 |
|------|---------|------|
| `users` | id, username, password(bcrypt), real_name, role(admin/operator), wechat_openid | 用户认证 + 微信登录 |
| `devices` | id, **device_sn**(UNIQUE), device_name, **huawei_device_id**, device_type, com_port, plot_id(FK), online_status, last_sensor_data | 设备主数据 |
| `plots` | id, plot_name, crop_type, area_sqm | 地块信息 |
| `sensor_readings` | id, device_id(FK), soil_moisture, soil_temp, air_temp, air_humidity, light, created_at | 传感器历史 (InfluxDB 降级回退) |
| `irrigation_strategies` | id, plot_id(FK), strategy_name, humidity_min/max, temp_min/max, **irrigation_duration_max**, **cooldown_interval**, decision_mode(rule/ai), water_flow_rate, enabled | 灌溉策略 |
| `scheduled_tasks` | id, device_id(FK), task_name, **cron_expr**, action, duration_sec, enabled | 定时灌溉计划 |

</div>

<div class="small">

**数据存储策略**: 业务主数据 → MySQL (InnoDB) · 时序数据 → InfluxDB (主) + MySQL sensor_readings (冗余) · 去重/限流 → Redis · 灌溉日志/告警 → InfluxDB (高吞吐写入 + 自动过期)

</div>

---

## 数据库 — ER 关系图

```
  ┌──────────┐       ┌──────────────┐
  │  users   │       │    plots     │
  │──────────│       │──────────────│
  │ id (PK)  │       │ id (PK)      │
  │ username │       │ plot_name    │
  │ role     │       │ crop_type    │
  └────┬─────┘       └──────┬───────┘
       │ N                  │ 1
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│irrigation_logs│◄────│   devices    │────►┌──────────────┐
│  (InfluxDB)  │ N:1 │──────────────│ 1:N │sensor_readings│
└──────────────┘     │ id (PK)      │────►│   (MySQL)    │
                     │ device_sn UQ │     └──────────────┘
                     │ huawei_      │
                     │   device_id  │────►┌──────────────┐
                     │ plot_id FK   │ 1:N │   alerts     │
                     │ online_status│     │  (InfluxDB)  │
                     └──────┬───────┘     └──────────────┘
                            │ 1
                            │ N
                     ┌──────┴──────────┐
                     │ irrigation_     │
                     │ strategies      │
                     │────────────────│
                     │ humidity_min    │
                     │ duration_max    │
                     │ cooldown_interval│
                     │ decision_mode   │
                     └─────────────────┘
```

---

## 数据库 — 容量估算

| 表 | 单条大小 | 日增量 (3设备) | 年增量 | 索引策略 |
|------|---------|--------|--------|---------|
| sensor_readings | ~80 bytes | ~8,640 条 | ~3.1M 条 (~250MB) | (device_id, created_at) |
| irrigation_logs | ~200 bytes | ~15 条 | ~5,500 条 | (device_id, start_time) |
| alerts | ~300 bytes | ~10 条 | ~3,600 条 | (device_id, alert_type) |

<div class="small">

- `sensor_readings` 为核心大表 → 建议**按月分区**，>6 个月数据归档到历史表
- 灌溉日志自动计算用水量: `water_used_l = duration_sec × water_flow_rate`

</div>

---

<!-- _header: '六、前端 & 小程序' -->

## 前端 — 技术选型 & 页面总览

| 路由 | 页面 | 核心功能 |
|------|------|---------|
| `/login` | **登录** | 用户名密码登录 · JWT 持久化 · 401 自动跳转 |
| `/dashboard` | **仪表盘** | 4 stat cards + **5 ECharts 趋势图** (湿度/温度/光照) |
| `/monitor` | **实时监控** | 设备卡片 · Socket.io 实时传感器 · 灌溉开关按钮 |
| `/devices` | **设备管理** | CRUD · 串口绑定 · 华为云 ID 绑定 · 在线状态 |
| `/plots` | **地块管理** | CRUD · 作物类型 · 面积 |
| `/strategies` | **灌溉策略** | 阈值配置 · 时长上限 · 冷却间隔 · 规则/AI 模式 |
| `/irrigation-logs` | **灌溉记录** | 历史灌溉分页 · 状态筛选 |
| `/alerts` | **告警中心** | 阈值告警 · Socket.io 实时推送 · 标记已处理 |
| `/schedules` | **定时任务** | Cron 表达式配置 · 启用/禁用 |
| `/ai-chat` | **AI 助手** | MiMo AI 对话 · 灌溉建议 · 故障诊断 |

<div class="small">

技术栈: **Vue 3** (Composition API) + **Vite 5** + **Pinia** + **Element Plus** + **ECharts 5** + **Socket.io Client** + **Axios** (JWT 拦截器)

</div>

---

## 前端 — Socket.io 实时数据流

```
  后端 Webhook 处理完成
       │
       ▼
  broadcastSensorData(deviceSn, payload)
       │
       ├── io.emit('sensor:data', {...})          // 全局广播
       └── io.to(`device:${sn}`).emit(...)        // 设备专属房间
              │
              ▼
  ┌──────────────────────────────┐
  │  mqttStore (Pinia)           │
  │  latestData[deviceSn] = {    │
  │    soil_moisture, air_temp,  │
  │    air_humidity, light, ...  │
  │  }                           │
  └──────────┬───────────────────┘
             │
      ┌──────┴──────────┐
      ▼                  ▼
  DashboardView      MonitorView
  5 图表实时刷新      设备卡片数据更新
```

<div class="small">

**4 类 Socket.io 事件**: `sensor:data` (传感器) · `sensor:fault` (故障标红) · `alert:new` (新告警弹窗) · `irrigation:status` (灌溉状态变更)

</div>

---

## 前端 — 仪表盘核心代码

```javascript
// DashboardView.vue — 图表数据加载
onMounted(async () => {
  // ⭐ Promise.all 并行请求 (不串行等待), 加载速度提升 5x
  const [statsRes, trendsRes] = await Promise.all([
    getDashboardStats(),    // 统计卡片: 在线数/灌溉次数/用水量
    getTrends24h()          // 24h 趋势数据 (InfluxDB aggregateWindow)
  ]);
  stats.value = statsRes.data;
  loadChartData(trendsRes.data);
});

// loadChartData — 构建 5 个 ECharts 图表配置
// 1. 土壤湿度 (%) 折线图, 绿色
// 2. 土壤温度 (°C) 折线图, 橙色
// 3. 空气温度 (°C) 折线图, 琥珀
// 4. 空气湿度 (%) 折线图, 蓝色
// 5. 光照强度 (Lux) 折线图, 黄色
// 数据来自 MySQL ASC 排序, 前端无需 .reverse()
```

---

## 微信小程序

<div class="columns">
<div>

**技术方案**
- 框架：微信原生 (WXML+WXSS+JS)
- 实时数据：HTTP 轮询 5s
- 认证：wx.login → code → JWT
- 共用后端 API

**为什么选原生？**
- 包体积最小 (~80KB)
- 启动速度最快 (~0.5s)
- 无框架兼容层损耗

</div>
<div>

**5 页面 · 4 组件**
- `pages/login` — 微信一键登录
- `pages/dashboard` — 统计卡片 + 告警
- `pages/monitor` — 传感器卡片网格
- `pages/control` — 灌溉时长 + 倒计时
- `pages/alerts` — 筛选 + 分页

**7 种 CSS 动画**
spring-press · staggerIn · dot-pulse
pill-ripple · btn-shimmer · wave
particle-float

</div>
</div>

---

<!-- _header: '七、运维 & 总结' -->

## Docker 容器编排 & 性能优化

<div class="columns">
<div>

### Docker Compose (5 容器)

| 容器 | 端口 | 说明 |
|------|------|------|
| nginx | :80/:443 | 前端 + 反向代理 |
| backend | :8080 | API + Socket.io |
| mysql | :3306 | 业务数据库 |
| redis | :6379 | 去重/缓存 |
| influxdb | :8086 | 时序数据库 |

</div>
<div>

### 性能优化记录

| 项目 | 改前 | 改后 | 手段 |
|------|------|------|------|
| Webhook | 1200ms | 10ms | Redis 快速失败 |
| InfluxDB 故障 | 500 | 200 | 优雅降级 + MySQL |
| 图表加载 | 串行 | 并行 | Promise.all |
| 构建 | 30s | 2s | Vite 替换 Webpack |
| IAM Token | 每次 | 20min | 内存缓存 |

</div>
</div>

---

## 已解决 & 待完成

| 状态 | 事项 | 备注 |
|------|------|------|
| ✅ | FRP 内网穿透 | 阿里云 ECS frps + WSL frpc |
| ✅ | 数据主路径切换 | 串口 → 华为云 MQTT → Webhook |
| ✅ | Redis 安装 & 优化 | WSL Redis, 快速失败模式 |
| ✅ | InfluxDB 优雅降级 | _guard 模式 + MySQL sensor_readings 冗余 |
| ✅ | AI 三模块 | 对话 Function Calling + 决策 + Z-Score 异常检测 |
| ✅ | 入侵联动 | smart-003 PIR → 全局 StopIrrigation |
| ✅ | 远程静音 | SecurityControl 命令 |
| ⚠ | 设备2 消防烧录 | 固件已编译, 待烧录验证 |
| ⚠ | 小程序真机测试 | 需配置 HTTPS 合法域名 |
| ❌ | HTTPS 证书 | 生产环境需 Nginx + Let's Encrypt |

---

## 项目亮点总结

<div class="columns">
<div>

**技术深度**
- 端到端全链路闭环：板子 → 云 → FRP → 后端 → 前端 + 小程序
- 华为云 IoTDA 全功能：MQTT · Webhook · REST API · 设备影子
- FRP 内网穿透：解决开发环境无公网 IP 难题
- RTOS 3 线程并发 + 16 槽消息队列 + Flash 直写
- 3 级命令下发优先级：REST → UART → MQTT
- AI 深度集成：Function Calling · Z-Score 异常检测 · 多因素决策
- 分布式安防联动：Node B 入侵 → Node A 自动停泵

</div>
<div>

**工程实践**
- 4 引擎协同：告警 · 策略 · AI 决策 · 异常检测
- 优雅降级：InfluxDB / Redis 故障时自动回退
- 数据双写：MySQL + InfluxDB 互为冗余
- 告警 30min 冷却 + AI 调用 300s 冷却
- PascalCase / snake_case 三段式属性兼容
- 服务端 setTimeout 兜底自动停止
- 微信小程序 + Web 双端覆盖

</div>
</div>

---

<!-- _class: lead -->
<!-- _header: '' -->
<!-- _footer: '' -->

![bg opacity:.08](https://img.icons8.com/fluency/512/iot.png)

# 谢谢聆听
## Thank You

**智慧农业灌溉系统**
Smart Agriculture Irrigation System

<div style="margin-top:3em;color:#64748b;font-size:0.85em;">
端到端物联网解决方案 · 华为云 IoTDA + BearPi + Vue 3 + MiMo AI
</div>
