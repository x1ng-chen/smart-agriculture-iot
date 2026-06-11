/* cmd_handler.c - 指令处理 (UART / WiFi+MQTT 双模式)
 *
 * Node A 新增: 入侵联动泵锁 (g_pump_locked)
 *   当接收到 StopIrrigation + paras.reason="intrusion" 时:
 *     1. 关闭水泵
 *     2. 设置 g_pump_locked = 1 (锁定, 阻止启动)
 *   当接收到 ResumeIrrigation 时:
 *     1. 解除 g_pump_locked = 0
 *     2. 恢复正常灌溉调度
 */

#include "cmd_handler.h"
#include "../drivers/relay.h"
#include "../json_parser.h"
#include "../config.h"
#include <stdio.h>
#include <string.h>
#include "cmsis_os2.h"

#if CONNECTION_MODE == CONN_MODE_UART
#include "../uart_comm.h"
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
#include "../network/mqtt_client.h"
#endif

#define TASK_STACK_SIZE 1024 * 4
#define TASK_PRIO       23

/* ── 安防泵锁 ── */
static int g_pump_locked = 0;   /* 0=未锁定, 1=安防锁定 */

int is_pump_locked(void)
{
    return g_pump_locked;
}

/* 统一发送 ACK */
static void transport_send_ack(const char *json)
{
#if CONNECTION_MODE == CONN_MODE_UART
    uart_send_json(json);
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
    mqtt_publish(TOPIC_EVENT_RESPONSE, json, 1);
#endif
}

/* 处理解析后的指令 */
static void execute_cmd(const char *cmd_id, const char *action, int duration_sec)
{
    char result[32] = "ok";
    char message[64] = "";

    if (strcmp(action, "pump_on") == 0) {
        /* 安防锁定检查 */
        if (g_pump_locked) {
            snprintf(result, sizeof(result), "locked");
            snprintf(message, sizeof(message), "pump locked due to security intrusion");
            printf("[CMD] pump_on DENIED: security lock active\r\n");
        } else {
            printf("[CMD] 开启灌溉, duration=%ds\r\n", duration_sec);
            relay_on();
            snprintf(message, sizeof(message), "pump on, duration=%ds", duration_sec);
        }
    } else if (strcmp(action, "pump_off") == 0) {
        printf("[CMD] 关闭灌溉\r\n");
        relay_off();
        snprintf(message, sizeof(message), "pump off");
    } else if (strcmp(action, "resume") == 0) {
        /* 解除安防锁定 */
        g_pump_locked = 0;
        printf("[CMD] 安防锁定已解除\r\n");
        snprintf(message, sizeof(message), "security lock cleared, pump ready");
    } else {
        snprintf(result, sizeof(result), "unknown_action");
        snprintf(message, sizeof(message), "unknown action: %s", action);
    }

    char ack_buf[JSON_BUF_SIZE];
    if (json_build_cmd_ack(ack_buf, sizeof(ack_buf),
            DEVICE_SN, cmd_id, result, message) == 0) {
        transport_send_ack(ack_buf);
    }
}

#if CONNECTION_MODE == CONN_MODE_UART
/* UART 模式: uart_recv_poll 回调 */
static void on_uart_message(const char *json_line)
{
    printf("[CMD] UART received: %s\r\n", json_line);

    char cmd_id[64] = {0};
    char action[32] = {0};
    int  duration_sec = 0;

    // 解析 cmd 指令
    if (json_parse_cmd(json_line, cmd_id, sizeof(cmd_id),
            action, sizeof(action), &duration_sec) == 0) {
        execute_cmd(cmd_id, action, duration_sec);
        return;
    }

    // 解析 config 指令
    int new_interval = 0;
    if (json_parse_config(json_line, cmd_id, sizeof(cmd_id), &new_interval) == 0) {
        printf("[CMD] 配置更新: sensor_interval=%ds\r\n", new_interval);
        char ack_buf[JSON_BUF_SIZE];
        json_build_cmd_ack(ack_buf, sizeof(ack_buf),
            DEVICE_SN, cmd_id, "ok", "config updated");
        transport_send_ack(ack_buf);
    }
}

