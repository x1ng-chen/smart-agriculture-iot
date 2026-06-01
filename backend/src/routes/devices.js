import { Router } from 'express'
import { SerialPort } from 'serialport'
import { query } from '../db.js'
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

// 最新传感器数据
router.get('/:id/data/latest', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM sensor_data WHERE device_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    )
    res.json(success(rows[0] || null))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('查询失败'))
  }
})

// 历史传感器数据
router.get('/:id/data/history', async (req, res) => {
  try {
    const { start, end } = req.query
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 100
    const offset = (page - 1) * pageSize

    let where = 'WHERE device_id = ?'
    const params = [req.params.id]

    if (start) { where += ' AND created_at >= ?'; params.push(start) }
    if (end) { where += ' AND created_at <= ?'; params.push(end) }

    const countRows = await query(`SELECT count(*) as cnt FROM sensor_data ${where}`, params)
    const total = countRows[0].cnt

    const rows = await query(
      `SELECT * FROM sensor_data ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )
    res.json(successWithTotal(rows, total))
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

    const devices = await query('SELECT * FROM devices WHERE id = ?', [deviceId])
    if (devices.length === 0) return res.status(404).json(error('设备不存在'))

    const running = await query(
      "SELECT id FROM irrigation_logs WHERE device_id = ? AND status = 'running' LIMIT 1",
      [deviceId]
    )
    if (running.length > 0) return res.status(400).json(error('设备正在灌溉中'))

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

    // 写入灌溉记录
    let remark = duration_sec ? `手动灌溉 ${duration_sec}秒` : '手动灌溉'

    const result = await query(
      `INSERT INTO irrigation_logs (device_id, strategy_id, trigger_type, operator_id, start_time, status, remark)
       VALUES (?, ?, 'manual', ?, NOW(), 'running', ?)`,
      [deviceId, strategy_id || null, req.userId, remark]
    )
    const logId = result.insertId

    // 服务端自动停止（兜底：即使前端关闭也不怕）
    const autoDur = duration_sec || 0
    if (autoDur > 0) {
      setTimeout(async () => {
        try {
          // 检查是否还在 running
          const logs = await query(
            "SELECT id FROM irrigation_logs WHERE id = ? AND status = 'running' LIMIT 1",
            [logId]
          )
          if (logs.length === 0) return

          // 下发停止指令
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

          // 更新日志
          await query(
            "UPDATE irrigation_logs SET end_time = NOW(), duration_sec = ?, status = 'completed' WHERE id = ?",
            [autoDur, logId]
          )
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
    const running = await query(
      "SELECT id, start_time FROM irrigation_logs WHERE device_id = ? AND status = 'running' LIMIT 1",
      [deviceId]
    )
    if (running.length === 0) return res.status(400).json(error('设备未在灌溉'))

    const log = running[0]
    const durationSec = Math.round((Date.now() - new Date(log.start_time).getTime()) / 1000)
    await query(
      "UPDATE irrigation_logs SET end_time = NOW(), duration_sec = ?, status = 'completed' WHERE id = ?",
      [durationSec, log.id]
    )

    // 下发停止指令
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

    res.json(success({ duration_sec: durationSec }))
  } catch (e) {
    console.error(e)
    res.status(500).json(error('操作失败'))
  }
})

export default router
