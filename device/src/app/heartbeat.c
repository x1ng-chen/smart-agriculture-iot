/* heartbeat.c - 心跳上报 (UART / WiFi+MQTT 双模式) */

#include "heartbeat.h"
#include "../json_parser.h"
#include "../config.h"
#include <stdio.h>
#include <time.h>
#include "cmsis_os2.h"

#if CONNECTION_MODE == CONN_MODE_UART
#include "../uart_comm.h"
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
#include "../network/mqtt_client.h"
#include "../network/wifi.h"
#endif

#define TASK_STACK_SIZE 1024 * 4
#define TASK_PRIO       25

static uint32_t g_uptime_sec = 0;

/* 统一发送接口 */
static void transport_send(const char *json)
{
#if CONNECTION_MODE == CONN_MODE_UART
    uart_send_json(json);
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
    /* 华为云模式: 心跳不需要单独发送，webhook 在每次数据上报时自动更新在线状态 */
    (void)json;
#endif
}

static void heartbeat_task_thread(void)
{
    char json_buf[JSON_BUF_SIZE];

    printf("[Heartbeat] started, interval=%us\r\n", HEARTBEAT_INTERVAL_SEC);

    while (1) {
        g_uptime_sec += HEARTBEAT_INTERVAL_SEC;
        uint32_t ts = (uint32_t)time(NULL);

        if (json_build_heartbeat(json_buf, sizeof(json_buf),
                DEVICE_SN, ts, g_uptime_sec) == 0) {
            transport_send(json_buf);
        }

        osDelay(HEARTBEAT_INTERVAL_SEC * 1000);
    }
}

void heartbeat_task_create(unsigned int interval_sec)
{
    osThreadAttr_t attr = {
        .name = "HeartbeatTask",
        .attr_bits = 0U,
        .cb_mem = NULL,
        .cb_size = 0U,
        .stack_mem = NULL,
        .stack_size = TASK_STACK_SIZE,
        .priority = TASK_PRIO,
    };

    if (osThreadNew((osThreadFunc_t)heartbeat_task_thread, NULL, &attr) == NULL) {
        printf("[Heartbeat] failed to create thread\r\n");
    }
}
