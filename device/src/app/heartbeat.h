/* heartbeat.h - 心跳上报任务 */

#ifndef HEARTBEAT_H
#define HEARTBEAT_H

#include <stdint.h>

void heartbeat_task_create(uint32_t interval_sec);

#endif /* HEARTBEAT_H */
