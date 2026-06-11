import http from './http'

// 认证
export const login = (data) => http.post('/auth/login', data)
export const getMe = () => http.get('/auth/me')
export const changePassword = (data) => http.post('/auth/change-password', data)

// 仪表盘
export const getDashboardStats = () => http.get('/dashboard/stats')

// 设备管理
export const getDevices = (params) => http.get('/devices', { params })
export const getDevice = (id) => http.get(`/devices/${id}`)
export const createDevice = (data) => http.post('/devices', data)
export const updateDevice = (id, data) => http.put(`/devices/${id}`, data)
export const deleteDevice = (id) => http.delete(`/devices/${id}`)
export const getDeviceLatestData = (id) => http.get(`/devices/${id}/data/latest`)
export const getDeviceHistoryData = (id, params) => http.get(`/devices/${id}/data/history`, { params })

// 串口管理
export const getSerialPorts = () => http.get('/devices/serial-ports')
export const bindSerialPort = (id, comPort) => http.put(`/devices/${id}/serial-port`, { com_port: comPort })
export const unbindSerialPort = (id) => http.delete(`/devices/${id}/serial-port`)

// 灌溉控制
export const startIrrigation = (id, data) => http.post(`/devices/${id}/irrigate/start`, data)
export const stopIrrigation = (id) => http.post(`/devices/${id}/irrigate/stop`)

// 地块管理
export const getPlots = () => http.get('/plots')
export const getPlot = (id) => http.get(`/plots/${id}`)
export const createPlot = (data) => http.post('/plots', data)
export const updatePlot = (id, data) => http.put(`/plots/${id}`, data)
export const deletePlot = (id) => http.delete(`/plots/${id}`)

// 策略管理
export const getStrategies = (params) => http.get('/strategies', { params })
export const createStrategy = (data) => http.post('/strategies', data)
export const updateStrategy = (id, data) => http.put(`/strategies/${id}`, data)
export const deleteStrategy = (id) => http.delete(`/strategies/${id}`)

// 灌溉日志
export const getIrrigationLogs = (params) => http.get('/irrigation-logs', { params })

// 告警
export const getAlerts = (params) => http.get('/alerts', { params })
export const resolveAlert = (id) => http.put(`/alerts/${id}/resolve`)

// 定时任务
export const getSchedules = (params) => http.get('/schedules', { params })
export const createSchedule = (data) => http.post('/schedules', data)
export const updateSchedule = (id, data) => http.put(`/schedules/${id}`, data)
export const deleteSchedule = (id) => http.delete(`/schedules/${id}`)

// 数据导出
export const exportSensorData = (params) => http.get('/export/sensor-data', { params, responseType: 'blob' })
export const exportIrrigationLogs = (params) => http.get('/export/irrigation-logs', { params, responseType: 'blob' })

// AI 模块
export const aiChat = (data) => http.post('/ai/chat', data)
export const aiDecision = (deviceId) => http.post('/ai/decision', { device_id: deviceId })
export const getAiAnomalies = (params) => http.get('/ai/anomalies', { params })
