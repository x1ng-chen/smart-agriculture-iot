# 智慧农业灌溉系统

基于 **BearPi-HM Nano (Hi3861 + OpenHarmony)** 和 **华为云 IoTDA** 的端到端智慧农业物联网灌溉解决方案。

## 系统架构

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

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 Web | Vue 3 + Element Plus + ECharts + Vite + Pinia | 管理后台 + 数据可视化看板 |
| 小程序 | 微信原生 WXML/WXSS/JS | 移动端监控控制（48 文件） |
| 后端 | Node.js + Express + Aedes MQTT Broker | REST API + 设备通信 |
| 云平台 | 华为云 IoTDA | 设备接入、数据转发、命令下发 |
| 数据库 | MySQL 8.0 | 业务数据 + 传感器时序存储 |
| 通信 | MQTT + WebSocket + FRP | 设备↔云端 + 前端实时推送 |
| 设备 | BearPi-HM Nano (Hi3861) | 电容式土壤湿度 + DHT22 + BH1750 |
| 部署 | Docker Compose | Nginx + EMQX + MySQL + Redis + InfluxDB |

## 项目结构

```
smart-agriculture-iot/
├── frontend/              # Vue 3 Web 管理后台
│   ├── src/
│   │   ├── api/           # Axios 封装 + JWT 拦截器
│   │   ├── stores/        # Pinia 状态管理 (auth, mqtt)
│   │   └── styles/        # 全局样式
│   └── vite.config.js
├── backend/               # Node.js 后端服务
│   ├── src/
│   │   ├── middleware/     # JWT 认证中间件
│   │   ├── models/        # 数据模型
│   │   ├── routes/        # RESTful API 路由
│   │   ├── services/      # 业务逻辑层
│   │   ├── utils/         # 公共工具
│   │   ├── alert-engine.js     # 告警规则引擎
│   │   ├── app.js              # Express 入口
│   │   ├── config.js           # 配置管理
│   │   ├── db.js               # MySQL 连接池
│   │   ├── huawei-iot.js       # 华为云 IoT Webhook 回调
│   │   ├── mqtt-broker.js      # Aedes MQTT Broker (WebSocket)
│   │   ├── serial-gateway.js   # 串口网关（BearPi 直连）
│   │   └── strategy-engine.js  # 灌溉策略引擎
│   ├── migrations/        # 数据库建表 SQL
│   └── Dockerfile
├── miniprogram/           # 微信小程序（48 文件）
│   ├── pages/
│   │   ├── login/         # 微信一键登录
│   │   ├── dashboard/     # 仪表盘（统计卡片 + 设备列表）
│   │   ├── monitor/       # 传感器实时监控
│   │   ├── control/       # 灌溉控制（时长选择 + 倒计时）
│   │   └── alerts/        # 告警中心（筛选 + 分页）
│   ├── components/        # 4 个可复用组件
│   │   ├── stat-card/     # 统计卡片
│   │   ├── device-card/   # 设备卡片
│   │   ├── sensor-item/   # 传感器指标
│   │   └── alert-item/    # 告警条目
│   └── utils/             # API 封装 + 认证工具
├── device/                # BearPi Nano 嵌入式固件 (C)
│   ├── src/
│   │   ├── drivers/       # 传感器驱动 (DHT22/BH1750/土壤湿度/继电器/OLED)
│   │   ├── network/       # WiFi 连接 + MQTT 客户端
│   │   ├── app/           # 传感器采集、心跳、命令处理
│   │   └── config.h       # WiFi/华为云 IoT 配置
│   └── CMakeLists.txt
├── deploy/                # 部署配置
│   ├── nginx/             # Nginx 反向代理
│   └── scripts/           # 部署脚本
├── docs/                  # 项目文档
│   ├── api.md             # API 接口文档
│   ├── deployment.md      # 部署说明
│   ├── frp-setup.md       # FRP 内网穿透配置
│   ├── mqtt-topics.md     # MQTT Topic 设计
│   └── smart-ag-report.md # 项目技术汇报
└── docker-compose.yml     # 一键部署编排
```

## 快速开始

### 1. 环境要求
- Node.js >= 18
- Docker & Docker Compose（用于 MySQL/EMQX/Redis/InfluxDB）
- BearPi-HM Nano 开发板（设备端）

### 2. 启动基础设施

```bash
docker compose up -d mysql redis emqx influxdb
```

### 3. 后端

```bash
cd backend
cp .env.example .env   # 编辑数据库密码、华为云配置等
npm install
npm run dev             # http://localhost:8080
```

### 4. 前端

```bash
cd frontend
npm install
npm run dev             # http://localhost:3000
```

### 5. 设备端

修改 `device/src/config.h` 中的 WiFi SSID/密码和华为云 IoT 设备凭证，使用 BearPi 编译工具链构建烧录。

详见 [docs/deployment.md](docs/deployment.md)

## 核心功能

- [x] 环境数据采集 — 土壤湿度/温度、空气温湿度、光照强度（30s 周期）
- [x] 华为云 IoTDA 设备接入 — 数据转发 + Webhook 回调 + 命令下发
- [x] 实时数据看板 — MQTT over WebSocket 推送，传感器卡片实时刷新
- [x] 自动灌溉控制 — 多阈值策略引擎（湿度/温度）+ 冷却间隔
- [x] 手动远程控制 — Web 端 + 小程序端双端控制
- [x] 定时灌溉计划 — Cron 表达式调度
- [x] 设备管理 — 注册/在线监控/串口绑定/华为云绑定
- [x] 地块管理 — 地块 CRUD + 种植物类型 + 面积
- [x] 告警通知 — 阈值告警/设备离线/传感器异常，双端查看处理
- [x] 微信小程序 — 5 页面 + 4 组件，登录/监控/控制/告警全功能
- [x] FRP 内网穿透 — 阿里云 ECS 中转，华为云 Webhook 回调到本地后端
- [x] 历史数据查询 — 灌溉记录、传感器数据按时间段检索
- [x] CSV 数据导出 — 传感器历史数据导出
- [ ] 用户权限管理 — RBAC 多角色（开发中）

## MQTT Topic 设计

| Topic | 方向 | 说明 |
|-------|------|------|
| `sensor/{device_sn}/data` | 设备→云端 | 传感器数据上报 |
| `sensor/{device_sn}/heartbeat` | 设备→云端 | 心跳包（60s 间隔） |
| `cmd/{device_sn}/pump` | 云端→设备 | 灌溉控制指令 |
| `cmd/{device_sn}/config` | 云端→设备 | 配置下发 |
| `cmd/{device_sn}/ota` | 云端→设备 | OTA 固件升级 URL |
| `event/{device_sn}/response` | 设备→云端 | 指令执行回执 |

## 默认账号

- 用户名: `admin`
- 密码: `admin123`
