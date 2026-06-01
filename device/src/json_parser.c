#include "json_parser.h"
#include <stdio.h>
#include <string.h>

int json_build_sensor_data(char *buf, size_t size,
    const char *sn, uint32_t ts,
    float soil_moisture, float soil_temp,
    float air_temp, float air_humidity, float light)
{
    int n = snprintf(buf, size,
        "{"
        "\"type\":\"sensor_data\","
        "\"sn\":\"%s\","
        "\"ts\":%u,"
        "\"soil_moisture\":%.1f,"
        "\"soil_temp\":%.1f,"
        "\"air_temp\":%.1f,"
        "\"air_humidity\":%.1f,"
        "\"light\":%.1f"
        "}",
        sn, ts,
        soil_moisture, soil_temp,
        air_temp, air_humidity, light);
    return (n > 0 && (size_t)n < size) ? 0 : -1;
}

int json_build_heartbeat(char *buf, size_t size,
    const char *sn, uint32_t ts, uint32_t uptime)
{
    int n = snprintf(buf, size,
        "{"
        "\"type\":\"heartbeat\","
        "\"sn\":\"%s\","
        "\"ts\":%u,"
        "\"uptime\":%u"
        "}",
        sn, ts, uptime);
    return (n > 0 && (size_t)n < size) ? 0 : -1;
}

int json_build_register(char *buf, size_t size,
    const char *sn, const char *fw_ver)
{
    int n = snprintf(buf, size,
        "{"
        "\"type\":\"register\","
        "\"sn\":\"%s\","
        "\"fw_ver\":\"%s\""
        "}",
        sn, fw_ver);
    return (n > 0 && (size_t)n < size) ? 0 : -1;
}

int json_build_cmd_ack(char *buf, size_t size,
    const char *sn, const char *cmd_id, const char *result, const char *message)
{
    int n = snprintf(buf, size,
        "{"
        "\"type\":\"cmd_ack\","
        "\"sn\":\"%s\","
        "\"cmd_id\":\"%s\","
        "\"result\":\"%s\","
        "\"message\":\"%s\""
        "}",
        sn, cmd_id, result, message ? message : "");
    return (n > 0 && (size_t)n < size) ? 0 : -1;
}

/* 从 JSON 字符串中提取 "key":"value" 的值 */
static int extract_str(const char *json, const char *key,
    char *out, size_t out_size)
{
    size_t key_len = strlen(key);
    const char *p = json;

    while (*p) {
        const char *found = strstr(p, key);
        if (!found) return -1;

        /* 检查 key 前面是 { 或 , (简单校验是 key 而非 value 的一部分) */
        if (found > json && *(found - 1) != ',' && *(found - 1) != '{') {
            /* 跳过前一个字符，继续搜索 */
            p = found + key_len;
            continue;
        }

        const char *val_start = found + key_len;
        if (*val_start != '"') { p = found + key_len; continue; }
        val_start++; /* 跳过开头的 " */

        const char *val_end = strchr(val_start, '"');
        if (!val_end) return -1;

        size_t len = val_end - val_start;
        if (len >= out_size) len = out_size - 1;
        memcpy(out, val_start, len);
        out[len] = '\0';
        return 0;
    }
    return -1;
}

/* 从 JSON 字符串中提取整数 "key":N */
static int extract_int(const char *json, const char *key, int *val_out)
{
    char buf[16] = {0};
    if (extract_str(json, key, buf, sizeof(buf)) != 0) {
        /* 尝试无引号的数字格式 "key":N */
        size_t key_len = strlen(key);
        const char *p = json;
        while (*p) {
            const char *found = strstr(p, key);
            if (!found) return -1;
            if (found > json && *(found - 1) != ',' && *(found - 1) != '{') {
                p = found + key_len;
                continue;
            }
            const char *val_start = found + key_len;
            if (*val_start == '"') {
                /* 值带引号，用 extract_str 已处理但失败，跳过 */
                p = val_start + 1;
                continue;
            }
            *val_out = atoi(val_start);
            return 0;
        }
        return -1;
    }
    *val_out = atoi(buf);
    return 0;
}

int json_parse_cmd(const char *json, char *cmd_id_out, size_t cmd_id_size,
    char *action_out, size_t action_size, int *duration_sec_out)
{
    if (!json || !cmd_id_out || !action_out) return -1;

    if (extract_str(json, "\"cmd_id\":\"", cmd_id_out, cmd_id_size) != 0)
        return -1;
    if (extract_str(json, "\"action\":\"", action_out, action_size) != 0)
        return -1;

    int duration = 0;
    extract_int(json, "\"duration_sec\":", &duration);
    if (duration_sec_out) *duration_sec_out = duration;

    return 0;
}

int json_parse_config(const char *json, char *cmd_id_out, size_t cmd_id_size,
    int *interval_sec_out)
{
    if (!json || !cmd_id_out || !interval_sec_out) return -1;

    if (extract_str(json, "\"cmd_id\":\"", cmd_id_out, cmd_id_size) != 0)
        return -1;
    if (extract_int(json, "\"sensor_interval_sec\":", interval_sec_out) != 0)
        return -1;

    return 0;
}
