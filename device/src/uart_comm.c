#include "uart_comm.h"
#include "config.h"
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include "wifiiot_errno.h"
#include "wifiiot_uart.h"

static WifiIotUartIdx g_uart_idx;
static char g_rx_buf[UART_RX_BUF_SIZE];
static int  g_rx_pos = 0;
static on_message_cb g_callback = NULL;

int uart_comm_init(WifiIotUartIdx idx, unsigned int baud)
{
    WifiIotUartAttribute attr = {
        .baudRate = baud,
        .dataBits = 8,
        .stopBits = 1,
        .parity   = 0,
    };

    int ret = UartInit(idx, &attr, NULL);
    if (ret != WIFI_IOT_SUCCESS) {
        printf("[UART] init failed: %d\r\n", ret);
        return -1;
    }

    g_uart_idx = idx;
    g_rx_pos = 0;
    printf("[UART] init ok, baud=%u\r\n", baud);
    return 0;
}

int uart_send_string(const char *str)
{
    if (!str) return -1;
    int len = strlen(str);
    int ret = UartWrite(g_uart_idx, (unsigned char *)str, len);
    if (ret != WIFI_IOT_SUCCESS) return -1;

    // 发送 \r\n 帧尾
    UartWrite(g_uart_idx, (unsigned char *)"\r\n", 2);
    return 0;
}

int uart_send_json(const char *json)
{
    return uart_send_string(json);
}

int uart_send_register(const char *sn, const char *fw_ver)
{
    char buf[JSON_BUF_SIZE];
    int n = snprintf(buf, sizeof(buf),
        "{\"type\":\"register\",\"sn\":\"%s\",\"fw_ver\":\"%s\"}", sn, fw_ver);
    if (n < 0 || (size_t)n >= sizeof(buf)) return -1;
    return uart_send_string(buf);
}

void uart_recv_poll(on_message_cb callback)
{
    g_callback = callback;

    while (1) {
        unsigned char ch;
        int ret = UartRead(g_uart_idx, &ch, 1);
        if (ret != 1) {
            usleep(10000); // 10ms
            continue;
        }

        if (ch == '\n' || ch == '\r') {
            if (g_rx_pos > 0) {
                g_rx_buf[g_rx_pos] = '\0';
                // 去掉末尾的 \r
                if (g_rx_pos > 0 && g_rx_buf[g_rx_pos - 1] == '\r') {
                    g_rx_buf[g_rx_pos - 1] = '\0';
                }
                if (g_callback && g_rx_buf[0] == '{') {
                    g_callback(g_rx_buf);
                }
                g_rx_pos = 0;
            }
        } else if (g_rx_pos < (int)(sizeof(g_rx_buf) - 1)) {
            g_rx_buf[g_rx_pos++] = (char)ch;
        } else {
            // 缓冲区溢出，丢弃
            g_rx_pos = 0;
        }
    }
}
