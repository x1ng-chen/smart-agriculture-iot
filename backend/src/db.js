import mysql from 'mysql2/promise'
import config from './config.js'

let pool = null

export async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10
    })
  }
  return pool
}

export async function query(sql, params) {
  const p = await getPool()
  const [rows] = await p.query(sql, params)
  return rows
}

// 建表 + 创建默认管理员
export async function initTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password VARCHAR(256) NOT NULL,
      real_name VARCHAR(64),
      role VARCHAR(16) NOT NULL DEFAULT 'operator',
      phone VARCHAR(20),
      email VARCHAR(128),
      status SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS plots (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      plot_name VARCHAR(128) NOT NULL,
      crop_type VARCHAR(64),
      area_sqm DOUBLE,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS devices (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_sn VARCHAR(64) NOT NULL UNIQUE,
      device_name VARCHAR(128),
      device_type VARCHAR(32) NOT NULL DEFAULT 'bearpi_nano',
      firmware_ver VARCHAR(32),
      connection_type VARCHAR(16) NOT NULL DEFAULT 'uart',
      com_port VARCHAR(32) DEFAULT NULL,
      huawei_device_id VARCHAR(128) DEFAULT NULL,
      plot_id BIGINT,
      latitude DOUBLE,
      longitude DOUBLE,
      online_status SMALLINT NOT NULL DEFAULT 0,
      last_online_at TIMESTAMP NULL,
      status SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_devices_sn (device_sn),
      INDEX idx_devices_huawei (huawei_device_id),
      INDEX idx_devices_plot (plot_id),
      FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS irrigation_strategies (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      strategy_name VARCHAR(128) NOT NULL,
      plot_id BIGINT,
      humidity_min DOUBLE NOT NULL,
      humidity_max DOUBLE NOT NULL,
      temp_min DOUBLE,
      temp_max DOUBLE,
      irrigation_duration_max INTEGER NOT NULL DEFAULT 1800,
      cooldown_interval INTEGER NOT NULL DEFAULT 3600,
      water_flow_rate DOUBLE,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_strategies_plot (plot_id),
      FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS irrigation_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id BIGINT NOT NULL,
      strategy_id BIGINT,
      trigger_type VARCHAR(16) NOT NULL,
      operator_id BIGINT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NULL,
      duration_sec INTEGER,
      water_used_l DOUBLE,
      status VARCHAR(16) NOT NULL DEFAULT 'running',
      remark TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_irrigation_logs_device (device_id),
      INDEX idx_irrigation_logs_time (start_time),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (strategy_id) REFERENCES irrigation_strategies(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS alerts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id BIGINT NOT NULL,
      alert_type VARCHAR(32) NOT NULL,
      alert_level VARCHAR(16) NOT NULL DEFAULT 'warning',
      message TEXT NOT NULL,
      resolved TINYINT(1) NOT NULL DEFAULT 0,
      resolved_at TIMESTAMP NULL,
      resolved_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_alerts_device (device_id),
      INDEX idx_alerts_time (created_at),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id BIGINT NOT NULL,
      task_name VARCHAR(128) NOT NULL,
      cron_expr VARCHAR(64) NOT NULL,
      action VARCHAR(32) NOT NULL,
      duration_sec INTEGER,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_scheduled_device (device_id),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS sensor_data (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id BIGINT NOT NULL,
      soil_moisture DOUBLE,
      soil_temp DOUBLE,
      air_temp DOUBLE,
      air_humidity DOUBLE,
      light DOUBLE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sensor_device_time (device_id, created_at),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ]

  for (const sql of tables) {
    await query(sql)
  }

  // 兼容已有数据库：添加 huawei_device_id 字段
  try {
    await query("ALTER TABLE devices ADD COLUMN huawei_device_id VARCHAR(128) DEFAULT NULL, ADD INDEX idx_devices_huawei (huawei_device_id)")
  } catch (e) {
    if (e.errno !== 1060) console.error('[db] alter table error:', e.message)
  }

  // 兼容已有数据库：添加微信登录字段
  try {
    await query("ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(64) DEFAULT NULL AFTER email, ADD UNIQUE INDEX idx_users_wechat_openid (wechat_openid)")
  } catch (e) {
    if (e.errno !== 1060) console.error('[db] alter table error:', e.message)
  }
}
