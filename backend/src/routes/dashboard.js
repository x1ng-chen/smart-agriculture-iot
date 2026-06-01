import { Router } from "express";
import { query } from "../db.js";
import { success, error } from "../utils/response.js";

const router = Router();

// Dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const [onlineRes, irrigationRes, alertRes, waterRes] = await Promise.all([
      query("SELECT count(*) as cnt FROM devices WHERE online_status = 1"),
      query("SELECT count(*) as cnt FROM irrigation_logs WHERE DATE(start_time) = CURDATE()"),
      query("SELECT count(*) as cnt FROM alerts WHERE resolved = 0"),
      query("SELECT COALESCE(SUM(water_used_l), 0) as total FROM irrigation_logs WHERE DATE(start_time) = CURDATE()"),
    ]);

    const recentAlerts = await query(
      `SELECT a.*, d.device_name FROM alerts a
       LEFT JOIN devices d ON a.device_id = d.id
       ORDER BY a.created_at DESC LIMIT 5`
    );

    const onlineDevices = await query(
      `SELECT id, device_name, device_sn, online_status, last_online_at
       FROM devices WHERE online_status = 1 ORDER BY last_online_at DESC`
    );

    res.json(
      success({
        onlineDevices: onlineRes[0].cnt,
        todayIrrigation: irrigationRes[0].cnt,
        activeAlerts: alertRes[0].cnt,
        totalWater: Math.round(waterRes[0].total * 100) / 100,
        recentAlerts,
        onlineDeviceList: onlineDevices,
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json(error("查询失败"));
  }
});

// 24h 历史趋势 - 过去24小时每个小时的土壤湿度平均值
router.get("/trends-24h", async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    let where = "WHERE sd.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
    const params = [];
    if (deviceId) {
      where += " AND sd.device_id = ?";
      params.push(deviceId);
    }

    const rows = await query(
      `SELECT
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:00') AS hour_bucket,
        AVG(sd.soil_moisture) AS avg_moisture,
        AVG(sd.soil_temp) AS avg_soil_temp,
        AVG(sd.air_temp) AS avg_air_temp,
        AVG(sd.air_humidity) AS avg_humidity
       FROM sensor_data sd
       ${where}
       GROUP BY hour_bucket
       ORDER BY hour_bucket ASC`,
      params
    );

    res.json(success(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json(error("查询失败"));
  }
});

// 所有设备最新数据快照 (前端监控大屏)
router.get("/devices-latest", async (req, res) => {
  try {
    const rows = await query(
      `SELECT d.id, d.device_name, d.device_sn, d.online_status, d.device_type,
        sd.soil_moisture, sd.soil_temp, sd.air_temp, sd.air_humidity, sd.light,
        sd.created_at AS last_data_at
       FROM devices d
       LEFT JOIN (
         SELECT device_id, soil_moisture, soil_temp, air_temp, air_humidity, light, created_at,
           ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY created_at DESC) AS rn
         FROM sensor_data
       ) sd ON d.id = sd.device_id AND sd.rn = 1
       WHERE d.status = 1
       ORDER BY d.online_status DESC, d.id ASC`
    );

    res.json(success(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json(error("查询失败"));
  }
});

export default router;
