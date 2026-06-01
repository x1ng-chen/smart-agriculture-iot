import https from 'https'
import { AKSKSigner } from '@huaweicloud/huaweicloud-sdk-core/auth/AKSKSigner.js'
import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core/auth/BasicCredentials.js'
import config from './config.js'

let cachedToken = null
let tokenExpiry = 0

async function getIAMToken() {
  const now = Date.now()
  if (cachedToken && now < tokenExpiry) return cachedToken

  const { projectId, region } = config.huawei
  const iamHost = `iam.${region}.myhuaweicloud.com`
  const authBody = JSON.stringify({
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: 'x1ng',
            password: '2222987z',
            domain: { id: '656f0a6f44dd4c75ba3eb575957405e2' }
          }
        }
      },
      scope: { project: { id: projectId } }
    }
  })

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: iamHost, port: 443, path: '/v3/auth/tokens', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode === 201 && res.headers['x-subject-token']) {
          cachedToken = res.headers['x-subject-token']
          tokenExpiry = Date.now() + 20 * 60 * 1000
          console.log('[huawei-iot] IAM token obtained')
          resolve(cachedToken)
        } else {
          console.error('[huawei-iot] IAM error:', res.statusCode, data.substring(0, 200))
          reject(new Error(`IAM ${res.statusCode}`))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(authBody)
    req.end()
  })
}

export async function sendCommand(huaweiDeviceId, commandName, params = {}) {
  // 华为云 REST API 用 name, MQTT 下发用 command_name;
  // 两者不互通, 因此在 paras 里塞 _cmd 供固件识别
  params._cmd = commandName
  const { endpoint, projectId, ak, sk } = config.huawei
  if (!endpoint || !projectId || !ak || !sk) return false
  if (!huaweiDeviceId) return false

  let token
  try { token = await getIAMToken() } catch (e) { return false }
  if (!token) return false

  const path = `/v5/iot/${projectId}/devices/${huaweiDeviceId}/commands`
  const body = JSON.stringify({
    name: commandName,
    service_id: 'SmartAgriculture',
    paras: params
  })

  return new Promise((resolve) => {
    const opts = {
      hostname: endpoint, port: 443, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }
    }
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[huawei-iot] command sent: ${commandName} -> ${huaweiDeviceId}`)
          resolve(true)
        } else {
          console.error(`[huawei-iot] API error ${res.statusCode}:`, data.substring(0, 300))
          resolve(false)
        }
      })
    })
    req.on('error', (e) => { console.error('[huawei-iot] error:', e.message); resolve(false) })
    req.setTimeout(10000, () => { req.destroy(); resolve(false) })
    req.write(body)
    req.end()
  })
}

export function isConnected() {
  return config.huawei.enabled && !!config.huawei.endpoint && !!config.huawei.projectId && !!config.huawei.ak && !!config.huawei.sk
}

export function setBroker(_broker) {}
export function connect() {}
export function disconnect() {}
export function reportProperties() {}
export function reportDeviceStatus() {}
export function sendCommandResponse() {}
