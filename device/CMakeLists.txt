cmake_minimum_required(VERSION 3.10)
project(smart_agriculture_device C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Hi3861交叉编译工具链
set(TOOLCHAIN_PREFIX arm-none-eabi-)
set(CMAKE_C_COMPILER ${TOOLCHAIN_PREFIX}gcc)

# 源文件
set(SOURCES
    src/main.c
    src/drivers/soil_moisture.c
    src/drivers/dht22.c
    src/drivers/bh1750.c
    src/drivers/relay.c
    src/drivers/oled.c
    src/network/wifi.c
    src/network/mqtt_client.c
    src/app/sensor_task.c
    src/app/heartbeat.c
    src/app/cmd_handler.c
)

# 头文件目录
include_directories(
    src
    src/drivers
    src/network
    src/app
    include
    lib
)

# 生成可执行文件
add_executable(${PROJECT_NAME} ${SOURCES})

# 链接Hi3861 SDK库 (按实际SDK路径调整)
# target_link_libraries(${PROJECT_NAME} hi3861_sdk wifi iot)
