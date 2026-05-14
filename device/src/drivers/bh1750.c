/* bh1750.c - BH1750光照传感器驱动实现 */

#include "bh1750.h"

void bh1750_init(void)
{
    // TODO: Hi3861 I2C初始化
    // hi_i2c_init();
}

float bh1750_read_lux(void)
{
    // TODO: 通过I2C读取BH1750值
    // 发送连续高分辨率模式命令 0x10
    // 等待180ms
    // 读取2字节数据, 转换为lux: raw / 1.2
    return 0.0f;
}
