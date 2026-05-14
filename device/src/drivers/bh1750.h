/* bh1750.h - BH1750 I2C光照传感器驱动 */

#ifndef BH1750_H
#define BH1750_H

#include <stdint.h>

#define BH1750_ADDR 0x23  /* ADDR引脚接LOW时地址 */

void bh1750_init(void);
float bh1750_read_lux(void);

#endif /* BH1750_H */
