/* mqtt_client.h - MQTT通信客户端 */

#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <stdint.h>

/* MQTT消息回调函数类型 */
typedef void (*mqtt_msg_callback_t)(const char *topic, const char *payload, int payload_len);

int mqtt_init(const char *broker, const char *client_id,
              const char *username, const char *password);
int mqtt_connect(void);
int mqtt_publish(const char *topic, const char *payload, int qos);
int mqtt_subscribe(const char *topic, int qos, mqtt_msg_callback_t cb);
int mqtt_is_connected(void);
void mqtt_disconnect(void);

#endif /* MQTT_CLIENT_H */
