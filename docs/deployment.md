# 智慧农业灌溉系统 - 部署文档

## 环境要求
- Docker 20.10+
- Docker Compose 2.x
- 服务器: 2C4G 以上 (阿里云ECS / 腾讯云CVM)

## Docker Compose 部署

### 1. 修改配置
编辑 `backend/config/config.yaml` 和 `docker-compose.yml` 中的:
- MySQL密码
- InfluxDB Token
- JWT Secret
- EMQX Dashboard密码

### 2. 一键部署
```bash
bash deploy/scripts/deploy.sh
```

### 3. 手动部署
```bash
# 前端构建
cd frontend && npm install && npm run build && cd ..

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 4. 端口说明
| 端口 | 服务 | 说明 |
|------|------|------|
| 80/443 | Nginx | 前端 + API代理 |
| 8080 | Go Backend | API服务 |
| 1883 | EMQX | MQTT |
| 8083 | EMQX | MQTT WebSocket |
| 18083 | EMQX | Dashboard管理 |
| 3306 | MySQL | 数据库 |
| 6379 | Redis | 缓存 |
| 8086 | InfluxDB | 时序数据库 |

### 5. 数据持久化
所有数据存储在 `./deploy/*/data/` 目录下，Docker销毁后数据不丢失。
