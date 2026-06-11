import { Router } from 'express'
import { SerialPort } from 'serialport'
import { query } from '../db.js'
import {
  getLatestSensorData, getSensorDataHistory,
  createIrrigationLog, updateIrrigationLog,
  checkRunningIrrigation, getRunningIrrigationLog
} from '../influxdb.js'
import { success, successWithTotal, error } from '../utils/response.js'
import config from '../config.js'
import { sendCommand as huaweiSendCommand } from '../huawei-iot.js'

const router = Router()

function getSerialManager(req) {
  return req.app.get('serialManager')
}

// 设备列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const offset = (page - 1) * pageSize
    const plotId = req.query.plot_id

    let where = ''
    const params = []
    if (plotId) {
      where = 'WHERE d.plot_id = ?'
      params.push(plotId)
    }

    const countRows = await query(`SELECT count(*) as cnt FROM devices d ${where}`, params)
    const total = countRows[0].cnt

    const rows = await query(
      `SELECT d.*, p.plot_name FROM devices d
       LEFT JOIN plots p ON d.plot_id = p.id
       ${where}
       ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    res.json(successWithTotal(rows, total))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 可用串口列表
router.get('/serial-ports', async (req, res) => {
  try {
    const ports = await SerialPort.list()
    res.json(success(ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      pnpId: p.pnpId,
      friendlyName: p.friendlyName
    }))))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('获取串口列表失败'))
  }
})

// 单个设备
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT d.*, p.plot_name FROM devices d
       LEFT JOIN plots p ON d.plot_id = p.id WHERE d.id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json(error('设备不存在'))
    res.json(success(rows[0]))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 创建设备
router.post('/', async (req, res) => {
  try {
    const { device_sn, device_name, device_type, firmware_ver, plot_id, latitude, longitude } = req.body
    if (!device_sn || !device_name) {
      return res.status(400).json(error('序列号和名称不能为空'))
    }

    const existing = await query('SELECT id FROM devices WHERE device_sn = ?', [device_sn])
    if (existing.length > 0) return res.status(400).json(error('设备序列号已存在'))

    const result = await query(
      `INSERT INTO devices (device_sn, device_name, device_type, firmware_ver, plot_id, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [device_sn, device_name, device_type || 'bearpi_nano', firmware_ver, plot_id || null, latitude || null, longitude || null]
    )
    res.json(success({ id: result.insertId }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('创建失败'))
  }
})

// 更新设备
router.put('/:id', async (req, res) => {
  try {
    const { device_name, device_type, firmware_ver, plot_id, latitude, longitude, status } = req.body
    const fields = []
    const params = []

    if (device_name !== undefined) { fields.push('device_name = ?'); params.push(device_name) }
    if (device_type !== undefined) { fields.push('device_type = ?'); params.push(device_type) }
    if (firmware_ver !== undefined) { fields.push('firmware_ver = ?'); params.push(firmware_ver) }
    if (plot_id !== undefined) { fields.push('plot_id = ?'); params.push(plot_id) }
    if (latitude !== undefined) { fields.push('latitude = ?'); params.push(latitude) }
    if (longitude !== undefined) { fields.push('longitude = ?'); params.push(longitude) }
    if (status !== undefined) { fields.push('status = ?'); params.push(status) }

    if (fields.length === 0) return res.status(400).json(error('无更新内容'))

    params.push(req.params.id)
    await query(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('更新失败'))
  }
})

// 删除设备
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM devices WHERE id = ?', [req.params.id])
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('删除失败'))
  }
})

