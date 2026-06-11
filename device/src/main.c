/* main.c - BearPi Nano 智慧农业设备端 (双模式: UART / WiFi+MQTT)
 *
 * 通过 config.h 中的 NODE_B 宏控制设备角色:
 *   - 未定义 NODE_B → Node A (灌溉节点: E53_IA1 + 水泵控制)
 *   - 定义   NODE_B → Node B (安防节点: E53_IS1 + PIR/蜂鸣器报警)
 */

#include "config.h"
#include <stdio.h>
#include <unistd.h>
#include "ohos_init.h"
#include "cmsis_os2.h"

// 模块初始化声明 (公共)
extern void uart_comm_init(unsigned int idx, unsigned int baud);
extern void uart_send_register(const char *sn, const char *fw_ver);
extern int  wifi_init(const char *ssid, const char *password);
extern int  mqtt_init(const char *broker, const char *client_id,
                      const char *username, const char *password);
extern int  mqtt_subscribe(const char *topic, int qos, void *cb);

// Node A 外设声明
#ifndef NODE_B
extern void relay_init(unsigned int pin);
extern void soil_moisture_init(unsigned int pin);
extern void dht22_init(unsigned int pin);
extern void bh1750_init(void);
#endif

// Node B 外设声明
#ifdef NODE_B
extern void e53_is1_pir_init(unsigned int pin);
extern void e53_is1_buzzer_init(unsigned int pin);
extern void e53_is1_led_init(unsigned int pin);
#endif

// 任务创建声明
#ifndef NODE_B
extern void sensor_task_create(unsigned int interval_sec);
#endif
extern void heartbeat_task_create(unsigned int interval_sec);
extern void cmd_handler_task_create(void);
#ifdef NODE_B
extern void security_task_create(unsigned int interval_ms);
#endif

static void SmartAgEntry(void)
{
    printf("\r\n========================================\r\n");
#ifdef NODE_B
    printf("[SmartAg] BearPi Nano 安防节点 v%s\r\n", FW_VERSION);
    printf("[SmartAg] 设备序列号: %s (Node B - E53_IS1)\r\n", DEVICE_SN);
#else
    printf("[SmartAg] BearPi Nano 智慧农业 v%s\r\n", FW_VERSION);
    printf("[SmartAg] 设备序列号: %s (Node A - E53_IA1)\r\n", DEVICE_SN);
#endif
#if CONNECTION_MODE == CONN_MODE_UART
    printf("[SmartAg] 通信方式: UART (%d baud)\r\n", UART_BAUD_RATE);
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
    printf("[SmartAg] 通信方式: WiFi + MQTT\r\n");
#endif
    printf("========================================\r\n");

    // 1. 初始化通信
#if CONNECTION_MODE == CONN_MODE_UART
    uart_comm_init(UART_IDX, UART_BAUD_RATE);
    uart_send_register(DEVICE_SN, FW_VERSION);

#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
    // WiFi 连接
    if (wifi_init(WIFI_SSID, WIFI_PASSWORD) != 0) {
        printf("[SmartAg] WiFi 连接失败，设备将无法通信\r\n");
    }
    // MQTT 连接
    if (mqtt_init(MQTT_BROKER, MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD) != 0) {
        printf("[SmartAg] MQTT 连接失败，设备将无法通信\r\n");
    }
#endif

    // 2. 初始化外设 (按角色)
#ifdef NODE_B
    /* ── Node B: E53_IS1 安防传感器 ── */
    e53_is1_pir_init(PIN_PIR);
    e53_is1_buzzer_init(PIN_BUZZER);
    e53_is1_led_init(PIN_LED_SEC);
#else
    /* ── Node A: E53_IA1 环境传感器 + 执行器 ── */
    soil_moisture_init(PIN_SOIL_MOISTURE_ADC);
    dht22_init(PIN_DHT22_DATA);
    bh1750_init();
    relay_init(PIN_RELAY);
#endif

    printf("[SmartAg] 所有模块初始化完成\r\n");

    // 3. 启动任务 (按角色)
#ifdef NODE_B
    /* Node B: 仅安防 + 心跳 + 指令处理 (可接收云端 Resume/Clear) */
    security_task_create(200);   /* 200ms PIR 轮询 */
#else
    /* Node A: 传感器采集 + 心跳 + 指令处理 */
    sensor_task_create(SENSOR_INTERVAL_SEC);
#endif
    heartbeat_task_create(HEARTBEAT_INTERVAL_SEC);
    cmd_handler_task_create();

#ifdef NODE_B
    printf("[SmartAg] 任务启动完成: 安防监测/心跳/指令处理\r\n");
#else
    printf("[SmartAg] 任务启动完成: 采集/心跳/指令处理\r\n");
#endif

    while (1) {
#if CONNECTION_MODE == CONN_MODE_WIFI_MQTT
        extern void mqtt_yield(void);
        mqtt_yield();
#endif
        osDelay(100);

        // 检查通信状态
#if CONNECTION_MODE == CONN_MODE_WIFI_MQTT
        extern int wifi_is_connected(void);
        extern int mqtt_is_connected(void);
        if (!wifi_is_connected() || !mqtt_is_connected()) {
            printf("[SmartAg] 连接断开，尝试重连...\r\n");
            if (!wifi_is_connected()) wifi_init(WIFI_SSID, WIFI_PASSWORD);
            if (!mqtt_is_connected()) mqtt_init(MQTT_BROKER, MQTT_CLIENT_ID,
                                                 MQTT_USERNAME, MQTT_PASSWORD);
            osDelay(5000);
        }
#endif
    }
}

APP_FEATURE_INIT(SmartAgEntry);
