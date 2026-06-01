#ifndef UART_COMM_H
#define UART_COMM_H

#include "wifiiot_uart.h"

typedef void (*on_message_cb)(const char *json_line);

int  uart_comm_init(WifiIotUartIdx idx, unsigned int baud);
int  uart_send_string(const char *str);
int  uart_send_json(const char *json);
void uart_recv_poll(on_message_cb callback);
int  uart_send_register(const char *sn, const char *fw_ver);

#endif /* UART_COMM_H */
