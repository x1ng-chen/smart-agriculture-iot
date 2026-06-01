/* mqtt_client.c - 华为云 IoT MQTT 客户端 (TLS + HMAC-SHA256) */

#include "mqtt_client.h"
#include "config.h"
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

/* Hi3861 MQTT / socket 头文件 */
#include "wifi_connecter.h"
#include "mqtt.h"

/* MbedTLS (Hi3861 SDK 自带) */
#include "mbedtls/net_sockets.h"
#include "mbedtls/ssl.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"
#include "mbedtls/sha256.h"
#include "mbedtls/md.h"

static MqttClient *g_client = NULL;
static int g_connected = 0;

/* 回调表 */
#define MAX_SUBS 8
static struct {
    char topic[128];
    mqtt_msg_callback cb;
} g_subs[MAX_SUBS];
static int g_sub_count = 0;

/* ========== SHA-256 纯 C 实现 (用于 HMAC) ========== */

typedef struct {
    uint32_t state[8];
    uint64_t bitlen;
    uint8_t  buffer[64];
    uint16_t buflen;
} sha256_ctx;

static const uint32_t K[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

#define ROTR(x,n) (((x)>>(n))|((x)<<(32-(n))))
#define CH(x,y,z)  (((x)&(y))^(~(x)&(z)))
#define MAJ(x,y,z) (((x)&(y))^((x)&(z))^((y)&(z)))
#define EP0(x) (ROTR(x,2)^ROTR(x,13)^ROTR(x,22))
#define EP1(x) (ROTR(x,6)^ROTR(x,11)^ROTR(x,25))
#define SIG0(x) (ROTR(x,7)^ROTR(x,18)^((x)>>3))
#define SIG1(x) (ROTR(x,17)^ROTR(x,19)^((x)>>10))

static uint32_t rd_be(const uint8_t *p) {
    return ((uint32_t)p[0]<<24)|((uint32_t)p[1]<<16)|((uint32_t)p[2]<<8)|p[3];
}
static void wr_be(uint8_t *p, uint32_t v) {
    p[0]=(uint8_t)(v>>24); p[1]=(uint8_t)(v>>16); p[2]=(uint8_t)(v>>8); p[3]=(uint8_t)v;
}

static void sha256_transform(sha256_ctx *ctx) {
    uint32_t W[64], a, b, c, d, e, f, g, h, t1, t2;
    for (int i = 0; i < 16; i++) W[i] = rd_be(ctx->buffer + i*4);
    for (int i = 16; i < 64; i++) W[i] = SIG1(W[i-2]) + W[i-7] + SIG0(W[i-15]) + W[i-16];
    a=ctx->state[0]; b=ctx->state[1]; c=ctx->state[2]; d=ctx->state[3];
    e=ctx->state[4]; f=ctx->state[5]; g=ctx->state[6]; h=ctx->state[7];
    for (int i = 0; i < 64; i++) {
        t1 = h + EP1(e) + CH(e,f,g) + K[i] + W[i];
        t2 = EP0(a) + MAJ(a,b,c);
        h=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
    }
    ctx->state[0]+=a; ctx->state[1]+=b; ctx->state[2]+=c; ctx->state[3]+=d;
    ctx->state[4]+=e; ctx->state[5]+=f; ctx->state[6]+=g; ctx->state[7]+=h;
}

static void sha256_init(sha256_ctx *ctx) {
    ctx->state[0]=0x6a09e667; ctx->state[1]=0xbb67ae85;
    ctx->state[2]=0x3c6ef372; ctx->state[3]=0xa54ff53a;
    ctx->state[4]=0x510e527f; ctx->state[5]=0x9b05688c;
    ctx->state[6]=0x1f83d9ab; ctx->state[7]=0x5be0cd19;
    ctx->bitlen = 0; ctx->buflen = 0;
}

static void sha256_update(sha256_ctx *ctx, const uint8_t *data, size_t len) {
    for (size_t i = 0; i < len; i++) {
        ctx->buffer[ctx->buflen++] = data[i];
        if (ctx->buflen == 64) { sha256_transform(ctx); ctx->bitlen += 512; ctx->buflen = 0; }
    }
}

static void sha256_final(sha256_ctx *ctx, uint8_t hash[32]) {
    uint64_t total = ctx->bitlen + ctx->buflen * 8;
    ctx->buffer[ctx->buflen++] = 0x80;
    if (ctx->buflen > 56) { while (ctx->buflen < 64) ctx->buffer[ctx->buflen++] = 0; sha256_transform(ctx); ctx->buflen = 0; }
    while (ctx->buflen < 56) ctx->buffer[ctx->buflen++] = 0;
    wr_be(ctx->buffer+56, (uint32_t)(total>>32)); wr_be(ctx->buffer+60, (uint32_t)total);
    sha256_transform(ctx);
    for (int i = 0; i < 8; i++) wr_be(hash+i*4, ctx->state[i]);
}

static void hmac_sha256(const uint8_t *key, size_t klen,
                        const uint8_t *data, size_t dlen,
                        uint8_t out[32])
{
    uint8_t k[64] = {0}, ik[64], ok[64];
    sha256_ctx ctx;
    if (klen > 64) { sha256_init(&ctx); sha256_update(&ctx, key, klen); sha256_final(&ctx, k); }
    else memcpy(k, key, klen);
    for (int i = 0; i < 64; i++) { ik[i] = k[i] ^ 0x36; ok[i] = k[i] ^ 0x5c; }
    sha256_init(&ctx); sha256_update(&ctx, ik, 64); sha256_update(&ctx, data, dlen); sha256_final(&ctx, out);
    sha256_init(&ctx); sha256_update(&ctx, ok, 64); sha256_update(&ctx, out, 32); sha256_final(&ctx, out);
}

static void hex_encode(const uint8_t *in, size_t len, char *out) {
    const char *hex = "0123456789abcdef";
    for (size_t i = 0; i < len; i++) { out[i*2] = hex[in[i]>>4]; out[i*2+1] = hex[in[i]&0xf]; }
    out[len*2] = '\0';
}

/* 生成华为云 MQTT 密码: HMAC-SHA256(device_secret, timestamp) */
static void generate_huawei_password(char *pwd, size_t pwd_size) {
    time_t now = time(NULL);
    struct tm *utc = gmtime(&now);
    char ts[16];
    snprintf(ts, sizeof(ts), "%04d%02d%02d%02d",
        utc->tm_year+1900, utc->tm_mon+1, utc->tm_mday, utc->tm_hour);

    uint8_t mac[32];
    hmac_sha256((const uint8_t *)ts, strlen(ts),
                (const uint8_t *)HUAWEI_IOT_DEVICE_SECRET, strlen(HUAWEI_IOT_DEVICE_SECRET),
                mac);
    hex_encode(mac, 32, pwd);
}

/* 生成客户端ID: {device_id}_0_0_{timestamp} */
static void generate_client_id(char *cid, size_t cid_size) {
    time_t now = time(NULL);
    struct tm *utc = gmtime(&now);
    snprintf(cid, cid_size, "%s_0_0_%04d%02d%02d%02d",
        HUAWEI_IOT_DEVICE_ID,
        utc->tm_year+1900, utc->tm_mon+1, utc->tm_mday, utc->tm_hour);
}

/* Paho MQTT 消息到达回调 */
static void on_mqtt_message(void *context, const char *topic, int topic_len,
                            MqttMessage *msg)
{
    char topic_str[256] = {0};
    memcpy(topic_str, topic, topic_len < (int)sizeof(topic_str)-1 ? topic_len : sizeof(topic_str)-1);

    for (int i = 0; i < g_sub_count; i++) {
        if (strstr(topic_str, g_subs[i].topic) != NULL) {
            if (g_subs[i].cb) {
                g_subs[i].cb(topic_str, (const char *)msg->payload, msg->payloadlen);
            }
        }
    }
}

int mqtt_init(const char *broker, const char *client_id,
              const char *username, const char *password)
{
    printf("[MQTT] connecting to %s (TLS)...\r\n", broker);

    MqttInit();

    char cid[128], pwd[128];
    generate_client_id(cid, sizeof(cid));
    generate_huawei_password(pwd, sizeof(pwd));

    printf("[MQTT] client_id: %s\r\n", cid);
    printf("[MQTT] username: %s\r\n", HUAWEI_IOT_DEVICE_ID);

    MqttConnectOptions opts = MqttConnectOptions_default;
    opts.clientId = cid;
    opts.username = HUAWEI_IOT_DEVICE_ID;
    opts.password = pwd;
    opts.keepAliveInterval = 120;
    opts.cleansession = 1;
    opts.mqttMsgCallback = on_mqtt_message;

    int rc = MqttConnect(&opts, HUAWEI_IOT_ENDPOINT, HUAWEI_IOT_PORT);
    if (rc != 0) {
        printf("[MQTT] connect failed: rc=%d\r\n", rc);
        return -1;
    }

    g_connected = 1;
    g_sub_count = 0;
    printf("[MQTT] connected to Huawei Cloud IoT\r\n");

    /* 订阅命令通道 */
    mqtt_subscribe(TOPIC_COMMANDS, 1, NULL);

    return 0;
}

int mqtt_is_connected(void)
{
    return g_connected;
}

int mqtt_publish(const char *topic, const char *payload, int qos)
{
    if (!g_connected) return -1;

    MqttMessage msg;
    memset(&msg, 0, sizeof(msg));
    msg.qos = qos;
    msg.payload = (void *)payload;
    msg.payloadlen = strlen(payload);

    int rc = MqttPublish(topic, &msg);
    if (rc != 0) {
        printf("[MQTT] publish failed: rc=%d topic=%s\r\n", rc, topic);
    }
    return rc;
}

int mqtt_subscribe(const char *topic, int qos, mqtt_msg_callback cb)
{
    if (!g_connected || g_sub_count >= MAX_SUBS) return -1;

    int rc = MqttSubscribe(topic, qos);
    if (rc == 0) {
        snprintf(g_subs[g_sub_count].topic, sizeof(g_subs[g_sub_count].topic), "%s", topic);
        g_subs[g_sub_count].cb = cb;
        g_sub_count++;
        printf("[MQTT] subscribed: %s\r\n", topic);
    }
    return rc;
}

void mqtt_disconnect(void)
{
    if (g_connected) {
        MqttDisconnect();
    }
    g_connected = 0;
}

void mqtt_yield(void)
{
    if (g_client) {
        MqttYield(100);
    }
}