// 最新传感器数据 (InfluxDB + MySQL 回退)
router.get('/:id/data/latest', async (req, res) => {
  try {
    const row = await getLatestSensorData(req.params.id)
    if (row) return res.json(success(row))

    // InfluxDB 不可用时回退 MySQL 缓存
    const devices = await query('SELECT last_sensor_data FROM devices WHERE id = ?', [req.params.id])
    const cached = devices[0]?.last_sensor_data
    if (cached) {
      try {
        return res.json(success(JSON.parse(cached)))
      } catch (_) {}
    }
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 历史传感器数据 (MySQL 优先，InfluxDB 可选)
router.get('/:id/data/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 100
    const hours = parseInt(req.query.hours) || 24
    const offset = (page - 1) * pageSize

    const rows = await query(
      `SELECT soil_moisture, soil_temp, air_temp, air_humidity, light, created_at as _time
       FROM sensor_readings
       WHERE device_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [req.params.id, hours, pageSize, offset]
    )

    if (rows.length > 0) {
      const [{ cnt }] = await query(
        `SELECT COUNT(*) as cnt FROM sensor_readings
         WHERE device_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [req.params.id, hours]
      )
      return res.json(successWithTotal(rows, cnt))
    }

    // MySQL 无历史 → 回退 InfluxDB → 再回退设备缓存
    const result = await getSensorDataHistory(req.params.id, req.query.start, req.query.end, page, pageSize)
    if (result.rows.length > 0) {
      return res.json(successWithTotal(result.rows, result.total))
    }

    const devices = await query('SELECT last_sensor_data FROM devices WHERE id = ?', [req.params.id])
    const cached = devices[0]?.last_sensor_data
    if (cached) {
      try {
        const d = JSON.parse(cached)
        return res.json(successWithTotal([{
          _time: d.updated_at || new Date().toISOString(),
          soil_moisture: d.soil_moisture, soil_temp: d.soil_temp,
          air_temp: d.air_temp, air_humidity: d.air_humidity, light: d.light
        }], 1))
      } catch (_) {}
    }

    res.json(successWithTotal([], 0))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 绑定串口
router.put('/:id/serial-port', async (req, res) => {
  try {
    const deviceId = req.params.id
    const { com_port } = req.body
    if (!com_port) return res.status(400).json(error('com_port 不能为空'))

    const devices = await query('SELECT * FROM devices WHERE id = ?', [deviceId])
    if (devices.length === 0) return res.status(404).json(error('设备不存在'))

    const serialManager = getSerialManager(req)
    if (serialManager) {
      const result = await serialManager.openPort(com_port)
      if (!result.success) return res.status(400).json(error(result.message))
    }

    await query(
      'UPDATE devices SET com_port = ?, connection_type = ? WHERE id = ?',
      [com_port, 'uart', deviceId]
    )
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('绑定串口失败'))
  }
})

// 解绑串口
router.delete('/:id/serial-port', async (req, res) => {
  try {
    const deviceId = req.params.id
    const devices = await query('SELECT com_port FROM devices WHERE id = ?', [deviceId])
    if (devices.length === 0) return res.status(404).json(error('设备不存在'))

    if (devices[0].com_port) {
      const serialManager = getSerialManager(req)
      if (serialManager) {
        await serialManager.closePort(devices[0].com_port)
      }
      await query('UPDATE devices SET com_port = NULL WHERE id = ?', [deviceId])
    }
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('解绑串口失败'))
  }
})

// 绑定华为云设备ID
router.put('/:id/huawei-bind', async (req, res) => {
  try {
    const deviceId = req.params.id
    const { huawei_device_id } = req.body
    if (!huawei_device_id) return res.status(400).json(error('huawei_device_id 不能为空'))

    const devices = await query('SELECT id FROM devices WHERE id = ?', [deviceId])
    if (devices.length === 0) return res.status(404).json(error('设备不存在'))

    await query('UPDATE devices SET huawei_device_id = ? WHERE id = ?', [huawei_device_id, deviceId])
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('绑定失败'))
  }
})

// 解绑华为云设备ID
router.delete('/:id/huawei-bind', async (req, res) => {
  try {
    const deviceId = req.params.id
    await query('UPDATE devices SET huawei_device_id = NULL WHERE id = ?', [deviceId])
    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('解绑失败'))
  }
})

