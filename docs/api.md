# API 接口文档

基础路径: `/api/v1`

## 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/login | 用户登录 |
| POST | /auth/refresh | 刷新Token |

## 设备管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /devices | 设备列表 |
| POST | /devices | 创建设备 |
| GET | /devices/:id | 设备详情 |
| PUT | /devices/:id | 更新设备 |
| DELETE | /devices/:id | 删除设备 |
| GET | /devices/:id/data/latest | 最新传感器数据 |
| GET | /devices/:id/data/history | 历史时序数据 |

## 灌溉控制
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /devices/:id/irrigate/start | 手动开启灌溉 |
| POST | /devices/:id/irrigate/stop | 手动停止灌溉 |

## 策略管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /strategies | 策略列表 |
| POST | /strategies | 创建策略 |
| PUT | /strategies/:id | 更新策略 |
| DELETE | /strategies/:id | 删除策略 |

## 灌溉日志
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /irrigation-logs | 灌溉日志列表 |

## 告警
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /alerts | 告警列表 |
| PUT | /alerts/:id/resolve | 确认处理告警 |

## 定时任务
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /schedules | 定时任务列表 |
| POST | /schedules | 创建定时任务 |
| PUT | /schedules/:id | 更新定时任务 |
| DELETE | /schedules/:id | 删除定时任务 |

## 数据导出
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /export/sensor-data | 导出传感器数据(CSV) |
| GET | /export/irrigation-logs | 导出灌溉日志(Excel) |
