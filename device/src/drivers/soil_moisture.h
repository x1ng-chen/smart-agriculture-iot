/* soil_moisture.h - 土壤湿度传感器驱动 (电容式) */

#ifndef SOIL_MOISTURE_H
#define SOIL_MOISTURE_H

#include <stdint.h>

/* 初始化ADC采集引脚 */
void soil_moisture_init(uint8_t adc_pin);

/* 读取土壤湿度百分比 (0-100%) */
float soil_moisture_read(void);

#endif /* SOIL_MOISTURE_H */
