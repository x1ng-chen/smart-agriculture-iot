/* cmd_handler.h - MQTT指令处理 */

#ifndef CMD_HANDLER_H
#define CMD_HANDLER_H

void cmd_handler_task_create(void);
void handle_pump_cmd(const char *payload);

#endif /* CMD_HANDLER_H */
