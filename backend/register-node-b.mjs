/* register-node-b.mjs — 使用 AK/SK 在华为云 IoTDA 注册 Node B 设备 (v5 SDK)
 * 用法: node register-node-b.mjs
 * 前置: 需要设置以下环境变量 (从 backend/.env 加载):
 *   HUAWEI_IOT_AK, HUAWEI_IOT_SK
 *   HUAWEI_PROJECT_ID, HUAWEI_PRODUCT_ID
 */
import { IoTDAClient } from '@huaweicloud/huaweicloud-sdk-iotda/v5/IoTDAClient.js'
import { IoTDARegion } from '@huaweicloud/huaweicloud-sdk-iotda/v5/IoTDARegion.js'
import { AddDeviceRequest } from '@huaweicloud/huaweicloud-sdk-iotda/v5/model/AddDeviceRequest.js'
import { AddDevice } from '@huaweicloud/huaweicloud-sdk-iotda/v5/model/AddDevice.js'
import { AuthInfo } from '@huaweicloud/huaweicloud-sdk-iotda/v5/model/AuthInfo.js'
import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core/auth/BasicCredentials.js'
import { config } from 'dotenv'
config({ path: new URL('./.env', import.meta.url).pathname })

const AK = process.env.HUAWEI_IOT_AK
const SK = process.env.HUAWEI_IOT_SK
const PROJECT_ID = process.env.HUAWEI_PROJECT_ID
const REGION = 'cn-north-4'
const PRODUCT_ID = process.env.HUAWEI_PRODUCT_ID

// 启动前检查必需的环境变量
const required = { HUAWEI_IOT_AK: AK, HUAWEI_IOT_SK: SK, HUAWEI_PROJECT_ID: PROJECT_ID, HUAWEI_PRODUCT_ID: PRODUCT_ID }
for (const [key, value] of Object.entries(required)) {
  if (!value) {
    console.error(`❌ 缺少环境变量: ${key}`)
    console.error('   请在 backend/.env 中配置后重试')
    process.exit(1)
  }
}

// 生成 32 位随机密钥
function generateSecret() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

async function main() {
  const secret = generateSecret()

  console.log('=== 华为云 IoTDA 注册 Node B (AK/SK v5) ===')
  console.log(`Region:     ${REGION}`)
  console.log(`Project:    ${PROJECT_ID}`)
  console.log(`Product:    ${PRODUCT_ID}`)
  console.log(`Device ID:  ${PRODUCT_ID}_smart-003`)
  console.log(`Secret:     ${secret}`)
  console.log('')

  const credentials = new BasicCredentials()
    .withAk(AK)
    .withSk(SK)
    .withProjectId(PROJECT_ID)

  const client = IoTDAClient.newBuilder()
    .withCredential(credentials)
    .withRegion(IoTDARegion.valueOf(REGION))
    .build()

  const authInfo = new AuthInfo()
  authInfo.withAuthType('SECRET')
  authInfo.withSecret(secret)

  const body = new AddDevice('BPN-20240003', PRODUCT_ID)
  body.withDeviceId(`${PRODUCT_ID}_smart-003`)
  body.withDeviceName('门口安防节点')
  body.withDescription('SmartAg security node B E53_IS1 PIR buzzer')
  body.withAuthInfo(authInfo)

  const request = new AddDeviceRequest()
  request.withBody(body)

  try {
    const response = await client.addDevice(request)
    const device = response
    console.log('✅ 设备注册成功!')
    console.log(`   Device ID:   ${body.deviceId}`)
    console.log(`   Device Name: ${body.deviceName}`)
    console.log(`   Secret:      ${secret}`)
    console.log('')
    console.log('config.h 中的密钥已就绪, 可直接编译烧录 Node B')
  } catch (err) {
    const msg = err.message || ''
    const data = err.data || ''
    const httpCode = err.httpStatusCode || err.statusCode || ''
    console.error(`❌ 注册失败 (${httpCode}): ${msg}`)
    if (data) {
      try { console.error('Response:', typeof data === 'string' ? data : JSON.stringify(data)) }
      catch { console.error('Response:', String(data)) }
    }
    console.error('')
    console.error('可能原因:')
    console.error('  1. AK/SK 权限不足 — IAM 用户需有 IoTDA Device Management 权限')
    console.error('  2. 设备 ID 已存在 — 去控制台检查或删除后重试')
    console.error('  3. 终端节点或区域配置有误')
    process.exit(1)
  }
}

main()
