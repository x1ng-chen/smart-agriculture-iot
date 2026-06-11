import { Router } from "express";
import { query } from "../db.js";
import { writeSensorData } from "../influxdb.js";
import { checkAlerts } from "../alert-engine.js";
import { runStrategies } from "../strategy-engine.js";
import { checkAnomalies } from "../ai/anomaly-detector.js";
import { webhookAuth } from "../middleware/webhook-auth.js";
import { webhookIdempotent } from "../middleware/idempotent.js";
import { sendCommand } from "../huawei-iot.js";

const router = Router();

let brokerRef = null;

export function setBrokerRef(broker) {
  brokerRef = broker;
}

// ── 数据清洗：检测故障码并拦截脏数据 ──────────────

const FAULT_CODES = new Set([999, 998]);
const FIELD_BOUNDS = {
  soil_moisture: [0, 100],
  soil_temp: [-20, 80],
  air_temp: [-30, 70],
  air_humidity: [0, 100],
  light: [0, 200000]
};

function cleanPayload(properties) {
  const payload = {
    soil_moisture: properties.soil_moisture ?? properties.SoilMoisture ?? properties.soil_moisture_val ?? null,
    soil_temp: properties.soil_temperature ?? properties.SoilTemperature ?? properties.soil_temp ?? null,
    air_temp: properties.air_temperature ?? properties.Temperature ?? properties.air_temp ?? null,
    air_humidity: properties.air_humidity ?? properties.Humidity ?? null,
    light: properties.luminance ?? properties.Luminance ?? properties.light ?? null
  };

  const faults = [];

  // 检查每个字段是否有故障码
  for (const [field, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;
    if (FAULT_CODES.has(Number(value))) {
      faults.push({ field, value });
      payload[field] = null; // 擦除故障码，不写入 InfluxDB
    }
    // 检查物理边界
    const [lo, hi] = FIELD_BOUNDS[field] || [-Infinity, Infinity];
    if (Number(value) < lo || Number(value) > hi) {
      faults.push({ field, value, reason: `超出物理范围 [${lo}, ${hi}]` });
      payload[field] = null;
    }
  }

  // 确保所有数值都是浮点数（InfluxDB 字段类型一致）
  for (const [field, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined) {
      payload[field] = parseFloat(Number(value).toFixed(2));
    }
  }

  return { payload, faults };
}

// ── 路由（挂载安全中间件链）───────────────────────

// 中间件链：验签 → 幂等去重
router.post("/data", webhookAuth, webhookIdempotent, async (req, res) => {
  try {
    const body = req.body;
    console.log("[huawei:webhook] ============ RECEIVED DATA ============");
    console.log("[huawei:webhook] received:", JSON.stringify(body).substring(0, 500));

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

    const devices = await query(
      "SELECT id, device_sn, device_name, plot_id FROM devices WHERE huawei_device_id = ? AND status = 1",
      [huaweiDeviceId]
    );

    if (devices.length === 0) {
      console.log("[huawei:webhook] unknown huawei_device_id: " + huaweiDeviceId);
      return res.status(200).json({ code: 0, message: "ok (unknown device)" });
    }

    const deviceId = devices[0].id;
    const deviceSn = devices[0].device_sn;
    const deviceName = devices[0].device_name;
    const plotId = devices[0].plot_id;

    // ── 数据清洗 ──
    const { payload, faults } = cleanPayload(properties);

    // ── 安防入侵检测 (Node B → 联动 Node A 停泵) ──
    const intrusionDetected =
      properties.intrusion_detected === 1 ||
      properties.intrusion_detected === "1" ||
      properties.IntrusionDetected === 1;

    if (intrusionDetected) {
      console.log("[huawei:webhook] ⚠ INTRUSION DETECTED from", deviceSn, "(", deviceName, ")");

      // 1. 写入告警
      await query(
        "INSERT INTO alerts (device_id, alert_type, alert_level, message, resolved) VALUES (?, 'intrusion', 'danger', ?, 0)",
        [deviceId, `[${deviceSn}] 安防入侵报警: ${deviceName} 检测到人体闯入`]
      );

      // 2. 查找同地块的灌溉节点 (Node A), 发送紧急停泵指令
      if (plotId) {
        const pumpDevices = await query(
          `SELECT id, device_sn, device_name, huawei_device_id
           FROM devices
           WHERE plot_id = ? AND device_type IN ('bearpi_nano', 'pump') AND status = 1 AND online_status = 1`,
          [plotId]
        );

        for (const pump of pumpDevices) {
          console.log(`[huawei:webhook] → sending StopIrrigation to ${pump.device_sn} (${pump.huawei_device_id})`);
          const sent = await sendCommand(pump.huawei_device_id, "StopIrrigation", {
            reason: "intrusion",
            source_device_sn: deviceSn,
            source_device_name: deviceName,
            duration_sec: 0
          });
          if (sent) {
            console.log(`[huawei:webhook]   ✓ StopIrrigation sent to ${pump.device_sn}`);
          } else {
            console.log(`[huawei:webhook]   ✗ FAILED to send StopIrrigation to ${pump.device_sn}`);
          }
        }

        // 3. 所有灌溉节点都通知一遍 (即使不在同一plot, 全局紧急)
        const allPumps = await query(
          `SELECT id, device_sn, device_name, huawei_device_id, plot_id
           FROM devices
           WHERE device_type IN ('bearpi_nano', 'pump') AND status = 1 AND online_status = 1
             AND id != ?`,
          [deviceId]
        );
        for (const pump of allPumps) {
          // 跳过已经在上面处理过的
          if (pumpDevices.some(d => d.id === pump.id)) continue;
          console.log(`[huawei:webhook] → global StopIrrigation to ${pump.device_sn}`);
          await sendCommand(pump.huawei_device_id, "StopIrrigation", {
            reason: "intrusion",
            source_device_sn: deviceSn,
            duration_sec: 0
          });
        }
      }

      // 4. Socket.io 广播入侵告警给前端
      if (brokerRef) {
        brokerRef.emit("alert:intrusion", {
          device_sn: deviceSn,
          device_name: deviceName,
          device_id: deviceId,
          plot_id: plotId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ── 安防解除 (intrusion cleared) ──
    const intrusionCleared =
      (properties.intrusion_detected === 0 ||
       properties.intrusion_detected === "0" ||
       properties.IntrusionDetected === 0) &&
      (properties.event === "clear" || properties.Event === "clear");

    if (intrusionCleared) {
      console.log("[huawei:webhook] ✓ intrusion CLEARED from", deviceSn);

      // 更新告警为已解除
      await query(
        "UPDATE alerts SET resolved = 1, resolved_at = NOW() WHERE device_id = ? AND alert_type = 'intrusion' AND resolved = 0",
        [deviceId]
      );

      // 恢复灌溉节点 (发送 ResumeIrrigation)
      if (plotId) {
        const lockedPumps = await query(
          `SELECT id, device_sn, huawei_device_id
           FROM devices
           WHERE plot_id = ? AND device_type IN ('bearpi_nano', 'pump') AND status = 1 AND online_status = 1`,
          [plotId]
        );
        for (const pump of lockedPumps) {
          console.log(`[huawei:webhook] → sending ResumeIrrigation to ${pump.device_sn}`);
          await sendCommand(pump.huawei_device_id, "ResumeIrrigation", {
            reason: "intrusion_cleared"
          });
        }
      }

      if (brokerRef) {
        brokerRef.emit("alert:intrusion_cleared", {
          device_sn: deviceSn,
          device_name: deviceName,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ── 纯安防事件 (无传感器数值) 直接返回, 不写 InfluxDB ──
    // 但必须先更新在线状态 + 广播，否则设备看起来始终离线
    if (intrusionDetected || intrusionCleared) {
      const hasOtherData = Object.values(payload).some(v => v !== null);
      if (!hasOtherData) {
        // 更新在线状态
        await query(
          "UPDATE devices SET online_status = 1, last_online_at = NOW() WHERE id = ?",
          [deviceId]
        );
        // 广播在线状态变更
        if (brokerRef) {
          brokerRef.emit("device:online", {
            device_sn: deviceSn,
            device_name: deviceName,
            device_id: deviceId,
            online_status: 1,
            timestamp: new Date().toISOString()
          });
        }
        return res.status(200).json({ code: 0, message: "ok (security event processed)" });
      }
    }

    // 故障码 → 写入 MySQL alerts 告警
    if (faults.length > 0) {
      for (const f of faults) {
        const msg = f.reason
          ? `传感器 ${f.field} 异常: 值=${f.value}, ${f.reason}`
          : `传感器 ${f.field} 上报故障码: ${f.value}`;
        await query(
          "INSERT INTO alerts (device_id, alert_type, alert_level, message, resolved) VALUES (?, 'sensor_fault', 'danger', ?, 0)",
          [deviceId, `[${deviceSn}] ${msg}`]
        );
        console.log("[huawei:webhook] FAULT:", msg);
      }

      // 通过内部 MQTT 广播故障，前端实时标红
      if (brokerRef) {
        brokerRef.publish({
          topic: `sensor/${deviceSn}/fault`,
          payload: Buffer.from(JSON.stringify({
            device_sn: deviceSn,
            device_name: deviceName,
            faults,
            timestamp: new Date().toISOString()
          })),
          qos: 1,
          retain: false
        }, () => {});
      }
    }

    // ── 写入 InfluxDB (降级时静默跳过) ──
    const hasValidData = Object.values(payload).some(v => v !== null);
    if (hasValidData) {
      await writeSensorData(deviceId, deviceSn, payload);
    } else {
      console.log("[huawei:webhook] all fields filtered out, skip InfluxDB write");
      return res.status(200).json({ code: 0, message: "ok (all fields filtered)" });
    }

    // MySQL: 传感器历史 + 设备缓存
    await query(
      `INSERT INTO sensor_readings (device_id, soil_moisture, soil_temp, air_temp, air_humidity, light)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [deviceId, payload.soil_moisture, payload.soil_temp, payload.air_temp, payload.air_humidity, payload.light]
    );

    // 更新在线状态 + 传感器数据缓存
    await query(
      "UPDATE devices SET online_status = 1, last_online_at = NOW(), last_sensor_data = ? WHERE id = ?",
      [JSON.stringify({ soil_moisture: payload.soil_moisture, soil_temp: payload.soil_temp, air_temp: payload.air_temp, air_humidity: payload.air_humidity, light: payload.light, updated_at: new Date().toISOString() }), deviceId]
    );

    // 自动告警检查
    await checkAlerts(deviceId, plotId, deviceSn, payload);

    // AI 异常检测
    checkAnomalies(deviceId, deviceSn, payload).catch(err =>
      console.error('[huawei:webhook] anomaly check error:', err.message)
    );

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
      console.log("[huawei:webhook] broadcasting sensor data for", deviceSn)
      brokerRef.publish({
        topic: "sensor/" + deviceSn + "/data",
        payload: Buffer.from(JSON.stringify({
          device_sn: deviceSn,
          soil_moisture: payload.soil_moisture,
          soil_temp: payload.soil_temp,
          air_temp: payload.air_temp,
          air_humidity: payload.air_humidity,
          light: payload.light,
        })),
        qos: 1,
        retain: false,
      }, () => {});
    }

    console.log("[huawei:webhook] saved: huawei=" + huaweiDeviceId + " sn=" + deviceSn + " moisture=" + payload.soil_moisture);

    res.status(200).json({ code: 0, message: "ok" });
  } catch (e) {
    console.error("[huawei:webhook] error:", e.message);
    res.status(500).json({ code: 1, message: "internal error" });
  }
});

export default router;
