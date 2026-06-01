#ifndef JSON_PARSER_H
#define JSON_PARSER_H

#include <stdint.h>

int json_build_sensor_data(char *buf, size_t size,
    const char *sn, uint32_t ts,
    float soil_moisture, float soil_temp,
    float air_temp, float air_humidity, float light);

int json_build_heartbeat(char *buf, size_t size,
    const char *sn, uint32_t ts, uint32_t uptime);

int json_build_register(char *buf, size_t size,
    const char *sn, const char *fw_ver);

int json_build_cmd_ack(char *buf, size_t size,
    const char *sn, const char *cmd_id, const char *result, const char *message);

int json_parse_cmd(const char *json, char *cmd_id_out, size_t cmd_id_size,
    char *action_out, size_t action_size, int *duration_sec_out);
int json_parse_config(const char *json, char *cmd_id_out, size_t cmd_id_size,
    int *interval_sec_out);

#endif /* JSON_PARSER_H */
