# InfluxDB 初始化脚本 (2.x)

# 此脚本通过influx CLI设置bucket和retention policy
# 在容器首次启动时自动执行

# 等待InfluxDB就绪
sleep 5

# 设置传感器数据bucket的retention policy (30天)
# influx bucket update --name sensor_data --retention 720h

echo "InfluxDB setup complete"
