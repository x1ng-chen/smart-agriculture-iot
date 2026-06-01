/* sensor_task.c - 传感器采集任务 (UART / WiFi+MQTT 双模式) */

#include "sensor_task.h"
#include "../drivers/soil_moisture.h"
#include "../drivers/dht22.h"
#include "../drivers/bh1750.h"
#include "../drivers/oled.h"
#include "../json_parser.h"
#include "../config.h"
#include <stdio.h>
#include <time.h>
#include "cmsis_os2.h"

#if CONNECTION_MODE == CONN_MODE_UART
#include "../uart_comm.h"
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
#include "../network/mqtt_client.h"
#endif

#define TASK_STACK_SIZE 1024 * 8
#define TASK_PRIO       24

static uint32_t g_interval_sec = SENSOR_INTERVAL_SEC;

/* 统一发送接口 */
static void transport_send(const char *json)
{
#if CONNECTION_MODE == CONN_MODE_UART
    uart_send_json(json);
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
    mqtt_publish(TOPIC_PROPERTY_REPORT, json, 1);
#endif
}

/* 构建华为云属性上报 JSON */
static int json_build_huawei_properties(char *buf, size_t size,
    float soil_moisture, float soil_temp,
    float air_temp, float air_humidity, float light)
{
    int n = snprintf(buf, size,
        "{\"services\":[{"
        "\"service_id\":\"sensor\","
        "\"properties\":{"
        "\"soil_moisture\":%.1f,"
        "\"soil_temperature\":%.1f,"
        "\"air_temperature\":%.1f,"
        "\"air_humidity\":%.1f,"
        "\"luminance\":%.0f"
        "}}]}",
        soil_moisture, soil_temp,
        air_temp, air_humidity, light);
    return (n > 0 && (size_t)n < size) ? 0 : -1;
}

static void sensor_task_thread(void)
{
    char json_buf[JSON_BUF_SIZE];

    printf("[Sensor] started, interval=%us\r\n", (unsigned)g_interval_sec);

    while (1) {
        float soil_moist = soil_moisture_read();

        float air_temp = 0, air_humid = 0;
        dht22_read(&air_temp, &air_humid);

        float light = bh1750_read_lux();

        oled_show_sensor_data(soil_moist, air_temp, air_humid, light);

        uint32_t ts = (uint32_t)time(NULL);
#if CONNECTION_MODE == CONN_MODE_UART
        if (json_build_sensor_data(json_buf, sizeof(json_buf),
                DEVICE_SN, ts,
                soil_moist, 0.0f,
                air_temp, air_humid, light) == 0) {
            transport_send(json_buf);
        }
#elif CONNECTION_MODE == CONN_MODE_WIFI_MQTT
        if (json_build_huawei_properties(json_buf, sizeof(json_buf),
                soil_moist, 0.0f,
                air_temp, air_humid, light) == 0) {
            transport_send(json_buf);
        }
#endif

        printf("[Sensor] soil=%.1f air=%.1f/%.1f light=%.0f\r\n",
            soil_moist, air_temp, air_humid, light);

        osDelay(g_interval_sec * 1000);
    }
}

void sensor_task_create(unsigned int interval_sec)
{
    g_interval_sec = interval_sec;

    osThreadAttr_t attr = {
        .name = "SensorTask",
        .attr_bits = 0U,
        .cb_mem = NULL,
        .cb_size = 0U,
        .stack_mem = NULL,
        .stack_size = TASK_STACK_SIZE,
        .priority = TASK_PRIO,
    };

    if (osThreadNew((osThreadFunc_t)sensor_task_thread, NULL, &attr) == NULL) {
        printf("[Sensor] failed to create thread\r\n");
    }
}

void sensor_task_suspend(void)  { /* 预留 */ }
void sensor_task_resume(void)   { /* 预留 */ }
