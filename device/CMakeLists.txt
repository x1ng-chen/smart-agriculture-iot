cmake_minimum_required(VERSION 3.10)
project(smart_agriculture_device C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Hi3861 交叉编译工具链
set(TOOLCHAIN_PREFIX arm-none-eabi-)
set(CMAKE_C_COMPILER ${TOOLCHAIN_PREFIX}gcc)

# 公共源文件 (两种模式通用)
set(SOURCES
    src/main.c
    src/uart_comm.c
    src/json_parser.c
    src/drivers/soil_moisture.c
    src/drivers/dht22.c
    src/drivers/bh1750.c
    src/drivers/relay.c
    src/drivers/oled.c
    src/drivers/e53_is1.c       # Node B 安防驱动 (条件编译)
    src/app/sensor_task.c
    src/app/heartbeat.c
    src/app/cmd_handler.c
    src/app/security_task.c     # Node B 安防任务 (条件编译)
)

# WiFi+MQTT 模式额外源文件 (由 config.h 中的 CONNECTION_MODE 控制编译)
set(WIFI_MQTT_SOURCES
    src/network/wifi.c
    src/network/mqtt_client.c
)

# 可执行文件
add_executable(${PROJECT_NAME} ${SOURCES} ${WIFI_MQTT_SOURCES})

# 头文件目录
include_directories(
    src
    src/drivers
    src/network
    src/app
    include
    lib
)

# 链接 Hi3861 SDK 库
# target_link_libraries(${PROJECT_NAME} hi3861_sdk wifi iot mqtt)
