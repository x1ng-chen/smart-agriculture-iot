# ESP32 固件对接指南

## 方案概述

本系统支持两种 ESP32 数据上报方式：

```
┌─────────────┐     MQTT (WebSocket)      ┌──────────────────┐
│   ESP32     │ ────────────────────────→  │  内部 MQTT Broker │
│ (BearPi/通用)│     topic: sensor/+/data   │  ws://host:8083   │
└─────────────┘                            └──────────────────┘

┌─────────────┐     华为云 IoT 平台        ┌──────────────────┐
│   ESP32     │ ─── 数据转发规则 ──────→   │  后端 Webhook     │
│ (华为云认证) │     HTTP POST              │  POST /api/v1/   │
└─────────────┘                            │  huawei/data      │
                                           └──────────────────┘
```

## 方式一: AT 固件 MQTT 上报 (推荐 BearPi Nano/Lite)

### 1. ESP32 环境准备
- 烧录支持 MQTT 的 AT 固件 (推荐 ESP-AT v3.x+)
- AT 命令串口工具 (如 SSCOM、PuTTY)

### 2. 连接 WiFi
```at
AT+CWMODE=1
AT+CWJAP="YourWiFiSSID","YourWiFiPassword"
```

### 3. 配置 MQTT 连接
```at
// 配置 MQTT 用户参数 (可选)
AT+MQTTUSERCFG=0,1,"esp32-device-001","","",0,0,""

// 连接到内部 MQTT Broker (ws 模式)
// 注意: AT 固件原生支持 tcp:// 和 ssl://，ws:// 需要 ESP32-S3 或特殊固件
// 替代方案: 使用 tcp:// 模式连接公网 MQTT 端口
AT+MQTTCONN=0,"192.168.1.100",1883,0
```

### 4. 上报传感器数据
```at
// 订阅灌溉指令 (可选)
AT+MQTTSUB=0,"cmd/esp32-device-001/irrigate",1

// 上报数据 (JSON 格式)
AT+MQTTPUB=0,"sensor/esp32-device-001/data",1,0,0,"{\"soil_moisture\":45.2,\"soil_temp\":22.1,\"air_temp\":26.5,\"air_humidity\":65.0,\"light\":1200}"

// 建议每 30-60 秒上报一次
```

### 5. 数据格式规范
```json
{
  "soil_moisture": 45.2,   // 土壤湿度 (%)
  "soil_temp": 22.1,       // 土壤温度 (°C)
  "air_temp": 26.5,        // 空气温度 (°C)
  "air_humidity": 65.0,    // 空气湿度 (%)
  "light": 1200            // 光照强度 (lux)
}
```

## 方式二: 华为云 IoT 平台对接

### 1. 在华为云 IoTDA 控制台
1. 创建产品 → 选择 "自定义品类"
2. 定义属性:
   - soil_moisture (int, 0-100, 单位: %)
   - soil_temp (decimal, -40~80, 单位: °C)
   - air_temp (decimal, -40~80, 单位: °C)
   - air_humidity (int, 0-100, 单位: %)
   - light (int, 0-65535, 单位: lux)
3. 注册设备 → 获取 device_id 和 device_secret

### 2. 在平台上配置数据转发规则
```
规则名称: forward-to-backend
数据来源: 设备属性上报
转发目标: HTTP 推送
推送 URL: http://YOUR_SERVER:3000/api/v1/huawei/data
   (如有 frp: http://iot.yourdomain.com:8080/api/v1/huawei/data)
```

### 3. ESP32 代码示例 (使用华为云 IoT SDK)
```c
// 使用 esp-iot-solution 或 huawei-iot-device-sdk-embedded-c
// 属性上报示例
{
  "services": [{
    "service_id": "sensor",
    "properties": {
      "soil_moisture": 45,
      "soil_temp": 22.1,
      "air_temp": 26.5,
      "air_humidity": 65,
      "light": 1200
    }
  }]
}
```

## 注意事项

1. **device_sn 一致性**: ESP32 上报的 device_sn 必须与后台 "设备管理" 中注册的 device_sn 完全一致
2. **QoS**: 建议使用 QoS=1 保证数据可靠送达
3. **心跳**: 建议每 30-60s 上报一次, 超过 120s 无数据设备会被标记为离线
4. **重连机制**: ESP32 端需实现 WiFi + MQTT 断线自动重连
5. **安全**: 生产环境 MQTT 需配置用户名/密码认证