// 开始灌溉
router.post('/:id/irrigate/start', async (req, res) => {
  try {
    const deviceId = req.params.id
    const { strategy_id, duration_sec } = req.body

    // 输入校验
    if (duration_sec !== undefined && (typeof duration_sec !== 'number' || duration_sec < 0 || duration_sec > 86400)) {
      return res.status(400).json(error('灌溉时长必须为 0-86400 秒'))
    }

    const devices = await query('SELECT * FROM devices WHERE id = ?', [deviceId])
    if (devices.length === 0) return res.status(404).json(error('设备不存在'))

    const running = await checkRunningIrrigation(deviceId)
    if (running) return res.status(400).json(error('设备正在灌溉中'))

    const device = devices[0]
    const serialManager = getSerialManager(req)

    let cmdSent = false

    // 优先：通过华为云 REST API 下发
    if (config.huawei.enabled && device.huawei_device_id) {
      cmdSent = await huaweiSendCommand(device.huawei_device_id, 'StartIrrigation', { duration_sec: duration_sec || 0 })
    }

    // Fallback: UART 或内部 MQTT
    if (!cmdSent) {
      const broker = serialManager?.broker
      const hasUart = device.connection_type === 'uart' && !!device.com_port && !!serialManager

      if (hasUart) {
        const cmdResult = await serialManager.sendCommand(device.com_port, 'pump_on', duration_sec || 0)
        if (cmdResult.success) cmdSent = true
      }

      if (!cmdSent && broker) {
        serialManager.broker.publish({
          topic: `cmd/${device.device_sn}/pump`,
          payload: Buffer.from(JSON.stringify({ action: 'pump_on', duration_sec: duration_sec || 0 })),
          qos: 1, retain: false
        }, () => {})
        cmdSent = true
      }
    }

    if (!cmdSent) {
      return res.status(500).json(error('指令发送失败：无可用的通信通道'))
    }

    // 写入灌溉记录 (InfluxDB)
    let remark = duration_sec ? `手动灌溉 ${duration_sec}秒` : '手动灌溉'

    // 查相关名称
    const strategyName = strategy_id
      ? (await query('SELECT strategy_name FROM irrigation_strategies WHERE id = ?', [strategy_id]))[0]?.strategy_name || ''
      : ''
    const operatorName = (await query('SELECT real_name FROM users WHERE id = ?', [req.userId]))[0]?.real_name || ''

    const logId = await createIrrigationLog({
      device_id: deviceId,
      strategy_id: strategy_id || undefined,
      trigger_type: 'manual',
      device_sn: device.device_sn,
      device_name: device.device_name,
      strategy_name: strategyName,
      operator_name: operatorName,
      operator_id: req.userId,
      remark
    })

    // 服务端自动停止
    const autoDur = duration_sec || 0
    if (autoDur > 0) {
      // 持久化到 MySQL，防止服务器重启后定时器丢失
      const expectedStopAt = new Date(Date.now() + autoDur * 1000)
      await query(
        `INSERT INTO pending_auto_stops (device_id, device_sn, huawei_device_id, log_id, expected_stop_at, duration_sec)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [deviceId, device.device_sn, device.huawei_device_id || null, logId, expectedStopAt, autoDur]
      )

      setTimeout(async () => {
        try {
          const log = await getRunningIrrigationLog(deviceId)
          if (!log || log.log_id !== logId) return

          if (config.huawei.enabled && device.huawei_device_id) {
            huaweiSendCommand(device.huawei_device_id, 'StopIrrigation', {})
          } else {
            const sm = getSerialManager(req)
            const hasUart = device.connection_type === 'uart' && !!device.com_port && !!sm
            if (hasUart) {
              sm.sendCommand(device.com_port, 'pump_off')
            } else if (sm?.broker) {
              sm.broker.publish({
                topic: `cmd/${device.device_sn}/pump`,
                payload: Buffer.from(JSON.stringify({ action: 'pump_off' })),
                qos: 1, retain: false
              }, () => {})
            }
          }

          await updateIrrigationLog(logId, {
            status: 'completed',
            end_time: new Date().toISOString(),
            duration_sec: autoDur
          })
          // 标记持久化记录为已完成
          await query('UPDATE pending_auto_stops SET completed = 1 WHERE log_id = ?', [logId])
          console.log(`[irrigate] auto-stop: log=${logId} device=${device.device_sn} dur=${autoDur}s`)
        } catch (e) {
          console.error('[irrigate] auto-stop error:', e.message)
        }
      }, autoDur * 1000)
    }

    res.json(success(null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('操作失败'))
  }
})

// 停止灌溉
router.post('/:id/irrigate/stop', async (req, res) => {
  try {
    const deviceId = req.params.id
    const devices = await query('SELECT * FROM devices WHERE id = ?', [deviceId])

    // 尝试获取运行中的灌溉记录（InfluxDB 不可用时为 null，仍允许强制停止）
    const log = await getRunningIrrigationLog(deviceId)
    let durationSec = 0

    if (log) {
      durationSec = Math.round((Date.now() - new Date(log._time).getTime()) / 1000)
      await updateIrrigationLog(log.log_id, {
        status: 'completed',
        end_time: new Date().toISOString(),
        duration_sec: durationSec
      })
    }

    // 下发停止指令（无论 InfluxDB 状态，都执行）
    const device = devices[0]
    const serialManager = getSerialManager(req)

    if (config.huawei.enabled && device.huawei_device_id) {
      huaweiSendCommand(device.huawei_device_id, 'StopIrrigation', {})
    } else {
      const broker = serialManager?.broker
      const hasUart = device.connection_type === 'uart' && !!device.com_port && !!serialManager
      if (hasUart) {
        await serialManager.sendCommand(device.com_port, 'pump_off')
      } else if (broker) {
        serialManager.broker.publish({
          topic: `cmd/${device.device_sn}/pump`,
          payload: Buffer.from(JSON.stringify({ action: 'pump_off' })),
          qos: 1, retain: false
        }, () => {})
      }
    }

    res.json(success({ duration_sec: durationSec, forced: !log }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('操作失败'))
  }
})

export default router
