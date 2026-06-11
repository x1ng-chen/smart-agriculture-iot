/* cmd_handler.h - MQTT指令处理 */

#ifndef CMD_HANDLER_H
#define CMD_HANDLER_H

void cmd_handler_task_create(void);
void handle_pump_cmd(const char *payload);
int  is_pump_locked(void);   /* 查询安防泵锁状态: 0=解锁 1=锁定 */

#endif /* CMD_HANDLER_H */
