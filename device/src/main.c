/* main.c - BearPi Nano 智慧农业设备端主程序 */

#include "config.h"
#include <stdio.h>
#include <unistd.h>

/* OpenHarmony / LiteOS-M headers */
#include "ohos_init.h"
#include "cmsis_os2.h"

int main(void)
{
    printf("[SmartAg] BearPi Nano 智慧农业设备启动...\r\n");
    printf("[SmartAg] 设备序列号: %s\r\n", DEVICE_SN);

    // TODO: 初始化各模块
    // 1. WiFi连接
    // wifi_init(WIFI_SSID, WIFI_PASSWORD);

    // 2. MQTT连接
    // mqtt_init(MQTT_BROKER, MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);

    // 3. 传感器驱动初始化
    // soil_moisture_init(PIN_SOIL_MOISTURE_ADC);
    // dht22_init(PIN_DHT22_DATA);
    // bh1750_init();
    // relay_init(PIN_RELAY);
    // oled_init();

    // 4. 创建采集任务
    // sensor_task_create(SENSOR_INTERVAL_SEC);

    // 5. 创建心跳任务
    // heartbeat_task_create(HEARTBEAT_INTERVAL_SEC);

    // 6. 创建指令处理任务
    // cmd_handler_task_create();

    while (1) {
        sleep(1);
    }

    return 0;
}
