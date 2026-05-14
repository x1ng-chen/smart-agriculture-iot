/* oled.h - OLED显示驱动 (SSD1306, I2C) */

#ifndef OLED_H
#define OLED_H

#include <stdint.h>

#define OLED_ADDR 0x3C

void oled_init(void);
void oled_show_sensor_data(float soil_moisture, float air_temp, float air_humidity, float light);
void oled_show_status(const char *line1, const char *line2);

#endif /* OLED_H */
