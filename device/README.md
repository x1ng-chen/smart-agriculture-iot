# 智慧农业灌溉系统 - BearPi Nano 设备端

## 硬件平台
- **主控**: BearPi Nano (Hi3861)
- **系统**: OpenHarmony (LiteOS-M)
- **传感器**: 土壤湿度(电容式) + DHT22 + BH1750
- **执行器**: 5V继电器模块(控制水泵/电磁阀)
- **显示**: 0.96寸 OLED (SSD1306, I2C)

## 开发环境搭建
1. 安装Hi3861交叉编译工具链 `arm-none-eabi-gcc`
2. 下载Hi3861 SDK (华为HarmonyOS设备开发包)
3. 安装烧录工具 HiBurn

## 编译
```bash
make clean && make all
```

## 烧录
```bash
make flash
```

## 配置说明
修改 `src/config.h`：
- WiFi SSID/密码
- MQTT Broker地址
- 设备序列号(DEVICE_SN)
- 采集/心跳上报间隔

## MQTT Topic
| Topic | 方向 | 说明 |
|-------|------|------|
| sensor/{sn}/data | 上报 | 传感器数据 |
| sensor/{sn}/heartbeat | 上报 | 心跳包 |
| cmd/{sn}/pump | 订阅 | 灌溉控制 |
| cmd/{sn}/config | 订阅 | 配置下发 |
| cmd/{sn}/ota | 订阅 | OTA固件URL |
| event/{sn}/response | 上报 | 执行回执 |
