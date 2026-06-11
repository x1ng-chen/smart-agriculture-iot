import { query } from "./db.js";
import {
  checkRunningIrrigation, checkRecentIrrigation,
  createIrrigationLog, createAlert
} from "./influxdb.js";
import { checkAiCooldown } from "./redis.js";
import config from "./config.js";

export async function runStrategies(deviceId, plotId, deviceSn, payload) {
  const strategies = await query(
    "SELECT * FROM irrigation_strategies WHERE plot_id = ? AND enabled = 1",
    [plotId]
  );

  const aiStrategies = strategies.filter(s => s.decision_mode === 'ai');
  const ruleStrategies = strategies.filter(s => s.decision_mode !== 'ai');

  const results = [];

  // AI 模式策略
  if (aiStrategies.length > 0) {
    // AI 调用冷却：每 N 秒最多触发一次（默认 300s），节省 LLM 费用
    const canCallAi = await checkAiCooldown(deviceId, config.ai.decisionCooldown);
    if (canCallAi) {
      try {
        const ai = await import('./ai/ai-decision-engine.js');
        const decision = await ai.generateDecision(deviceId);

        if (decision.should_irrigate && decision.duration_sec > 0) {
          for (const s of aiStrategies) {
            const running = await checkRunningIrrigation(deviceId);
            if (running) continue;

            if (s.cooldown_interval) {
              const inCooldown = await checkRecentIrrigation(deviceId, s.id, s.cooldown_interval);
              if (inCooldown) continue;
            }

            const actualDuration = Math.min(decision.duration_sec, s.irrigation_duration_max);

            const devRows = await query("SELECT device_name FROM devices WHERE id = ?", [deviceId]);
            const deviceName = devRows[0]?.device_name || '';

            await createIrrigationLog({
              device_id: deviceId,
              strategy_id: s.id,
              trigger_type: 'auto',
              device_sn: deviceSn,
              device_name: deviceName,
              strategy_name: s.strategy_name,
              remark: `AI 决策: ${decision.reasoning}`
            });

            await createAlert({
              device_id: deviceId,
              alert_type: 'irrigation_started',
              alert_level: 'info',
              message: `AI 自动灌溉已启动 (策略: ${s.strategy_name}, 置信度: ${(decision.confidence * 100).toFixed(0)}%)`,
              device_sn: deviceSn,
              device_name: deviceName
            });

            console.log(`[strategy] AI irrigation: device=${deviceSn} strategy=${s.strategy_name} duration=${actualDuration}s`);

            results.push({
              strategy_id: s.id,
              strategy_name: s.strategy_name,
              duration_sec: actualDuration,
            });
          }
        }
      } catch (e) {
        console.error('[strategy] AI decision error:', e.message);
      }
    }
  }

  // 规则模式策略
  for (const s of ruleStrategies) {
    // 仅在土壤湿度过低时触发灌溉；湿度过高由告警引擎处理
    if (payload.soil_moisture >= s.humidity_min) continue;

    const running = await checkRunningIrrigation(deviceId);
    if (running) continue;

    if (s.cooldown_interval) {
      const inCooldown = await checkRecentIrrigation(deviceId, s.id, s.cooldown_interval);
      if (inCooldown) continue;
    }

    const devRows = await query("SELECT device_name FROM devices WHERE id = ?", [deviceId]);
    const deviceName = devRows[0]?.device_name || '';

    await createIrrigationLog({
      device_id: deviceId,
      strategy_id: s.id,
      trigger_type: 'auto',
      device_sn: deviceSn,
      device_name: deviceName,
      strategy_name: s.strategy_name
    });

    await createAlert({
      device_id: deviceId,
      alert_type: 'irrigation_started',
      alert_level: 'info',
      message: "自动灌溉已启动 (策略: " + s.strategy_name + ")",
      device_sn: deviceSn,
      device_name: deviceName
    });

    console.log("[strategy] irrigation: device=" + deviceSn + " strategy=" + s.strategy_name);

    results.push({
      strategy_id: s.id,
      strategy_name: s.strategy_name,
      duration_sec: s.irrigation_duration_max,
    });
  }

  return results;
}
