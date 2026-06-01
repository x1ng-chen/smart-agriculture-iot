-- 为 devices 表添加串口连接支持
ALTER TABLE devices
  ADD COLUMN connection_type VARCHAR(16) NOT NULL DEFAULT 'uart' COMMENT 'uart | wifi_mqtt',
  ADD COLUMN com_port VARCHAR(32) DEFAULT NULL COMMENT 'COM port path, e.g. COM3 or /dev/ttyUSB0',
  ADD INDEX idx_devices_com_port (com_port);
