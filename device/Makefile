# BearPi Nano 设备端 Makefile
# 依赖: Hi3861 SDK 和交叉编译工具链

PROJECT = smart_ag_device
BUILD_DIR = build

# Hi3861 SDK路径 (按实际路径修改)
SDK_DIR ?= /path/to/hi3861_sdk

CC = arm-none-eabi-gcc
CFLAGS = -Wall -Os -mcpu=cortex-m4 -mthumb -I./src -I./include

SOURCES = \
    src/main.c \
    src/drivers/soil_moisture.c \
    src/drivers/dht22.c \
    src/drivers/bh1750.c \
    src/drivers/relay.c \
    src/drivers/oled.c \
    src/network/wifi.c \
    src/network/mqtt_client.c \
    src/app/sensor_task.c \
    src/app/heartbeat.c \
    src/app/cmd_handler.c

OBJS = $(SOURCES:src/%.c=$(BUILD_DIR)/%.o)

.PHONY: all clean flash

all: $(BUILD_DIR) $(BUILD_DIR)/$(PROJECT).bin

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)/drivers $(BUILD_DIR)/network $(BUILD_DIR)/app

$(BUILD_DIR)/$(PROJECT).bin: $(OBJS)
	$(CC) $(CFLAGS) $(OBJS) -o $(BUILD_DIR)/$(PROJECT).elf
	arm-none-eabi-objcopy -O binary $(BUILD_DIR)/$(PROJECT).elf $@

$(BUILD_DIR)/%.o: src/%.c
	$(CC) $(CFLAGS) -c $< -o $@

flash: $(BUILD_DIR)/$(PROJECT).bin
	# TODO: 使用HiBurn或其他烧录工具烧录到BearPi Nano
	@echo "请使用烧录工具将 $(BUILD_DIR)/$(PROJECT).bin 烧录到设备"

clean:
	rm -rf $(BUILD_DIR)
