import { query } from '../db.js'
import { queryFluxRaw } from '../influxdb.js'

export const tools = [
  {
    type: 'function',
    function: {
      name: 'query_sensor_data',
      description: '查询指定设备最近N小时的传感器数据（土壤湿度、温度、湿度、光照）',
      parameters: {
        type: 'object',
        properties: {
          device_id: { type: 'number', description: '设备ID' },
          hours: { type: 'number', description: '最近多少小时，默认24' }
        },
        required: ['device_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_irrigation_logs',
      description: '查询指定设备最近N天的灌溉记录',
      parameters: {
        type: 'object',
        properties: {
          device_id: { type: 'number', description: '设备ID' },
          days: { type: 'number', description: '最近多少天，默认7' }
        },
        required: ['device_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_device_status',
      description: '查询所有设备或指定设备的在线状态和基本信息',
      parameters: {
        type: 'object',
        properties: {
          device_id: { type: 'number', description: '设备ID，不传则查全部' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_alerts',
      description: '查询告警记录',
      parameters: {
        type: 'object',
        properties: {
          resolved: { type: 'number', description: '0=未解决, 1=已解决，不传查全部' },
          limit: { type: 'number', description: '返回条数，默认10' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_irrigation_strategies',
      description: '查询指定地块的灌溉策略配置（阈值、时长、冷却时间等）',
      parameters: {
        type: 'object',
        properties: {
          plot_id: { type: 'number', description: '地块ID' }
        },
        required: ['plot_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_plot_info',
      description: '查询地块信息（名称、作物类型、面积）',
      parameters: {
        type: 'object',
        properties: {
          plot_id: { type: 'number', description: '地块ID' }
        },
        required: ['plot_id']
      }
    }
  }
]

export async function executeToolCall(name, args) {
  switch (name) {
    case 'query_sensor_data': {
      const hours = args.hours || 24
      const rows = await queryFluxRaw(
        `from(bucket: "sensor_data")
  |> range(start: -${hours}h)
  |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${args.device_id}")
  |> filter(fn: (r) => r._field == "soil_moisture" or r._field == "soil_temp" or r._field == "air_temp" or r._field == "air_humidity" or r._field == "light")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 50)`
      )
      return JSON.stringify(rows)
    }
    case 'query_irrigation_logs': {
      const days = args.days || 7
      const rows = await queryFluxRaw(
        `from(bucket: "sensor_data")
  |> range(start: -${days}d)
  |> filter(fn: (r) => r._measurement == "irrigation_logs" and r.device_id == "${args.device_id}")
  |> filter(fn: (r) => r._field == "trigger_type" or r._field == "duration_sec" or r._field == "water_used_l" or r._field == "status" or r._field == "remark")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 30)`
      )
      return JSON.stringify(rows)
    }
    case 'query_device_status': {
      if (args.device_id) {
        const rows = await query(
          'SELECT d.id, d.device_sn, d.device_name, d.online_status, d.last_online_at, d.latitude, d.longitude, p.plot_name, p.crop_type FROM devices d LEFT JOIN plots p ON d.plot_id = p.id WHERE d.id = ?',
          [args.device_id]
        )
        return JSON.stringify(rows)
      }
      const rows = await query(
        'SELECT d.id, d.device_sn, d.device_name, d.online_status, d.last_online_at, p.plot_name FROM devices d LEFT JOIN plots p ON d.plot_id = p.id WHERE d.status = 1'
      )
      return JSON.stringify(rows)
    }
    case 'query_alerts': {
      const limit = args.limit || 10
      let filterResolved = ''
      if (args.resolved !== undefined) {
        filterResolved = `\n  |> filter(fn: (r) => r._value == "${args.resolved}")`
      }
      const rows = await queryFluxRaw(
        `from(bucket: "sensor_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "alerts")
  |> filter(fn: (r) => r._field == "message" or r._field == "alert_level" or r._field == "resolved" or r._field == "device_name" or r._field == "device_sn")${filterResolved}
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: ${limit})`
      )
      return JSON.stringify(rows)
    }
    case 'query_irrigation_strategies': {
      const rows = await query(
        'SELECT strategy_name, humidity_min, humidity_max, temp_min, temp_max, irrigation_duration_max, cooldown_interval, water_flow_rate, enabled FROM irrigation_strategies WHERE plot_id = ?',
        [args.plot_id]
      )
      return JSON.stringify(rows)
    }
    case 'query_plot_info': {
      const rows = await query(
        'SELECT plot_name, crop_type, area_sqm, description FROM plots WHERE id = ?',
        [args.plot_id]
      )
      return JSON.stringify(rows)
    }
    default:
      return JSON.stringify({ error: `未知工具: ${name}` })
  }
}
