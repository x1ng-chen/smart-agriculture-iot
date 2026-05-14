# MQTT Topic 设计

| Topic | 方向 | QoS | 说明 |
|-------|------|-----|------|
| sensor/{device_sn}/data | 设备→云端 | 1 | 传感器数据上报 (JSON) |
| sensor/{device_sn}/heartbeat | 设备→云端 | 1 | 心跳包 (60s间隔) |
| cmd/{device_sn}/pump | 云端→设备 | 1 | 灌溉控制指令 (on/off) |
| cmd/{device_sn}/config | 云端→设备 | 1 | 配置下发 (上报间隔等) |
| cmd/{device_sn}/ota | 云端→设备 | 1 | OTA固件升级URL |
| event/{device_sn}/response | 设备→云端 | 1 | 指令执行结果回执 |

## 传感器数据JSON格式
```json
{
  "device_sn": "BPN-20240001",
  "soil_moisture": 45.2,
  "soil_temp": 23.1,
  "air_temp": 28.5,
  "air_humidity": 65.8,
  "light": 12000.0,
  "rssi": -45,
  "battery": 3.72
}
```
