/* cmd_handler.c - MQTT指令处理实现 */

#include "cmd_handler.h"
#include "../drivers/relay.h"
#include "../network/mqtt_client.h"
#include "../config.h"
#include <stdio.h>
#include <string.h>

static void on_cmd_message(const char *topic, const char *payload, int payload_len)
{
    printf("[CMD] Topic: %s, Payload: %.*s\r\n", topic, payload_len, payload);

    // 判断指令类型
    if (strstr(topic, "/pump") != NULL) {
        handle_pump_cmd(payload);
    } else if (strstr(topic, "/config") != NULL) {
        // TODO: 处理配置下发
        printf("[CMD] Config update received\r\n");
    } else if (strstr(topic, "/ota") != NULL) {
        // TODO: 处理OTA升级
        printf("[CMD] OTA URL received: %.*s\r\n", payload_len, payload);
    }

    // 发送执行回执
    char response[128];
    snprintf(response, sizeof(response),
        "{\"device_sn\":\"%s\",\"topic\":\"%s\",\"result\":\"ok\"}",
        DEVICE_SN, topic);
    mqtt_publish(TOPIC_EVENT_RESPONSE, response, 1);
}

void handle_pump_cmd(const char *payload)
{
    if (strstr(payload, "on") != NULL) {
        printf("[CMD] 开启灌溉\r\n");
        relay_on();
    } else if (strstr(payload, "off") != NULL) {
        printf("[CMD] 关闭灌溉\r\n");
        relay_off();
    }
}

void cmd_handler_task_create(void)
{
    printf("[CMD] Handler task created\r\n");

    // 订阅指令Topic
    mqtt_subscribe(TOPIC_CMD_PUMP, 1, on_cmd_message);
    mqtt_subscribe(TOPIC_CMD_CONFIG, 1, on_cmd_message);
    mqtt_subscribe(TOPIC_CMD_OTA, 1, on_cmd_message);
}
