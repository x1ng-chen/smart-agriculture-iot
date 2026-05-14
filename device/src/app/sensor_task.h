/* sensor_task.h - 传感器采集任务 */

#ifndef SENSOR_TASK_H
#define SENSOR_TASK_H

#include <stdint.h>

void sensor_task_create(uint32_t interval_sec);
void sensor_task_suspend(void);
void sensor_task_resume(void);

#endif /* SENSOR_TASK_H */
