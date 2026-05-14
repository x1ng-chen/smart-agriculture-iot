/* relay.c - 继电器驱动实现 */

#include "relay.h"

static uint8_t pin;
static int state = 0;

void relay_init(uint8_t gpio_pin)
{
    pin = gpio_pin;
    state = 0;
    // TODO: Hi3861 GPIO初始化, 输出模式, 初始低电平
}

void relay_on(void)
{
    state = 1;
    // TODO: 设置GPIO高电平
}

void relay_off(void)
{
    state = 0;
    // TODO: 设置GPIO低电平
}

int relay_state(void)
{
    return state;
}
