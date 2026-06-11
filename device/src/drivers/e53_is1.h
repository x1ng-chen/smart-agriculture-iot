/* e53_is1.h - E53_IS1 安全传感器驱动 (PIR人体红外 + 蜂鸣器 + LED) */

#ifndef E53_IS1_H
#define E53_IS1_H

#include <stdint.h>

/* ── PIR 人体红外传感器 (HC-SR501) ── */
void e53_is1_pir_init(unsigned int pin);
int  e53_is1_pir_read(void);          /* 返回 1:有人  0:无人 */

/* ── 蜂鸣器 (有源蜂鸣器, GPIO 高低电平驱动) ── */
void e53_is1_buzzer_init(unsigned int pin);
void e53_is1_buzzer_on(void);
void e53_is1_buzzer_off(void);
void e53_is1_buzzer_beep(int times, int interval_ms);  /* 蜂鸣 N 次 */

/* ── LED 状态指示灯 ── */
void e53_is1_led_init(unsigned int pin);
void e53_is1_led_on(void);
void e53_is1_led_off(void);
void e53_is1_led_toggle(void);

#endif /* E53_IS1_H */
