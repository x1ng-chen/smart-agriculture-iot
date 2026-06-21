/* register-node-b.js — 在华为云 IoTDA 注册 Node B 设备 (smart-003)
 * 用法: node register-node-b.js
 * 前置: 需要设置以下环境变量 (从 backend/.env 加载):
 *   HUAWEI_IAM_USERNAME, HUAWEI_IAM_PASSWORD
 *   HUAWEI_PROJECT_ID, HUAWEI_DOMAIN_ID, HUAWEI_PRODUCT_ID
 */
import https from 'https'
import { config } from 'dotenv'
config({ path: new URL('./.env', import.meta.url).pathname })

const CONFIG = {
  iamHost: 'iam.cn-north-4.myhuaweicloud.com',
  iamUser: process.env.HUAWEI_IAM_USERNAME,
  iamPassword: process.env.HUAWEI_IAM_PASSWORD,
  domainId: process.env.HUAWEI_DOMAIN_ID,
  projectId: process.env.HUAWEI_PROJECT_ID,
  endpoint: 'iotda.cn-north-4.myhuaweicloud.com',
  region: 'cn-north-4',
  productId: process.env.HUAWEI_PRODUCT_ID,
}

// 启动前检查必需的环境变量
const required = ['HUAWEI_IAM_USERNAME', 'HUAWEI_IAM_PASSWORD', 'HUAWEI_DOMAIN_ID', 'HUAWEI_PROJECT_ID', 'HUAWEI_PRODUCT_ID']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ 缺少环境变量: ${key}`)
    console.error('   请在 backend/.env 中配置后重试')
    process.exit(1)
  }
}

// ── Step 1: 获取 IAM Token ──
function getIAMToken() {
  const body = JSON.stringify({
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: CONFIG.iamUser,
            password: CONFIG.iamPassword,
            domain: { id: CONFIG.domainId }
          }
        }
      },
      scope: { project: { id: CONFIG.projectId } }
    }
  })

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: CONFIG.iamHost, port: 443, path: '/v3/auth/tokens', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('[IAM] Token obtained')
          resolve(res.headers['x-subject-token'])
        } else {
          reject(new Error(`IAM ${res.statusCode}: ${data.substring(0, 300)}`))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

// ── Step 2: 创建设备 ──
function createDevice(token, deviceId, deviceName, deviceSecret) {
  const path = `/v5/iot/${CONFIG.projectId}/devices`
  const body = JSON.stringify({
    device_id: deviceId,
    product_id: CONFIG.productId,
    device_name: deviceName,
    description: 'SmartAg security node B - E53_IS1 PIR and buzzer alarm',
    node_id: 'BPN-20240003',
    secret: deviceSecret,
    device_sdk_platform: 'MQTT',
    auth_type: 'SECRET'
  })

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: CONFIG.endpoint, port: 443, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token
      }
    }
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        console.log(`[IoTDA] Response: ${res.statusCode}`)
        console.log(`[IoTDA] Body: ${data.substring(0, 500)}`)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(data)
          resolve(result)
        } else {
          reject(new Error(`IoTDA ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

// ── 生成随机设备密钥 ──
function generateSecret() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

// ── Main ──
async function main() {
  const deviceId = `${CONFIG.productId}_smart-003`
  const deviceSecret = generateSecret()

  console.log('=== 注册 Node B 安防设备 ===')
  console.log(`Device ID: ${deviceId}`)
  console.log(`Secret:    ${deviceSecret}`)
  console.log(`Product:   ${CONFIG.productId}`)
  console.log('')

  try {
    const token = await getIAMToken()
    const result = await createDevice(token, deviceId, 'BPN-20240003-安防节点', deviceSecret)
    console.log('')
    console.log('✅ 设备注册成功!')
    console.log(`   Device ID:  ${result.device_id}`)
    console.log(`   Device Name: ${result.device_name}`)
    console.log(`   Secret:      ${deviceSecret}`)
    console.log('')
    console.log('⚠ 请将上面的 Secret 更新到 config.h 的 HUAWEI_IOT_DEVICE_SECRET')
  } catch (err) {
    console.error('❌ 注册失败:', err.message)
    process.exit(1)
  }
}

main()
