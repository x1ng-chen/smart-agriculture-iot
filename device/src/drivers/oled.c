/* oled.c - SSD1306 OLED显示驱动实现 */

#include "oled.h"
#include <string.h>
#include <stdio.h>

void oled_init(void)
{
    // TODO: Hi3861 I2C初始化SSD1306
    // 设置显示模式、对比度等
}

void oled_show_sensor_data(float soil_moisture, float air_temp, float air_humidity, float light)
{
    // TODO: 在OLED上分行显示传感器数据
    char buf[32];
    // Line 1: 土壤湿度
    snprintf(buf, sizeof(buf), "Soil: %.1f%%", soil_moisture);
    // oled_draw_string(0, 0, buf);

    // Line 2: 空气温湿度
    snprintf(buf, sizeof(buf), "T:%.1fC H:%.1f%%", air_temp, air_humidity);
    // oled_draw_string(0, 1, buf);

    // Line 3: 光照
    snprintf(buf, sizeof(buf), "Light: %.0f lux", light);
    // oled_draw_string(0, 2, buf);
}

void oled_show_status(const char *line1, const char *line2)
{
    // TODO: 显示双行状态信息
}
