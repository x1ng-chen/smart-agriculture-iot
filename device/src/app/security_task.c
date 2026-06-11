/* security_task.c - 安防监测任务实现 (Node B 专属)
 *
 * 状态机:
 *   IDLE ──(PIR=HIGH)──► ALARM ──(连续N秒PIR=LOW)──► CLEAR ──► IDLE
 *
 * 上报协议 (华为云属性):
 *   service_id: "security"
 *   properties:
 *     intrusion_detected: 1|0    // 1=有人闯入, 0=安全
 *     buzzer_state: 1|0          // 1=蜂鸣中
 *     event: "intrusion"|"clear" // 事件类型
 */

#include "security_task.h"
#include "../drivers/e53_is1.h"
#include "../config.h"
#include "../json_parser.h"
#include "../network/mqtt_client.h"
#include <stdio.h>
#include <string.h>
#include <time.h>
#include "cmsis_os2.h"

#define TASK_STACK_SIZE     (1024 * 6)
#define TASK_PRIO           23               /* 高于 sensor_task(24), 安防优先 */

/* ── 可调参数 ── */
#define PIR_POLL_MS         200              /* PIR 轮询间隔 */
#define PIR_DEBOUNCE_COUNT  3                /* 去抖: 连续N次读到HIGH才算触发 */
#define ALARM_CLEAR_SEC     30               /* 警报持续N秒无人后自动解除 */
#define ALARM_BEEP_TIMES    5                /* 触发时蜂鸣次数 */
#define ALARM_BEEP_INTERVAL 150              /* 蜂鸣间隔 ms */

/* ── 状态机 ── */
typedef enum {
    SEC_STATE_IDLE = 0,      /* 正常监测中 */
    SEC_STATE_ALARM,         /* 检测到入侵, 报警中 */
    SEC_STATE_WAIT_CLEAR     /* 等待现场恢复 */
} security_state_t;

/* ── MQTT 上报 ── */
static void publish_security_event(int detected, int buzzer_state, const char *event)
{
    char json_buf[JSON_BUF_SIZE];
    /* 华为云属性上报格式 */
    int n = snprintf(json_buf, sizeof(json_buf),
        "{\"services\":[{"
        "\"service_id\":\"security\","
        "\"properties\":{"
        "\"intrusion_detected\":%d,"
        "\"buzzer_state\":%d,"
        "\"event\":\"%s\""
        "}}]}",
        detected, buzzer_state, event);

    if (n > 0 && (size_t)n < sizeof(json_buf)) {
        int rc = mqtt_publish(TOPIC_PROPERTY_REPORT, json_buf, 1);
        printf("[Security] MQTT report: %s (rc=%d)\r\n", event, rc);
    } else {
        printf("[Security] JSON build failed\r\n");
    }
}

/* ── 安全任务主循环 ── */
static void security_task_thread(void)
{
    security_state_t state = SEC_STATE_IDLE;
    int pir_high_count = 0;          /* 连续检测到人的次数 */
    int clear_seconds = 0;           /* 无人秒数累计 */

    printf("[Security] task started, poll=%ums, debounce=%d, clear=%ds\r\n",
        PIR_POLL_MS, PIR_DEBOUNCE_COUNT, ALARM_CLEAR_SEC);

    /* PIR 预热: 上电后需 20-30s 稳定, 跳过此期间的误报 */
    printf("[Security] PIR warming up, waiting 25s...\r\n");
    osDelay(25000);
    printf("[Security] PIR ready, monitoring...\r\n");

    while (1) {
        int pir = e53_is1_pir_read();

        switch (state) {

        /* ─── IDLE: 正常监测 ─── */
        case SEC_STATE_IDLE:
            if (pir) {
                pir_high_count++;
                if (pir_high_count >= PIR_DEBOUNCE_COUNT) {
                    /* 确认入侵 */
                    printf("[Security] ⚠ INTRUSION DETECTED!\r\n");

                    /* 本地报警 */
                    e53_is1_buzzer_on();
                    e53_is1_led_on();
                    e53_is1_buzzer_beep(ALARM_BEEP_TIMES, ALARM_BEEP_INTERVAL);

                    /* 上报云端 */
                    publish_security_event(1, 1, "intrusion");

                    state = SEC_STATE_ALARM;
                    clear_seconds = 0;
                }
            } else {
                pir_high_count = 0;   /* 复位去抖计数 */
                e53_is1_led_off();    /* LED 常灭 = 正常 */
            }
            break;

        /* ─── ALARM: 持续报警 ─── */
        case SEC_STATE_ALARM:
            if (!pir) {
                clear_seconds++;
                /* LED 慢闪 = 报警中但已无人 */
                if (clear_seconds % 2 == 0) e53_is1_led_toggle();

                if (clear_seconds >= ALARM_CLEAR_SEC) {
                    /* 解除警报 */
                    printf("[Security] ✓ intrusion cleared after %ds\r\n", ALARM_CLEAR_SEC);

                    e53_is1_buzzer_off();
                    e53_is1_led_off();

                    /* 上报解除 */
                    publish_security_event(0, 0, "clear");

                    state = SEC_STATE_IDLE;
                    pir_high_count = 0;
                }
            } else {
                clear_seconds = 0;     /* 还有人, 重置计时 */
                /* LED 快闪 = 持续报警 */
                e53_is1_led_toggle();
                /* 间歇蜂鸣: 每隔2秒再叫一次 */
                static int beep_timer = 0;
                beep_timer++;
                if (beep_timer >= (2000 / PIR_POLL_MS)) {
                    e53_is1_buzzer_beep(3, 100);
                    beep_timer = 0;
                }
            }
            break;

        default:
            state = SEC_STATE_IDLE;
            break;
        }

        osDelay(PIR_POLL_MS);
    }
}

void security_task_create(unsigned int interval_ms)
{
    (void)interval_ms;  /* 使用内部 PIR_POLL_MS */

    osThreadAttr_t attr = {
        .name       = "SecurityTask",
        .attr_bits  = 0U,
        .cb_mem     = NULL,
        .cb_size    = 0U,
        .stack_mem  = NULL,
        .stack_size = TASK_STACK_SIZE,
        .priority   = TASK_PRIO,
    };

    if (osThreadNew((osThreadFunc_t)security_task_thread, NULL, &attr) == NULL) {
        printf("[Security] failed to create thread\r\n");
    }
}
