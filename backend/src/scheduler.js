import cron from 'node-cron'
import { query } from './db.js'
import { sendCommand as huaweiSendCommand } from './huawei-iot.js'
import config from './config.js'

// 活跃的 cron 任务 { taskId: CronTask }
const activeTasks = new Map()
// 系统级 cron 任务（离线检测、自动停止恢复），防止重复注册
let systemCronsRegistered = false

// 动态导入避免循环依赖
let broadcastAlert = null
async function getBroadcastAlert() {
  if (!broadcastAlert) {
    const mod = await import('./ws-server.js')
    broadcastAlert = mod.broadcastAlert
  }
  return broadcastAlert
}

/**
 * 从数据库加载所有启用的定时任务并启动
 */
export async function initScheduler() {
  try {
    const rows = await query(
      'SELECT st.id, st.cron_expr, st.task_name, st.action, st.duration_sec, st.enabled, d.device_sn, d.device_name, d.huawei_device_id, d.connection_type, d.com_port FROM scheduled_tasks st LEFT JOIN devices d ON st.device_id = d.id WHERE st.enabled = 1'
    )
    for (const task of rows) {
      startTask(task)
    }
    console.log(`[scheduler] 已加载 ${rows.length} 个定时任务`)
  } catch (e) {
    console.error('[scheduler] 初始化失败:', e.message)
  }

  // 系统级 cron 只注册一次
  if (!systemCronsRegistered) {
    systemCronsRegistered = true

    // 每 2 分钟检测设备离线状态
    cron.schedule('*/2 * * * *', async () => {
      try {
        await checkOfflineDevices()
      } catch (e) {
        console.error('[scheduler] 离线检测失败:', e.message)
      }
    })

    // 每 30 秒检查过期的自动停止任务（防漏网之鱼）
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await recoverPendingStops()
      } catch (e) {
        console.error('[scheduler] 自动停止恢复检查失败:', e.message)
      }
    })

    // 启动时立即恢复一次
    await recoverPendingStops()
  }
}

/**
 * 检测离线设备：超过 5 分钟未上报数据的设备标记为离线并生成告警
 */
async function checkOfflineDevices() {
  const offlineDevices = await query(
    `SELECT id, device_sn, device_name, last_online_at FROM devices
     WHERE online_status = 1 AND last_online_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
  )

  if (offlineDevices.length === 0) return

  const broadcast = await getBroadcastAlert()

  for (const device of offlineDevices) {
    await query('UPDATE devices SET online_status = 0 WHERE id = ?', [device.id])

    const existing = await query(
      `SELECT id FROM alerts WHERE device_id = ? AND alert_type = 'offline' AND resolved = 0`,
      [device.id]
    )

    if (existing.length === 0) {
      await query(
        `INSERT INTO alerts (device_id, alert_type, alert_level, message, resolved)
         VALUES (?, 'offline', 'warning', ?, 0)`,
        [device.id, `设备 ${device.device_name}(${device.device_sn}) 已离线，最后在线: ${device.last_online_at}`]
      )

      broadcast({
        type: 'offline',
        level: 'warning',
        device_id: device.id,
        device_sn: device.device_sn,
        device_name: device.device_name,
        message: `设备 ${device.device_name} 已离线`
      })
    }

    console.log(`[scheduler] 设备离线: ${device.device_name}(${device.device_sn})`)
  }
}

/**
 * 启动单个定时任务
 */
function startTask(task) {
  stopTask(task.id)

  if (!cron.validate(task.cron_expr)) {
    console.error(`[scheduler] 任务 #${task.id} cron 表达式无效: ${task.cron_expr}`)
    return
  }

  // 每次触发时重新从 DB 读取最新任务数据，避免闭包捕获旧值
  const taskId = task.id
  const cronJob = cron.schedule(task.cron_expr, async () => {
    try {
      const fresh = await query(
        'SELECT st.*, d.device_sn, d.device_name, d.huawei_device_id, d.connection_type, d.com_port FROM scheduled_tasks st LEFT JOIN devices d ON st.device_id = d.id WHERE st.id = ? AND st.enabled = 1',
        [taskId]
      )
      if (fresh.length === 0) {
        stopTask(taskId)
        return
      }
      console.log(`[scheduler] 执行任务 #${taskId}: ${fresh[0].task_name} (${fresh[0].action})`)
      await executeAction(fresh[0])
    } catch (e) {
      console.error(`[scheduler] 任务 #${taskId} 执行失败:`, e.message)
    }
  }, { scheduled: true })

  activeTasks.set(taskId, cronJob)
}

