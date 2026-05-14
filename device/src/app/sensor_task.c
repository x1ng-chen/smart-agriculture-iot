/* sensor_task.c - 传感器采集任务实现 */

#include "sensor_task.h"
#include "../drivers/soil_moisture.h"
#include "../drivers/dht22.h"
#include "../drivers/bh1750.h"
#include "../drivers/oled.h"
#include "../network/mqtt_client.h"
#include "../config.h"
#include <stdio.h>
#include <unistd.h>

/* 构造传感器数据JSON并上报 */
static void report_sensor_data(float soil_moist, float air_temp,
                                float air_humid, float light)
{
    char payload[512];
    snprintf(payload, sizeof(payload),
        "{\"device_sn\":\"%s\","
        "\"soil_moisture\":%.1f,"
        "\"soil_temp\":%.1f,"
        "\"air_temp\":%.1f,"
        "\"air_humidity\":%.1f,"
        "\"light\":%.1f,"
        "\"rssi\":%d,"
        "\"battery\":%.2f"
        "}",
        DEVICE_SN,
        soil_moist, 0.0f,
        air_temp, air_humid, light,
        -40, 3.70f
    );

    mqtt_publish(TOPIC_SENSOR_DATA, payload, 1);
}

void sensor_task_create(uint32_t interval_sec)
{
    printf("[Sensor] Task created, interval=%us\r\n", (unsigned)interval_sec);

    // TODO: 创建OS任务或定时器
    while (1) {
        // 采集土壤湿度
        float soil_moist = soil_moisture_read();

        // 采集空气温湿度
        float air_temp = 0, air_humid = 0;
        dht22_read(&air_temp, &air_humid);

        // 采集光照
        float light = bh1750_read_lux();

        // OLED显示
        oled_show_sensor_data(soil_moist, air_temp, air_humid, light);

        // MQTT上报
        report_sensor_data(soil_moist, air_temp, air_humid, light);

        sleep(interval_sec);
    }
}

void sensor_task_suspend(void)
{
    // TODO: 暂停采集任务
}

void sensor_task_resume(void)
{
    // TODO: 恢复采集任务
}
