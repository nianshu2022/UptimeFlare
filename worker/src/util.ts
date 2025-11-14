import { WebhookConfig } from '../../types/config'

async function getWorkerLocation() {
  const res = await fetch('https://cloudflare.com/cdn-cgi/trace')
  const text = await res.text()

  const colo = /^colo=(.*)$/m.exec(text)?.[1]
  return colo
}

const fetchTimeout = (
  url: string,
  ms: number,
  { signal, ...options }: RequestInit<RequestInitCfProperties> | undefined = {}
): Promise<Response> => {
  const controller = new AbortController()
  const promise = fetch(url, { signal: controller.signal, ...options })
  if (signal) signal.addEventListener('abort', () => controller.abort())
  const timeout = setTimeout(() => controller.abort(), ms)
  return promise.finally(() => clearTimeout(timeout))
}

function withTimeout<T>(millis: number, promise: Promise<T>): Promise<T> {
  const timeout = new Promise<T>((resolve, reject) =>
    setTimeout(() => reject(new Error(`Promise timed out after ${millis}ms`)), millis)
  )

  return Promise.race([promise, timeout])
}

function formatStatusChangeNotification(
  monitor: any,
  isUp: boolean,
  timeIncidentStart: number,
  timeNow: number,
  reason: string,
  timeZone: string
) {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone,
  })

  let downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60)
  const timeNowFormatted = dateFormatter.format(new Date(timeNow * 1000))
  const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000))

  if (isUp) {
    return `✅ ${monitor.name} is up! \nThe service is up again after being down for ${downtimeDuration} minutes.`
  } else if (timeNow == timeIncidentStart) {
    return `🔴 ${
      monitor.name
    } is currently down. \nService is unavailable at ${timeNowFormatted}. \nIssue: ${
      reason || 'unspecified'
    }`
  } else {
    return `🔴 ${
      monitor.name
    } is still down. \nService is unavailable since ${timeIncidentStartFormatted} (${downtimeDuration} minutes). \nIssue: ${
      reason || 'unspecified'
    }`
  }
}

function templateWebhookPlayload(payload: any, message: string) {
  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (payload[key] === '$MSG') {
        payload[key] = message
      } else if (typeof payload[key] === 'object' && payload[key] !== null) {
        templateWebhookPlayload(payload[key], message)
      }
    }
  }
}

/**
 * 钉钉加签计算
 * 算法：使用 HmacSHA256 对 timestamp + '\n' + secret 进行加密，然后 Base64 编码
 */
async function calculateDingtalkSign(secret: string, timestamp: number): Promise<string> {
  const stringToSign = `${timestamp}\n${secret}`
  
  // 将密钥和消息转换为 ArrayBuffer
  const keyData = new TextEncoder().encode(secret)
  const messageData = new TextEncoder().encode(stringToSign)
  
  // 使用 Web Crypto API 计算 HMAC-SHA256
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  
  // Base64 编码，并进行 URL 安全处理
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return encodeURIComponent(base64Signature)
}

async function webhookNotify(webhook: WebhookConfig, message: string) {
  if (Array.isArray(webhook)) {
    for (const w of webhook) {
      webhookNotify(w, message)
    }
    return
  }

  console.log(
    'Sending webhook notification: ' + JSON.stringify(message) + ' to webhook ' + webhook.url
  )
  try {
    let url = webhook.url
    let method = webhook.method
    let headers = new Headers(webhook.headers as any)
    let payloadTemplated: { [key: string]: string | number } = JSON.parse(
      JSON.stringify(webhook.payload)
    )
    templateWebhookPlayload(payloadTemplated, message)
    
    // 如果是钉钉加签，计算签名并添加到URL
    if (webhook.dingtalkSecret && webhook.url.includes('oapi.dingtalk.com')) {
      const timestamp = Date.now()
      const sign = await calculateDingtalkSign(webhook.dingtalkSecret, timestamp)
      const urlObj = new URL(url)
      urlObj.searchParams.set('timestamp', timestamp.toString())
      urlObj.searchParams.set('sign', sign)
      url = urlObj.toString()
      console.log(`Dingtalk signature calculated: timestamp=${timestamp}, sign=${sign}`)
    }
    
    let body = undefined

    switch (webhook.payloadType) {
      case 'param':
        method = method ?? 'GET'
        const urlTmp = new URL(url)
        for (const [k, v] of Object.entries(payloadTemplated)) {
          urlTmp.searchParams.append(k, v.toString())
        }
        url = urlTmp.toString()
        break
      case 'json':
        method = method ?? 'POST'
        if (headers.get('content-type') === null) {
          headers.set('content-type', 'application/json')
        }
        body = JSON.stringify(payloadTemplated)
        break
      case 'x-www-form-urlencoded':
        method = method ?? 'POST'
        if (headers.get('content-type') === null) {
          headers.set('content-type', 'application/x-www-form-urlencoded')
        }
        body = new URLSearchParams(payloadTemplated as any).toString()
        break
      default:
        throw 'Unrecognized payload type: ' + webhook.payloadType
    }

    console.log(
      `Webhook finalized parameters: ${method} ${url}, headers ${JSON.stringify(
        Object.fromEntries(headers.entries())
      )}, body ${JSON.stringify(body)}`
    )
    const resp = await fetchTimeout(url, webhook.timeout ?? 5000, { method, headers, body })

    if (!resp.ok) {
      console.log(
        'Error calling webhook server, code: ' + resp.status + ', response: ' + (await resp.text())
      )
    } else {
      console.log('Webhook notification sent successfully, code: ' + resp.status)
    }
  } catch (e) {
    console.log('Error calling webhook server: ' + e)
  }
}

export {
  getWorkerLocation,
  fetchTimeout,
  withTimeout,
  webhookNotify,
  formatStatusChangeNotification,
}
