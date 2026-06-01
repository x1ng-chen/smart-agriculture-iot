import { Router } from "express";
import { query } from "../db.js";
import { checkAlerts } from "../alert-engine.js";
import { runStrategies } from "../strategy-engine.js";

const router = Router();

let brokerRef = null;

export function setBrokerRef(broker) {
  brokerRef = broker;
}

/**
 * POST /api/v1/huawei/data
 * 华为云 IoT 数据转发规则 → HTTP 推送
 *
 * 支持两种格式：
 * 1. 华为云标准通知格式 (resource=“device.message”)
 *    { notify_data: { header: { device_id }, body: { services: [...] } } }
 * 2. 自定义 topic 转发简化格式
 *    { device_id: “sn”, data: { soil_moisture, ... } }
 */
router.post("/data", async (req, res) => {
  try {
    const body = req.body;
    console.log("[huawei:webhook] received:", JSON.stringify(body).substring(0, 500));

    // 解析华为设备ID和属性
    let huaweiDeviceId = null;
    let properties = {};

    if (body.notify_data) {
      const header = body.notify_data.header || {};
      huaweiDeviceId = header.device_id;
      const services = body.notify_data.body?.services || [];
      for (const svc of services) {
        Object.assign(properties, svc.properties || svc);
      }
    } else {
      huaweiDeviceId = body.device_id;
      properties = body.data || body.properties || body;
    }

    if (!huaweiDeviceId) {
      return res.status(400).json({ code: 1, message: "missing device_id" });
    }

    // 按华为设备ID查找本地设备
    const devices = await query(
      "SELECT id, device_sn, plot_id FROM devices WHERE huawei_device_id = ? AND status = 1",
      [huaweiDeviceId]
    );

    if (devices.length === 0) {
      console.log("[huawei:webhook] unknown huawei_device_id: " + huaweiDeviceId);
      return res.status(200).json({ code: 0, message: "ok (unknown device)" });
    }

    const deviceId = devices[0].id;
    const deviceSn = devices[0].device_sn;
    const plotId = devices[0].plot_id;

    // 规范化属性名（兼容：snake_case / camelCase / PascalCase）
    const payload = {
      soil_moisture: properties.soil_moisture ?? properties.SoilMoisture ?? properties.soil_moisture_val ?? null,
      soil_temp: properties.soil_temperature ?? properties.SoilTemperature ?? properties.soil_temp ?? null,
      air_temp: properties.air_temperature ?? properties.Temperature ?? properties.air_temp ?? null,
      air_humidity: properties.air_humidity ?? properties.Humidity ?? null,
      light: properties.luminance ?? properties.Luminance ?? properties.light ?? null,
    };

    // 写入 sensor_data
    await query(
      "INSERT INTO sensor_data (device_id, soil_moisture, soil_temp, air_temp, air_humidity, light) VALUES (?, ?, ?, ?, ?, ?)",
      [deviceId, payload.soil_moisture, payload.soil_temp, payload.air_temp, payload.air_humidity, payload.light]
    );

    // 更新在线状态
    await query(
      "UPDATE devices SET online_status = 1, last_online_at = NOW() WHERE id = ?",
      [deviceId]
    );

    // 自动告警检查
    await checkAlerts(deviceId, plotId, deviceSn, payload);

    // 自动灌溉策略检查
    if (plotId) {
      const logs = await runStrategies(deviceId, plotId, deviceSn, payload);
      for (const log of logs) {
        if (brokerRef) {
          brokerRef.emit("autoIrrigate", {
            deviceId,
            deviceSn,
            durationSec: log.duration_sec,
          });
        }
      }
    }

    // 广播到内部 MQTT（前端 Dashboard 实时更新）
    if (brokerRef) {
      brokerRef.publish(
        {
          topic: "sensor/" + deviceSn + "/data",
          payload: Buffer.from(
            JSON.stringify({
              device_sn: deviceSn,
              soil_moisture: payload.soil_moisture,
              soil_temp: payload.soil_temp,
              air_temp: payload.air_temp,
              air_humidity: payload.air_humidity,
              light: payload.light,
            })
          ),
          qos: 1,
          retain: false,
        },
        () => {}
      );
    }

    console.log("[huawei:webhook] saved: huawei=" + huaweiDeviceId + " sn=" + deviceSn + " moisture=" + payload.soil_moisture);

    res.status(200).json({ code: 0, message: "ok" });
  } catch (e) {
    console.error("[huawei:webhook] error:", e.message);
    res.status(500).json({ code: 1, message: "internal error" });
  }
});

export default router;
