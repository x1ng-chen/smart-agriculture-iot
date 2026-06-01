import { Aedes } from "aedes";
import http from "http";
import { WebSocketServer } from "ws";
import { Duplex } from "stream";
import { query } from "./db.js";
import { checkAlerts } from "./alert-engine.js";
import { runStrategies } from "./strategy-engine.js";

export async function createMqttBroker() {
  const broker = await Aedes.createBroker();

  broker.on("client", (client) => {
    console.log("[mqtt] client connected: " + client.id);
  });

  broker.on("clientDisconnect", (client) => {
    console.log("[mqtt] client disconnected: " + client.id);
  });

  broker.on("publish", async (packet, client) => {
    const topic = packet.topic;
    const match = topic.match(/^sensor\/([\w-]+)\/data$/);
    if (!match) return;

    const deviceSn = match[1];
    try {
      const payload = JSON.parse(packet.payload.toString());
      const devices = await query(
        "SELECT id, plot_id FROM devices WHERE device_sn = ? AND status = 1",
        [deviceSn]
      );
      if (devices.length === 0) return;

      const deviceId = devices[0].id;
      const plotId = devices[0].plot_id;

      await query(
        "INSERT INTO sensor_data (device_id, soil_moisture, soil_temp, air_temp, air_humidity, light) VALUES (?, ?, ?, ?, ?, ?)",
        [deviceId, payload.soil_moisture, payload.soil_temp, payload.air_temp, payload.air_humidity, payload.light]
      );

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
          broker.emit("autoIrrigate", {
            deviceId,
            deviceSn,
            durationSec: log.duration_sec,
          });
        }
      }
    } catch (e) {
      console.error("[mqtt] sensor data error:", e.message);
    }
  });

  const httpServer = http.createServer();
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/mqtt",
    perMessageDeflate: false,
    handleProtocols: (protocols) => {
      return protocols.has("mqtt") ? "mqtt" : false;
    },
  });

  wss.on("connection", (ws) => {
    const stream = new Duplex({
      write(chunk, encoding, callback) {
        ws.send(chunk, callback);
      },
      read() {},
    });
    ws.on("message", (data) => {
      stream.push(data);
    });
    ws.on("close", () => {
      stream.push(null);
    });
    ws.on("error", (err) => {
      stream.destroy(err);
    });
    broker.handle(stream);
  });

  httpServer.listen(8083, () => {
    console.log("[mqtt] broker started on ws://localhost:8083");
  });

  return broker;
}