#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
/* 华为云 IoT 命令回调 */
static void on_huawei_command(const char *topic, const char *payload, int payload_len)
{
    char payload_str[512] = {0};
    int copy_len = payload_len < (int)sizeof(payload_str)-1 ? payload_len : (int)sizeof(payload_str)-1;
    memcpy(payload_str, payload, copy_len);
    printf("[CMD] Huawei command: %s\r\n", payload_str);

    /* 解析 command_name */
    char cmd_name[64] = {0};
    char request_id[64] = {0};

    /* 提取 request_id 从 topic: .../commands/request_id=xxx */
    const char *rid_ptr = strstr(topic, "request_id=");
    if (rid_ptr) {
        rid_ptr += 11; /* skip "request_id=" */
        int i = 0;
        while (rid_ptr[i] && rid_ptr[i] != '/' && i < 63) {
            request_id[i] = rid_ptr[i];
            i++;
        }
    }

    /* 简单解析 command_name */
    const char *cn_ptr = strstr(payload_str, "\"command_name\":\"");
    if (cn_ptr) {
        cn_ptr += 16;
        int i = 0;
        while (cn_ptr[i] && cn_ptr[i] != '"' && i < 63) {
            cmd_name[i] = cn_ptr[i];
            i++;
        }
    }

    /* 提取 duration_sec */
    int duration_sec = 0;
    const char *dur_ptr = strstr(payload_str, "\"duration_sec\":");
    if (dur_ptr) {
        duration_sec = atoi(dur_ptr + 15);
    }

    /* 提取 reason 字段 (用于安防入侵场景) */
    char reason[32] = {0};
    const char *rsn_ptr = strstr(payload_str, "\"reason\":\"");
    if (rsn_ptr) {
        rsn_ptr += 10;
        int i = 0;
        while (rsn_ptr[i] && rsn_ptr[i] != '"' && i < 31) {
            reason[i] = rsn_ptr[i];
            i++;
        }
    }

    /* 执行命令 */
    if (strcmp(cmd_name, "StartIrrigation") == 0) {
        /* 安防锁定检查 */
        if (g_pump_locked) {
            printf("[CMD] StartIrrigation DENIED: security lock active\r\n");
        } else {
            printf("[CMD] StartIrrigation, duration=%ds\r\n", duration_sec);
            relay_on();
            if (duration_sec > 0) {
                osDelay(duration_sec * 1000);
                relay_off();
                printf("[CMD] Auto-stop after %ds\r\n", duration_sec);
            }
        }
    } else if (strcmp(cmd_name, "StopIrrigation") == 0) {
        printf("[CMD] StopIrrigation (reason=%s)\r\n", reason);
        relay_off();
        /* 入侵原因 → 锁定水泵, 防止自动/手动误启动 */
        if (strcmp(reason, "intrusion") == 0) {
            g_pump_locked = 1;
            printf("[CMD] ⚠ PUMP LOCKED: 安防入侵联动, 等待 ResumeIrrigation 解锁\r\n");
        }
    } else if (strcmp(cmd_name, "ResumeIrrigation") == 0) {
        printf("[CMD] ResumeIrrigation: 解除安防锁定\r\n");
        g_pump_locked = 0;
    } else {
        printf("[CMD] Unknown command: %s\r\n", cmd_name);
    }

    /* 发送响应回华为云 */
    if (request_id[0]) {
        char resp_topic[256];
        snprintf(resp_topic, sizeof(resp_topic), "%s%s", TOPIC_CMD_RESPONSE, request_id);
        char resp[128];
        snprintf(resp, sizeof(resp), "{\"result_code\":0,\"response_message\":\"ok\"}");
        mqtt_publish(resp_topic, resp, 1);
    }
}
#endif

void cmd_handler_task_create(void)
{
    printf("[CMD] handler starting...\r\n");

#if CONNECTION_MODE == CONN_MODE_UART
    osThreadAttr_t attr = {
        .name = "CmdTask",
        .attr_bits = 0U,
        .cb_mem = NULL,
        .cb_size = 0U,
        .stack_mem = NULL,
        .stack_size = TASK_STACK_SIZE,
        .priority = TASK_PRIO,
    };
    extern void uart_recv_poll(void (*cb)(const char *));
    if (osThreadNew((osThreadFunc_t)uart_recv_poll, on_uart_message, &attr) == NULL) {
        printf("[CMD] failed to create thread\r\n");
    }

#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
    /* 华为云命令已在 mqtt_init 中订阅，这里注册回调 */
    mqtt_subscribe(TOPIC_COMMANDS, 1, on_huawei_command);
    printf("[CMD] Huawei Cloud command handler ready\r\n");
#endif
}
