import { Router } from "express";
import { query } from "../db.js";
import {
  getSensorData24hTrends, getDevicesLatestData,
  getDashboardIrrigationStats, getRecentAlerts, getUnresolvedAlertCount
} from "../influxdb.js";
import { success, error } from "../utils/response.js";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const onlineRes = await query("SELECT count(*) as cnt FROM devices WHERE online_status = 1");
    const { todayIrrigation, totalWater } = await getDashboardIrrigationStats();
    const activeAlerts = await getUnresolvedAlertCount();

    const recentAlerts = await getRecentAlerts(5);

    const onlineDevices = await query(
      `SELECT id, device_name, device_sn, online_status, last_online_at
       FROM devices WHERE online_status = 1 ORDER BY last_online_at DESC`
    );

    res.json(
      success({
        onlineDevices: onlineRes[0].cnt,
        todayIrrigation,
        activeAlerts,
        totalWater,
        recentAlerts,
        onlineDeviceList: onlineDevices,
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json(error("查询失败"));
  }
});

router.get("/trends-24h", async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const rows = await getSensorData24hTrends(deviceId);
    res.json(success(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json(error("查询失败"));
  }
});

router.get("/devices-latest", async (req, res) => {
  try {
    // 获取设备信息 (含 MySQL 缓存的传感器数据)
    const devices = await query(
      `SELECT id, device_name, device_sn, online_status, device_type, last_sensor_data
       FROM devices WHERE status = 1
       ORDER BY online_status DESC, id ASC`
    );

    // 获取 InfluxDB 最新传感器数据
    const latestData = await getDevicesLatestData();
    const dataMap = new Map();
    for (const d of latestData) {
      dataMap.set(d.device_id, d);
    }

    // 合并：InfluxDB 优先，MySQL 缓存回退
    const merged = devices.map(d => {
      const ld = dataMap.get(d.id);
      // 解析 MySQL 缓存作为回退
      let cached = null;
      if (d.last_sensor_data) {
        try { cached = JSON.parse(d.last_sensor_data); } catch (_) {}
      }
      return {
        id: d.id,
        device_name: d.device_name,
        device_sn: d.device_sn,
        online_status: d.online_status,
        device_type: d.device_type,
        soil_moisture: ld?.soil_moisture ?? cached?.soil_moisture ?? null,
        soil_temp: ld?.soil_temp ?? cached?.soil_temp ?? null,
        air_temp: ld?.air_temp ?? cached?.air_temp ?? null,
        air_humidity: ld?.air_humidity ?? cached?.air_humidity ?? null,
        light: ld?.light ?? cached?.light ?? null,
        last_data_at: ld?.last_data_at ?? cached?.updated_at ?? null,
      };
    });

    res.json(success(merged));
  } catch (e) {
    console.error(e);
    res.status(500).json(error("查询失败"));
  }
});

export default router;
