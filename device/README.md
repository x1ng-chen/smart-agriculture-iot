# 智慧农业灌溉系统 - BearPi Nano 设备端

## 硬件平台
- **主控**: BearPi Nano (Hi3861)
- **系统**: OpenHarmony (LiteOS-M)
- **传感器**: 土壤湿度(电容式) + DHT22 + BH1750
- **执行器**: 5V 继电器模块(控制水泵/电磁阀)
- **显示**: 0.96寸 OLED (SSD1306, I2C)

## 通信模式

固件支持两种通信模式，通过 `src/config.h` 中的 `CONNECTION_MODE` 宏切换：

### 模式 1: UART 串口 (CONN_MODE_UART)
- BearPi 通过 UART1 (GPIO_5 TX / GPIO_6 RX) 连接 PC
- 默认波特率 115200, 8N1
- 使用 JSON-Line 协议 (每帧 JSON + \r\n)
- 适合本地调试和近距离部署

### 模式 2: WiFi + MQTT (CONN_MODE_WIFI_MQTT)
- BearPi 通过 WiFi 连接路由器
- 使用 MQTT 协议连接后端 Broker
- 适合远程田间部署

**切换方式**: 修改 `src/config.h`:
```c
#define CONNECTION_MODE  CONN_MODE_UART        // 串口模式
// #define CONNECTION_MODE  CONN_MODE_WIFI_MQTT   // WiFi+MQTT 模式
```

## 配置说明

修改 `src/config.h`：
- `CONNECTION_MODE` — 通信模式选择
- `DEVICE_SN` — 设备序列号
- `WIFI_SSID` / `WIFI_PASSWORD` — WiFi 配置 (MQTT 模式)
- `MQTT_BROKER` — MQTT Broker 地址 (MQTT 模式)
- `UART_BAUD_RATE` — 串口波特率 (UART 模式)

## 通信协议

### UART 模式 (JSON-Line)
- 每帧一个 JSON 对象, `\r\n` 结尾
- 上电发送 register → 定期发送 sensor_data / heartbeat
- 接收 cmd / config 指令并回复 cmd_ack

### WiFi+MQTT 模式
- Topic 格式: sensor/{sn}/data, cmd/{sn}/pump, 等
- 与后端 MQTT Broker 直接通信

## 编译

```bash
make clean && make all
```

## 烧录

```bash
make flash
```
