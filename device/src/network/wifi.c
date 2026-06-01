/* wifi.c - Hi3861 WiFi Station 模式 */

#include "wifi.h"
#include "config.h"
#include <stdio.h>
#include <unistd.h>

/* Hi3861 WiFi API */
#include "wifiiot_wifiapi.h"

static int g_connected = 0;

int wifi_init(const char *ssid, const char *password)
{
    printf("[WiFi] connecting to %s...\r\n", ssid);

    // 使能 WiFi
    if (EnableWifi() != 0) {
        printf("[WiFi] EnableWifi failed\r\n");
        return -1;
    }

    // 配置为 Station 模式并连接热点
    WifiStaConf sta_conf = {0};
    snprintf(sta_conf.ssid, sizeof(sta_conf.ssid), "%s", ssid);
    snprintf(sta_conf.preSharedKey, sizeof(sta_conf.preSharedKey), "%s", password);
    sta_conf.securityType = WIFI_SEC_TYPE_PSK;

    if (SetWifiStaConf(&sta_conf) != 0) {
        printf("[WiFi] SetWifiStaConf failed\r\n");
        return -1;
    }

    // 等待连接
    int retry = 0;
    while (retry < 30) {
        if (IsWifiActive() == 1 && IsHotspotConnected() == 1) {
            g_connected = 1;
            unsigned int ip = GetIpAddr();
            printf("[WiFi] connected! IP: %u.%u.%u.%u\r\n",
                ip & 0xff, (ip >> 8) & 0xff, (ip >> 16) & 0xff, (ip >> 24) & 0xff);
            return 0;
        }
        sleep(1);
        retry++;
    }

    printf("[WiFi] connect timeout\r\n");
    return -1;
}

int wifi_is_connected(void)
{
    return g_connected && IsHotspotConnected() == 1;
}

int wifi_get_rssi(void)
{
    /* Hi3861 获取 RSSI (简化实现, 实际需调用底层API) */
    return -45;
}
