const BASE_URL = 'http://47.96.100.108:8081/api/v1'

const SENSOR_LABELS = {
  soil_moisture: '土壤湿度',
  soil_temp: '土壤温度',
  air_temp: '空气温度',
  air_humidity: '空气湿度',
  light: '光照强度'
}

const SENSOR_UNITS = {
  soil_moisture: '%',
  soil_temp: '°C',
  air_temp: '°C',
  air_humidity: '%',
  light: ' lux'
}

module.exports = { BASE_URL, SENSOR_LABELS, SENSOR_UNITS }
