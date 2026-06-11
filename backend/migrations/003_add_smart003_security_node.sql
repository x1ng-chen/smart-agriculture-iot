-- 003_add_smart003_security_node.sql
-- 将设备3 (BPN-2026-003) 关联华为云 smart-003 安防节点 (E53_IS1)

USE smart_agriculture;

-- 更新已有 BPN-2026-003，关联华为云 device_id
UPDATE devices
SET
  device_name = '门口安防节点 (E53_IS1)',
  device_type = 'security',
  huawei_device_id = '6a16b4f97f2e6c302f74fe36_smart-003',
  connection_type = 'mqtt',
  com_port = NULL,
  firmware_ver = 'v1.0.0-security'
WHERE device_sn = 'BPN-2026-003';

-- 如果上面没更新到（设备不存在），则插入新记录
INSERT IGNORE INTO devices (device_sn, device_name, device_type, firmware_ver, connection_type, huawei_device_id, plot_id, latitude, longitude, online_status, status)
VALUES ('BPN-20240003', '门口安防节点 (E53_IS1)', 'security', 'v1.0.0-security', 'mqtt', '6a16b4f97f2e6c302f74fe36_smart-003', 2, 34.7580, 113.6535, 0, 1);

-- 验证
SELECT id, device_sn, device_name, device_type, huawei_device_id, plot_id, online_status
FROM devices
WHERE huawei_device_id LIKE '%smart-003%';