/**
 * 停止单个定时任务
 */
function stopTask(taskId) {
  const id = typeof taskId === 'string' ? parseInt(taskId) : taskId
  const existing = activeTasks.get(id)
  if (existing) {
    existing.stop()
    activeTasks.delete(id)
  }
}

/**
 * 执行灌溉动作
 */
async function executeAction(task) {
  const { action, device_id, duration_sec, device_sn, huawei_device_id } = task

  if (action === 'irrigate') {
    const dur = duration_sec || 300

    // 优先华为云
    if (config.huawei.enabled && huawei_device_id) {
      const ok = await huaweiSendCommand(huawei_device_id, 'StartIrrigation', { duration_sec: dur })
      if (ok) {
        console.log(`[scheduler] 华为云下发灌溉: device=${device_sn} dur=${dur}s`)
        // 持久化自动停止（不依赖 setTimeout）
        if (dur > 0) {
          const expectedStopAt = new Date(Date.now() + dur * 1000)
          await query(
            `INSERT INTO pending_auto_stops (device_id, device_sn, huawei_device_id, log_id, expected_stop_at, duration_sec)
             VALUES (?, ?, NULL, NULL, ?, ?)`,
            [device_id, device_sn, expectedStopAt, dur]
          )
        }
        return
      }
    }

    // Fallback: 通过 serialManager
    const serialManager = globalThis.__serialManager
    if (serialManager) {
      const result = await serialManager.sendCommandBySn(device_sn, 'pump_on', dur)
      console.log(`[scheduler] 串口下发灌溉: device=${device_sn} result=${result.success}`)
    } else {
      console.warn(`[scheduler] 无可用通信通道: device=${device_sn}`)
    }
  } else if (action === 'stop') {
    if (config.huawei.enabled && huawei_device_id) {
      await huaweiSendCommand(huawei_device_id, 'StopIrrigation', {})
    }
    const serialManager = globalThis.__serialManager
    if (serialManager) {
      await serialManager.sendCommandBySn(device_sn, 'pump_off')
    }
    console.log(`[scheduler] 停止灌溉: device=${device_sn}`)
  }
}

/**
 * 重新加载任务（供 CRUD 接口调用）
 */
export async function reloadTask(taskId) {
  const id = typeof taskId === 'string' ? parseInt(taskId) : taskId
  try {
    const rows = await query(
      'SELECT st.*, d.device_sn, d.device_name, d.huawei_device_id, d.connection_type, d.com_port FROM scheduled_tasks st LEFT JOIN devices d ON st.device_id = d.id WHERE st.id = ?',
      [id]
    )
    if (rows.length === 0 || !rows[0].enabled) {
      stopTask(id)
      return
    }
    startTask(rows[0])
  } catch (e) {
    console.error(`[scheduler] 重载任务 #${id} 失败:`, e.message)
  }
}

/**
 * 恢复过期的自动停止任务（服务器重启后或 setTimeout 漏掉的）
 */
async function recoverPendingStops() {
  const overdue = await query(
    `SELECT * FROM pending_auto_stops WHERE completed = 0 AND expected_stop_at <= NOW()`
  )

  if (overdue.length === 0) return

  for (const stop of overdue) {
    console.log(`[scheduler] 恢复过期自动停止: device=${stop.device_sn} log=${stop.log_id}`)

    try {
      if (config.huawei.enabled && stop.huawei_device_id) {
        await huaweiSendCommand(stop.huawei_device_id, 'StopIrrigation', {})
      } else {
        const serialManager = globalThis.__serialManager
        if (serialManager) {
          await serialManager.sendCommandBySn(stop.device_sn, 'pump_off')
        }
      }

      await query('UPDATE pending_auto_stops SET completed = 1 WHERE id = ?', [stop.id])
      console.log(`[scheduler] ✓ 已恢复停止: device=${stop.device_sn}`)
    } catch (e) {
      console.error(`[scheduler] 恢复停止失败: device=${stop.device_sn}`, e.message)
    }
  }
}

export { stopTask }
