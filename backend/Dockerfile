FROM node:20-alpine

WORKDIR /app

# 安装串口库依赖（serialport 需要）
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# 移除编译依赖
RUN apk del python3 make g++

COPY . .

EXPOSE 8080

CMD ["node", "src/app.js"]
