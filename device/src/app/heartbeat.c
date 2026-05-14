/* heartbeat.c - 心跳上报实现 */

#include "heartbeat.h"
#include "../network/mqtt_client.h"
#include "../network/wifi.h"
#include "../config.h"
#include <stdio.h>
#include <unistd.h>

void heartbeat_task_create(uint32_t interval_sec)
{
    printf("[Heartbeat] Task created, interval=%us\r\n", (unsigned)interval_sec);

    while (1) {
        if (mqtt_is_connected()) {
            char payload[256];
            int rssi = wifi_get_rssi();
            snprintf(payload, sizeof(payload),
                "{\"device_sn\":\"%s\",\"online\":true,\"rssi\":%d,\"battery\":3.70}",
                DEVICE_SN, rssi);
            mqtt_publish(TOPIC_HEARTBEAT, payload, 1);
        }

        sleep(interval_sec);
    }
}
