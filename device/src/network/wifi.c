/* wifi.c - WiFi连接管理实现 */

#include "wifi.h"
#include <stdio.h>

int wifi_init(const char *ssid, const char *password)
{
    // TODO: Hi3861 WiFi STA模式初始化
    // hi_wifi_init();
    // hi_wifi_connect(ssid, password);
    // 等待连接成功, 超时30秒
    printf("[WiFi] Connecting to %s...\r\n", ssid);
    return 0;
}

int wifi_is_connected(void)
{
    // TODO: 检查WiFi连接状态
    return 1;
}

int wifi_get_rssi(void)
{
    // TODO: 获取WiFi信号强度
    return -40;
}
