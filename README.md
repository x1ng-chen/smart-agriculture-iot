# 智慧农业灌溉系统

基于 **BearPi Nano (Hi3861 + OpenHarmony)** 的物联网智慧农业自动灌溉解决方案。

## 技术架构

```
前端: Vue 3 + Element Plus + ECharts + Vite + Pinia
后端: Go + Gin + GORM + JWT + Zap
通信: MQTT (EMQX) + HTTP RESTful
数据: MySQL 8.0 + InfluxDB 2.x + Redis 7
设备: BearPi Nano (Hi3861) + 电容式土壤湿度 + DHT22 + BH1750
部署: Docker Compose
```

## 项目结构

```
aiot/
├── frontend/          # Vue 3 前端 (Web管理后台 + 数据可视化)
│   ├── src/
│   │   ├── api/       # API接口层 (Axios封装)
│   │   ├── components/# 公共组件
│   │   ├── layouts/   # 布局组件
│   │   ├── router/    # 路由配置
│   │   ├── stores/    # Pinia状态管理
│   │   └── views/     # 页面视图
│   └── package.json
├── backend/           # Go后端服务
│   ├── cmd/server/    # 入口
│   ├── config/        # 配置管理 (Viper)
│   ├── internal/
│   │   ├── handler/   # HTTP处理器
│   │   ├── service/   # 业务逻辑层
│   │   ├── repository/# 数据访问层
│   │   ├── model/     # 数据模型 (GORM)
│   │   ├── middleware/ # 中间件 (JWT/CORS/Logger)
│   │   ├── mqtt/      # MQTT客户端
│   │   ├── router/    # 路由注册
│   │   └── engine/    # 灌溉规则引擎
│   ├── pkg/           # 公共工具包
│   └── migrations/    # 数据库迁移SQL
├── device/            # BearPi Nano设备端 (C)
│   ├── src/
│   │   ├── drivers/   # 传感器驱动
│   │   ├── network/   # WiFi/MQTT通信
│   │   └── app/       # 应用逻辑
│   └── CMakeLists.txt
├── deploy/            # 部署配置
│   ├── nginx/
│   ├── mysql/
│   └── scripts/
├── docs/              # 项目文档
├── docker-compose.yml # Docker编排
└── README.md
```

## 快速开始

### 1. 克隆项目
```bash
cd aiot
```

### 2. 配置
- 修改 `backend/config/config.yaml` 中的数据库密码和密钥
- 修改 `device/src/config.h` 中的WiFi和MQTT配置

### 3. 启动后端服务
```bash
cd backend
go mod tidy
go run cmd/server/main.go
```

### 4. 启动前端开发服务
```bash
cd frontend
npm install
npm run dev
```

### 5. Docker Compose 一键部署
```bash
bash deploy/scripts/deploy.sh
```

## 核心功能
- [x] 环境数据采集 (土壤湿度/温度/空气温湿度/光照)
- [x] 自动灌溉控制 (阈值策略)
- [x] 设备管理 (注册/在线监控/OTA)
- [x] 实时数据看板 (MQTT实时推送)
- [x] 历史数据查询 (InfluxDB时序存储)
- [x] 手动远程控制 (Web端)
- [x] 告警通知 (设备离线/传感器异常)
- [ ] 用户权限管理 (开发中)
- [ ] 数据导出 (开发中)

## 默认账号
- 用户名: `admin`
- 密码: `admin123`

## MQTT Topic设计

| Topic | 方向 | 说明 |
|-------|------|------|
| sensor/{device_sn}/data | 设备→云端 | 传感器数据上报 |
| sensor/{device_sn}/heartbeat | 设备→云端 | 心跳包 |
| cmd/{device_sn}/pump | 云端→设备 | 灌溉控制指令 |
| cmd/{device_sn}/config | 云端→设备 | 配置下发 |
| cmd/{device_sn}/ota | 云端→设备 | OTA固件升级URL |
| event/{device_sn}/response | 设备→云端 | 指令执行回执 |
