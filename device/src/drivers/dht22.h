/* dht22.h - DHT22 数字温湿度传感器驱动 */

#ifndef DHT22_H
#define DHT22_H

#include <stdint.h>

/* 初始化DHT22数据引脚 */
void dht22_init(uint8_t data_pin);

/* 读取温湿度数据, 返回0成功, -1超时 */
int dht22_read(float *temperature, float *humidity);

#endif /* DHT22_H */
