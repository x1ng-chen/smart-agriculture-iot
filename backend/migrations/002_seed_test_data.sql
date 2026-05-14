-- 002_seed_test_data.sql
-- 智慧农业灌溉系统 - 测试数据填充

USE smart_agriculture;

-- ========== 用户 ==========
-- admin 已由服务启动时自动创建，这里添加更多操作员
INSERT IGNORE INTO users (username, password, real_name, role, phone, status) VALUES
('zhangsan', '$2a$10$5/F.zTzKcxWBqSFDScrtU.kj3oyzHIO0HO3s/QebP9sFEm1TxM8Cu', '张三', 'operator', '13800001111', 1),
('lisi', '$2a$10$5/F.zTzKcxWBqSFDScrtU.kj3oyzHIO0HO3s/QebP9sFEm1TxM8Cu', '李四', 'operator', '13800002222', 1),
('wangwu', '$2a$10$5/F.zTzKcxWBqSFDScrtU.kj3oyzHIO0HO3s/QebP9sFEm1TxM8Cu', '王五', 'operator', '13800003333', 1);

-- ========== 地块 ==========
INSERT INTO plots (id, plot_name, crop_type, area_sqm, description) VALUES
(1, '一号小麦田', 'wheat', 5000.00, '北区主试验田，种植冬小麦，配备智能滴灌系统'),
(2, '二号玉米地', 'corn', 3200.00, '东区高产玉米示范田，土壤为砂壤土'),
(3, '三号蔬菜大棚', 'vegetable', 800.00, '温室大棚，种植番茄和黄瓜'),
(4, '四号果园', 'fruit', 2100.00, '南区苹果园，树龄5年');

-- ========== 设备 ==========
INSERT INTO devices (id, device_sn, device_name, device_type, firmware_ver, plot_id, latitude, longitude, online_status, last_online_at, status) VALUES
(1, 'BPN-2026-001', '小麦田传感器A', 'bearpi_nano', 'v1.2.3', 1, 34.7568, 113.6523, 1, NOW(), 1),
(2, 'BPN-2026-002', '小麦田传感器B', 'bearpi_nano', 'v1.2.3', 1, 34.7571, 113.6528, 1, NOW(), 1),
(3, 'BPN-2026-003', '玉米地传感器A', 'bearpi_nano', 'v1.2.3', 2, 34.7580, 113.6535, 1, NOW(), 1),
(4, 'BPN-2026-004', '大棚传感器A', 'bearpi_nano', 'v1.2.3', 3, 34.7560, 113.6510, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), 1),
(5, 'BPN-2026-005', '果园传感器A', 'bearpi_nano', 'v1.2.3', 4, 34.7590, 113.6500, 1, NOW(), 1);

-- ========== 灌溉策略 ==========
INSERT INTO irrigation_strategies (id, strategy_name, plot_id, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled) VALUES
(1, '小麦常规灌溉', 1, 20, 45, 15, 35, 1200, 3600, 2.5, 1),
(2, '小麦干旱应急', 1, 10, 20, 18, 38, 1800, 1800, 3.0, 1),
(3, '玉米日常灌溉', 2, 25, 50, 15, 32, 1500, 2400, 2.0, 1),
(4, '大棚精细滴灌', 3, 40, 60, 18, 30, 600, 900, 0.5, 1),
(5, '果园深灌', 4, 20, 40, 10, 35, 2400, 7200, 4.0, 1),
(6, '冬季低流量', 1, 15, 35, 0, 12, 900, 7200, 1.5, 0);

-- ========== 传感器历史数据 ==========
INSERT INTO sensor_data (device_id, soil_moisture, soil_temp, air_temp, air_humidity, light, created_at) VALUES
-- 设备1 - 最近24小时的数据
(1, 35.2, 22.1, 26.3, 62.5, 1850, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(1, 33.8, 21.8, 27.1, 60.2, 1920, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(1, 30.5, 22.5, 28.4, 55.8, 2100, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
(1, 28.1, 23.2, 30.2, 52.3, 2350, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(1, 26.3, 24.0, 31.5, 48.6, 2680, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(1, 32.0, 23.5, 29.0, 56.1, 2200, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(1, 34.5, 22.8, 27.5, 61.0, 1880, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
-- 设备2 - 最近24小时的数据
(2, 38.0, 22.3, 26.5, 63.0, 1800, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(2, 36.5, 22.0, 27.0, 60.5, 1900, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(2, 34.2, 22.8, 28.0, 57.2, 2050, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(2, 31.0, 23.5, 30.0, 53.5, 2400, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(2, 33.5, 23.0, 28.5, 58.0, 2100, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
-- 设备3 - 最近24小时的数据
(3, 40.5, 23.5, 27.0, 65.0, 1750, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(3, 38.8, 23.8, 27.8, 62.3, 1850, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
(3, 36.2, 24.2, 29.0, 58.5, 2100, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(3, 37.5, 24.0, 28.5, 60.0, 1980, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
-- 设备5 - 最近24小时的数据
(5, 28.0, 21.5, 25.5, 58.0, 1650, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(5, 26.5, 22.0, 26.8, 55.2, 1780, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(5, 25.0, 22.8, 28.0, 52.0, 1950, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(5, 27.2, 22.3, 27.0, 56.5, 1820, DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- ========== 灌溉日志 ==========
INSERT INTO irrigation_logs (id, device_id, strategy_id, trigger_type, operator_id, start_time, end_time, duration_sec, water_used_l, status, remark) VALUES
(1, 1, 1, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 900 SECOND, 900, 37.5, 'completed', '土壤湿度低于30%, 自动触发'),
(2, 2, 1, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 720 SECOND, 720, 30.0, 'completed', '土壤湿度低于30%, 自动触发'),
(3, 3, 3, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 600 SECOND, 600, 20.0, 'completed', '常规灌溉, 湿度在阈值范围内'),
(4, 1, 1, 'manual', 2, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 12 HOUR) + INTERVAL 450 SECOND, 450, 18.8, 'completed', '张三手动灌溉'),
(5, 5, 5, 'auto', NULL, DATE_SUB(NOW(), INTERVAL 6 HOUR), NULL, NULL, NULL, 'running', '土壤湿度低于25%, 自动触发深灌');

-- ========== 告警记录 ==========
INSERT INTO alerts (id, device_id, alert_type, alert_level, message, resolved, created_at) VALUES
(1, 4, 'device_offline', 'warning', '大棚传感器A 离线超过2小时', 0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 1, 'low_moisture', 'warning', '小麦田传感器A 检测到土壤湿度低于25%', 1, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(3, 5, 'irrigation_started', 'info', '果园传感器A 自动灌溉已启动 (策略: 果园深灌)', 0, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(4, 3, 'high_temp', 'warning', '玉米地传感器A 检测到空气温度超过32°C', 1, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ========== 定时任务 ==========
INSERT INTO scheduled_tasks (id, device_id, task_name, cron_expr, action, duration_sec, enabled) VALUES
(1, 1, '小麦田每日定时灌溉', '0 6 * * *', 'irrigate', 600, TRUE),
(2, 3, '玉米地清晨灌溉', '0 5 * * *', 'irrigate', 900, TRUE),
(3, 5, '果园周灌溉', '0 7 * * 1,4', 'irrigate', 1800, FALSE);
