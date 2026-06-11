/* e53_is1.c - E53_IS1 安全传感器驱动实现 (BearPi-HM Nano / Hi3861)
 *
 * E53 扩展板引脚映射 (BearPi-HM Nano):
 *   J1-5 GPIO5  → PIR OUT  (HC-SR501 数字输出, HIGH=有人)
 *   J1-6 GPIO8  → Buzzer   (有源蜂鸣器, HIGH=响)
 *   J1-7 GPIO7  → LED      (状态指示灯, LOW=亮/Active Low)
 *
 * 联动逻辑 (由上层 security_task 调用):
 *   PIR=HIGH → buzzer_on + LED闪烁 → MQTT上报intrusion → 云端通知Node A停泵
 */

#include "e53_is1.h"
#include "wifiiot_gpio.h"
#include "wifiiot_gpio_ex.h"
#include "cmsis_os2.h"
#include <stdio.h>

/* ── 引脚句柄 ── */
static WifiIotGpioIdx g_pir_pin;
static WifiIotGpioIdx g_buzzer_pin;
static WifiIotGpioIdx g_led_pin;

static int g_pir_initialized = 0;
static int g_buzzer_initialized = 0;
static int g_led_initialized = 0;

/* ================================================================
 *  PIR (HC-SR501 人体红外)
 *  - 输出数字信号, HIGH (3.3V) = 检测到人体移动
 *  - 需上电预热约 20-30 秒才能稳定工作
 *  - 输入模式, 内部下拉, 避免悬空误报
 * ================================================================ */

void e53_is1_pir_init(unsigned int pin)
{
    g_pir_pin = (WifiIotGpioIdx)pin;
    GpioInit(g_pir_pin, WIFI_IOT_GPIO_DIR_IN);
    IoSetPull(g_pir_pin, WIFI_IOT_IO_PULL_DOWN);  /* 内部下拉, 防止悬空 */
    g_pir_initialized = 1;
    printf("[E53_IS1] PIR init on GPIO_%u (pull-down)\r\n", pin);
}

int e53_is1_pir_read(void)
{
    if (!g_pir_initialized) return 0;

    WifiIotGpioValue val;
    GpioGetInputVal(g_pir_pin, &val);
    return (val == WIFI_IOT_GPIO_VALUE1) ? 1 : 0;
}

/* ================================================================
 *  Buzzer (有源蜂鸣器)
 *  - HIGH = 鸣响, LOW = 静音
 *  - beep(): 非阻塞式蜂鸣 N 次
 * ================================================================ */

void e53_is1_buzzer_init(unsigned int pin)
{
    g_buzzer_pin = (WifiIotGpioIdx)pin;
    GpioInit(g_buzzer_pin, WIFI_IOT_GPIO_DIR_OUT);
    GpioSetOutputVal(g_buzzer_pin, WIFI_IOT_GPIO_VALUE0);  /* 默认静音 */
    g_buzzer_initialized = 1;
    printf("[E53_IS1] Buzzer init on GPIO_%u\r\n", pin);
}

void e53_is1_buzzer_on(void)
{
    if (!g_buzzer_initialized) return;
    GpioSetOutputVal(g_buzzer_pin, WIFI_IOT_GPIO_VALUE1);
}

void e53_is1_buzzer_off(void)
{
    if (!g_buzzer_initialized) return;
    GpioSetOutputVal(g_buzzer_pin, WIFI_IOT_GPIO_VALUE0);
}

void e53_is1_buzzer_beep(int times, int interval_ms)
{
    for (int i = 0; i < times; i++) {
        e53_is1_buzzer_on();
        osDelay(interval_ms);
        e53_is1_buzzer_off();
        if (i < times - 1) {
            osDelay(interval_ms);
        }
    }
}

/* ================================================================
 *  LED 状态指示灯
 *  - 使用 Active-Low (低电平亮), 与项目 relay 逻辑一致
 * ================================================================ */

void e53_is1_led_init(unsigned int pin)
{
    g_led_pin = (WifiIotGpioIdx)pin;
    GpioInit(g_led_pin, WIFI_IOT_GPIO_DIR_OUT);
    GpioSetOutputVal(g_led_pin, WIFI_IOT_GPIO_VALUE1);  /* 默认灭 */
    g_led_initialized = 1;
    printf("[E53_IS1] LED init on GPIO_%u\r\n", pin);
}

void e53_is1_led_on(void)
{
    if (!g_led_initialized) return;
    GpioSetOutputVal(g_led_pin, WIFI_IOT_GPIO_VALUE0);   /* LOW 亮 */
}

void e53_is1_led_off(void)
{
    if (!g_led_initialized) return;
    GpioSetOutputVal(g_led_pin, WIFI_IOT_GPIO_VALUE1);   /* HIGH 灭 */
}

void e53_is1_led_toggle(void)
{
    if (!g_led_initialized) return;
    WifiIotGpioValue cur;
    GpioGetOutputVal(g_led_pin, &cur);
    GpioSetOutputVal(g_led_pin,
        (cur == WIFI_IOT_GPIO_VALUE0) ? WIFI_IOT_GPIO_VALUE1 : WIFI_IOT_GPIO_VALUE0);
}
