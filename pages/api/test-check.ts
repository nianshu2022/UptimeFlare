import { workerConfig } from '@/uptime.config'
// @ts-ignore - Next.js runtime
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 简化的监控检查函数（用于测试）
async function checkMonitor(monitor: any): Promise<{ ping: number; up: boolean; err: string }> {
  const startTime = Date.now()
  try {
    const response = await fetch(monitor.target, {
      method: monitor.method || 'GET',
      headers: {
        'user-agent': 'UptimeFlare/1.0 (+https://github.com/lyc8503/UptimeFlare)',
        ...monitor.headers,
      },
      signal: AbortSignal.timeout(monitor.timeout || 10000),
    })

    const ping = Date.now() - startTime
    const isUp = response.ok && response.status >= 200 && response.status < 300

    return {
      ping,
      up: isUp,
      err: isUp ? '' : `HTTP ${response.status}`,
    }
  } catch (e: any) {
    return {
      ping: Date.now() - startTime,
      up: false,
      err: e.message || String(e),
    }
  }
}

// 格式化通知消息
function formatNotification(monitor: any, isUp: boolean, timeIncidentStart: number, timeNow: number, reason: string, timeZone: string): string {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone,
  })

  const downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60)
  const timeNowFormatted = dateFormatter.format(new Date(timeNow * 1000))
  const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000))

  if (isUp) {
    return `✅ ${monitor.name} 已恢复！\n服务在故障 ${downtimeDuration} 分钟后恢复正常。`
  } else if (timeNow == timeIncidentStart) {
    return `🔴 ${monitor.name} 当前不可用\n服务在 ${timeNowFormatted} 无法访问。\n问题: ${reason || '未指定'}`
  } else {
    return `🔴 ${monitor.name} 仍然不可用\n服务自 ${timeIncidentStartFormatted} 起不可用 (${downtimeDuration} 分钟)。\n问题: ${reason || '未指定'}`
  }
}

// 钉钉加签计算
async function calculateDingtalkSign(secret: string, timestamp: number): Promise<string> {
  const stringToSign = `${timestamp}\n${secret}`
  
  // 在 Edge Runtime 中使用 Web Crypto API
  const keyData = new TextEncoder().encode(secret)
  const messageData = new TextEncoder().encode(stringToSign)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const signatureArray = Array.from(new Uint8Array(signature))
  const base64Signature = btoa(String.fromCharCode(...signatureArray))
  
  return encodeURIComponent(base64Signature)
}

// 发送钉钉通知
async function sendDingtalkNotification(message: string, webhook: any): Promise<boolean> {
  try {
    let url = webhook.url
    const timestamp = Date.now()
    
    // 如果是钉钉且配置了密钥，计算签名
    if (webhook.dingtalkSecret && url.includes('oapi.dingtalk.com')) {
      const sign = await calculateDingtalkSign(webhook.dingtalkSecret, timestamp)
      const urlObj = new URL(url)
      urlObj.searchParams.set('timestamp', timestamp.toString())
      urlObj.searchParams.set('sign', sign)
      url = urlObj.toString()
    }

    // 替换消息中的 $MSG
    let payload = JSON.parse(JSON.stringify(webhook.payload))
    const replaceMsg = (obj: any) => {
      for (const key in obj) {
        if (obj[key] === '$MSG') {
          obj[key] = message
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          replaceMsg(obj[key])
        }
      }
    }
    replaceMsg(payload)

    const response = await fetch(url, {
      method: webhook.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webhook.headers,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        if (data.errcode === 0) {
          return true
        }
      } catch (e) {
        // 不是 JSON
      }
    }
    
    return false
  } catch (e) {
    console.error('Error sending Dingtalk notification:', e)
    return false
  }
}

