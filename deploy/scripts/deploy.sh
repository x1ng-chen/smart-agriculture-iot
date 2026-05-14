#!/bin/bash
# 智慧农业灌溉系统 - 一键部署脚本

set -e

echo "=== 智慧农业灌溉系统部署 ==="

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 未安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: 未安装Docker Compose"
    exit 1
fi

# 创建必要目录
mkdir -p deploy/mysql/data deploy/redis/data deploy/influxdb/data deploy/emqx/data logs

# 构建前端
echo "[1/3] 构建前端..."
cd frontend
npm install --production=false
npm run build
cd ..

# 构建后端镜像
echo "[2/3] 构建后端..."
docker-compose build backend

# 启动服务
echo "[3/3] 启动服务..."
docker-compose up -d

echo ""
echo "=== 部署完成 ==="
echo "前端: http://localhost"
echo "API:  http://localhost:8080"
echo "EMQX Dashboard: http://localhost:18083"
echo "InfluxDB: http://localhost:8086"
echo ""
echo "默认管理员账号: admin / admin123"
docker-compose ps
