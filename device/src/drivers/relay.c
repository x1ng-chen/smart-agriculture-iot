/* relay.c - 继电器驱动 (Hi3861 GPIO) */

#include "relay.h"
#include "../config.h"
#include "wifiiot_gpio.h"
#include "wifiiot_gpio_ex.h"
#include <stdio.h>

static WifiIotGpioIdx g_pin;
static WifiIotGpioValue g_state = WIFI_IOT_GPIO_VALUE0;

void relay_init(unsigned int gpio_pin)
{
    g_pin = (WifiIotGpioIdx)gpio_pin;

    GpioInit(g_pin, WIFI_IOT_GPIO_DIR_OUT);
#if RELAY_ACTIVE_LOW
    // 低电平触发：初始化时拉高（断开继电器）
    GpioSetOutputVal(g_pin, WIFI_IOT_GPIO_VALUE1);
    g_state = WIFI_IOT_GPIO_VALUE1;
#else
    // 高电平触发：初始化时拉低（断开继电器）
    GpioSetOutputVal(g_pin, WIFI_IOT_GPIO_VALUE0);
    g_state = WIFI_IOT_GPIO_VALUE0;
#endif
    printf("[Relay] init GPIO_%d, active_%s\r\n", gpio_pin,
        RELAY_ACTIVE_LOW ? "LOW" : "HIGH");
}

void relay_on(void)
{
#if RELAY_ACTIVE_LOW
    GpioSetOutputVal(g_pin, WIFI_IOT_GPIO_VALUE0);  // LOW 触发继电器吸合
    g_state = WIFI_IOT_GPIO_VALUE0;
#else
    GpioSetOutputVal(g_pin, WIFI_IOT_GPIO_VALUE1);  // HIGH 触发继电器吸合
    g_state = WIFI_IOT_GPIO_VALUE1;
#endif
    printf("[Relay] ON (GPIO_%d = %s)\r\n", g_pin,
        RELAY_ACTIVE_LOW ? "LOW" : "HIGH");
}

void relay_off(void)
{
#if RELAY_ACTIVE_LOW
    GpioSetOutputVal(g_pin, WIFI_IOT_GPIO_VALUE1);  // HIGH 断开继电器
    g_state = WIFI_IOT_GPIO_VALUE1;
#else
    GpioSetOutputVal(g_pin, WIFI_IOT_GPIO_VALUE0);  // LOW 断开继电器
    g_state = WIFI_IOT_GPIO_VALUE0;
#endif
    printf("[Relay] OFF (GPIO_%d = %s)\r\n", g_pin,
        RELAY_ACTIVE_LOW ? "HIGH" : "LOW");
}

int relay_state(void)
{
#if RELAY_ACTIVE_LOW
    return (g_state == WIFI_IOT_GPIO_VALUE0) ? 1 : 0;  // LOW = ON
#else
    return (g_state == WIFI_IOT_GPIO_VALUE1) ? 1 : 0;  // HIGH = ON
#endif
}
