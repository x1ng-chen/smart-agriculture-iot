-- 001_init.sql
-- 智慧农业灌溉系统 - 初始化数据库

CREATE DATABASE IF NOT EXISTS smart_agriculture
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE smart_agriculture;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    password    VARCHAR(256) NOT NULL,
    real_name   VARCHAR(64),
    role        VARCHAR(16)  NOT NULL DEFAULT 'operator',
    phone       VARCHAR(20),
    email       VARCHAR(128),
    status      SMALLINT     NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE INDEX idx_users_username ON users(username);

-- 地块表
CREATE TABLE IF NOT EXISTS plots (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    plot_name     VARCHAR(128) NOT NULL,
    crop_type     VARCHAR(64),
    area_sqm      DOUBLE,
    description   TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_sn       VARCHAR(64)  NOT NULL UNIQUE,
    device_name     VARCHAR(128),
    device_type     VARCHAR(32)  NOT NULL DEFAULT 'bearpi_nano',
    firmware_ver    VARCHAR(32),
    plot_id         BIGINT,
    latitude        DOUBLE,
    longitude       DOUBLE,
    online_status   SMALLINT     NOT NULL DEFAULT 0,
    last_online_at  TIMESTAMP NULL,
    status          SMALLINT     NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX idx_devices_sn ON devices(device_sn);
CREATE INDEX idx_devices_plot ON devices(plot_id);

-- 灌溉策略表
CREATE TABLE IF NOT EXISTS irrigation_strategies (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    strategy_name     VARCHAR(128) NOT NULL,
    plot_id           BIGINT,
    humidity_min      DOUBLE NOT NULL,
    humidity_max      DOUBLE NOT NULL,
    temp_min          DOUBLE,
    temp_max          DOUBLE,
    irrigation_duration_max INTEGER NOT NULL DEFAULT 1800,
    cooldown_interval INTEGER NOT NULL DEFAULT 3600,
    water_flow_rate   DOUBLE,
    enabled           TINYINT(1) NOT NULL DEFAULT 1,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX idx_strategies_plot ON irrigation_strategies(plot_id);

-- 灌溉日志表
CREATE TABLE IF NOT EXISTS irrigation_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id       BIGINT        NOT NULL,
    strategy_id     BIGINT,
    trigger_type    VARCHAR(16)   NOT NULL,
    operator_id     BIGINT,
    start_time      TIMESTAMP     NOT NULL,
    end_time        TIMESTAMP NULL,
    duration_sec    INTEGER,
    water_used_l    DOUBLE,
    status          VARCHAR(16)   NOT NULL DEFAULT 'running',
    remark          TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (strategy_id) REFERENCES irrigation_strategies(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX idx_irrigation_logs_device ON irrigation_logs(device_id);
CREATE INDEX idx_irrigation_logs_time ON irrigation_logs(start_time);

-- 告警记录表
CREATE TABLE IF NOT EXISTS alerts (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id     BIGINT        NOT NULL,
    alert_type    VARCHAR(32)   NOT NULL,
    alert_level   VARCHAR(16)   NOT NULL DEFAULT 'warning',
    message       TEXT          NOT NULL,
    resolved      TINYINT(1)   NOT NULL DEFAULT 0,
    resolved_at   TIMESTAMP NULL,
    resolved_by   BIGINT,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_alerts_device ON alerts(device_id);
CREATE INDEX idx_alerts_time ON alerts(created_at);

-- 定时任务表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id       BIGINT        NOT NULL,
    task_name       VARCHAR(128)  NOT NULL,
    cron_expr       VARCHAR(64)   NOT NULL,
    action          VARCHAR(32)   NOT NULL,
    duration_sec    INTEGER,
    enabled         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_scheduled_device ON scheduled_tasks(device_id);

-- 插入默认管理员 (密码: admin123, bcrypt)
-- 默认管理员由服务启动时自动创建 (密码: admin123)
