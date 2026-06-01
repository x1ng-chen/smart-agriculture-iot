#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

typedef void (*mqtt_msg_callback)(const char *topic, const char *payload, int payload_len);

int  mqtt_init(const char *broker, const char *client_id,
               const char *username, const char *password);
int  mqtt_is_connected(void);
int  mqtt_publish(const char *topic, const char *payload, int qos);
int  mqtt_subscribe(const char *topic, int qos, mqtt_msg_callback cb);
void mqtt_disconnect(void);
void mqtt_yield(void);

#endif /* MQTT_CLIENT_H */
