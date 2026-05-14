/* wifi.h - WiFi连接管理 */

#ifndef WIFI_H
#define WIFI_H

int wifi_init(const char *ssid, const char *password);
int wifi_is_connected(void);
int wifi_get_rssi(void);

#endif /* WIFI_H */
