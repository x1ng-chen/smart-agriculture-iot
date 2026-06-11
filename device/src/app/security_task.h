/* security_task.h - 安防监测任务 (仅 Node B)
 *
 * 职责:
 *   1. 轮询 PIR 传感器, 检测人体入侵
 *   2. 本地触发蜂鸣器报警 + LED 闪烁
 *   3. 通过 MQTT 上报 intrusion_detected 属性到华为云
 *   4. 恢复检测: PIR 连续 N 秒无人 → 自动解除警报 → 上报 cleared
 */

#ifndef SECURITY_TASK_H
#define SECURITY_TASK_H

#include <stdint.h>

void security_task_create(unsigned int interval_ms);

#endif /* SECURITY_TASK_H */
