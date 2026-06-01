# ==================================================================
# 公网穿透方案 — frp (Fast Reverse Proxy) 配置模板
# ==================================================================
# 适用于: 华为云 IoT 平台数据转发回调 → 本地后端服务
# 
# 原理:
#   [华为云 IoT]  →  [公网 frp server]  →  [本地 frp client]  →  [localhost:3000]
#
# 前置条件:
#   1. 一台有公网 IP 的云服务器 (如华为云 ECS/阿里云 ECS)
#   2. 在云服务器上部署 frps (服务端)
#   3. 在本机部署 frpc (客户端)
# ==================================================================

## --- frps (服务端, 部署在云服务器) ---
# frps.toml
# bindPort = 7000                       # frp 通讯端口
# vhostHTTPPort = 8080                  # HTTP 对外端口
# auth.token = "your-strong-token"      # 认证 token

## --- frpc (客户端, 部署在本机) ---
# frpc.toml
serverAddr = "YOUR_SERVER_IP"
serverPort = 7000
auth.token = "your-strong-token"

[[proxies]]
name = "huawei-webhook"
type = "http"
localIP = "127.0.0.1"
localPort = 3000
customDomains = ["iot.yourdomain.com"]

# 华为云数据转发规则 URL:
#   http://iot.yourdomain.com:8080/api/v1/huawei/data
#   (其中 8080 对应 frps 的 vhostHTTPPort)

# ==================================================================
# Windows 启动脚本 (可选注册为 Windows 服务)
# ==================================================================