export default async function handler(req: NextRequest): Promise<Response> {
  // @ts-ignore - Edge Runtime has process.env
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE?: any
  }

  if (!UPTIMEFLARE_STATE) {
    return new Response(
      JSON.stringify({ error: 'UPTIMEFLARE_STATE not available' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // 读取当前状态
    const stateStr = await UPTIMEFLARE_STATE.get('state')
    let state = stateStr
      ? (JSON.parse(stateStr) as any)
      : {
          version: 1,
          lastUpdate: 0,
          overallUp: 0,
          overallDown: 0,
          incident: {},
          latency: {},
          domainExpiry: {},
        }

    if (!state.domainExpiry) {
      state.domainExpiry = {}
    }

    state.overallDown = 0
    state.overallUp = 0

    let statusChanged = false
    const currentTimeSecond = Math.round(Date.now() / 1000)
    const results: any[] = []

    // 检查每个监控项
    for (const monitor of workerConfig.monitors) {
      console.log(`Checking ${monitor.name}...`)
      const monitorResult: any = {
        name: monitor.name,
        id: monitor.id,
        status: null,
        notificationSent: false,
        error: null,
      }

      try {
        // 获取监控状态
        const status = await checkMonitor(monitor)
        monitorResult.status = status

        // 更新计数器
        status.up ? state.overallUp++ : state.overallDown++

        // 初始化 incident 数据
        if (!state.incident[monitor.id]) {
          state.incident[monitor.id] = [
            {
              start: [currentTimeSecond],
              end: currentTimeSecond,
              error: ['dummy'],
            },
          ]
        }

        let lastIncident = state.incident[monitor.id].slice(-1)[0]
        let monitorStatusChanged = false

        if (status.up) {
          // 服务正常
          if (lastIncident.end === undefined) {
            lastIncident.end = currentTimeSecond
            monitorStatusChanged = true
          }
        } else {
          // 服务异常
          if (lastIncident.end !== undefined) {
            // 从正常变为故障，创建新的 incident
            state.incident[monitor.id].push({
              start: [currentTimeSecond],
              end: undefined,
              error: [status.err],
            })
            monitorStatusChanged = true
          } else if (lastIncident.error.slice(-1)[0] !== status.err) {
            // 故障持续，但错误信息变化
            lastIncident.start.push(currentTimeSecond)
            lastIncident.error.push(status.err)
            monitorStatusChanged = true
          }
        }

        const currentIncident = state.incident[monitor.id].slice(-1)[0]

        // 检查是否应该发送通知
        // 对于测试端点，如果是故障状态且宽限期为0，即使状态没变化也发送一次通知
        if (!status.up) {
          if (!monitorStatusChanged) {
            monitorResult.debug = `状态未变化（之前已经是故障状态）`
          }
          
          // 计算故障持续时间
          const incidentDuration = currentTimeSecond - currentIncident.start[0]
          const gracePeriodSeconds = (workerConfig.notification?.gracePeriod ?? 0) * 60

          // 宽限期为 0 时立即发送，或者状态变化时立即发送
          // 对于测试端点，如果宽限期为 0，即使状态没变化也发送一次（用于测试）
          const shouldNotify = gracePeriodSeconds === 0 || 
                               (monitorStatusChanged && incidentDuration >= gracePeriodSeconds)

          monitorResult.debug = `monitorStatusChanged=${monitorStatusChanged}, gracePeriod=${gracePeriodSeconds}s, incidentDuration=${incidentDuration}s, shouldNotify=${shouldNotify}, hasWebhook=${!!workerConfig.notification?.webhook}`
          
          if (shouldNotify) {
            if (workerConfig.notification?.webhook) {
            try {
              const notification = formatNotification(
                monitor,
                false,
                currentIncident.start[0],
                currentTimeSecond,
                status.err,
                workerConfig.notification?.timeZone ?? 'Asia/Shanghai'
              )

              const sent = await sendDingtalkNotification(notification, workerConfig.notification.webhook)
              monitorResult.notificationSent = sent
              monitorResult.notificationMessage = notification
              if (sent) {
                monitorResult.message = `✅ 通知已发送: ${monitor.name}`
              } else {
                monitorResult.error = '钉钉通知发送失败，请检查钉钉配置'
              }
            } catch (e: any) {
              monitorResult.error = `发送通知时出错: ${e.message}`
              console.error(`Error sending notification for ${monitor.name}:`, e)
            }
            } else {
              monitorResult.error = 'Webhook 未配置'
            }
          } else {
            monitorResult.error = `宽限期未满足 (${incidentDuration}s >= ${gracePeriodSeconds}s) 且状态未变化`
          }
        }

        statusChanged ||= monitorStatusChanged
      } catch (e: any) {
        monitorResult.error = e.message || String(e)
        console.error(`Error checking ${monitor.name}:`, e)
      }

      results.push(monitorResult)
    }

    // 保存状态
    if (statusChanged) {
      state.lastUpdate = currentTimeSecond
      await UPTIMEFLARE_STATE.put('state', JSON.stringify(state))
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '检查完成',
        timestamp: new Date().toISOString(),
        results: results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: e.message || String(e),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

