import { MonitorTarget } from '../../types/config'
import { withTimeout, fetchTimeout } from './util'

async function httpResponseBasicCheck(
  monitor: MonitorTarget,
  code: number,
  bodyReader: () => Promise<string>
): Promise<string | null> {
  if (monitor.expectedCodes) {
    if (!monitor.expectedCodes.includes(code)) {
      return `Expected codes: ${JSON.stringify(monitor.expectedCodes)}, Got: ${code}`
    }
  } else {
    if (code < 200 || code > 299) {
      return `Expected codes: 2xx, Got: ${code}`
    }
  }

  if (monitor.responseKeyword || monitor.responseForbiddenKeyword) {
    // Only read response body if we have a keyword to check
    const responseBody = await bodyReader()

    // MUST contain responseKeyword
    if (monitor.responseKeyword && !responseBody.includes(monitor.responseKeyword)) {
      console.log(
        `${monitor.name} expected keyword ${
          monitor.responseKeyword
        }, not found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`
      )
      return "HTTP 响应中不包含配置的关键词"
    }

    // MUST NOT contain responseForbiddenKeyword
    if (
      monitor.responseForbiddenKeyword &&
      responseBody.includes(monitor.responseForbiddenKeyword)
    ) {
      console.log(
        `${monitor.name} forbidden keyword ${
          monitor.responseForbiddenKeyword
        }, found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`
      )
      return 'HTTP 响应中包含配置的禁止关键词'
    }
  }

  return null
}

export async function getStatusWithGlobalPing(
  monitor: MonitorTarget
): Promise<{ location: string; status: { ping: number; up: boolean; err: string } }> {
  // TODO: should throw when there's error with globalping API
  try {
    if (monitor.checkProxy === undefined) {
      throw "empty check proxy for globalping, shouldn't call this method"
    }

    const gpUrl = new URL(monitor.checkProxy)
    if (gpUrl.protocol !== 'globalping:') {
      throw 'incorrect check proxy protocol for globalping, got: ' + gpUrl.protocol
    }

    const token = gpUrl.hostname
    let globalPingRequest = {}

    if (monitor.method === 'TCP_PING') {
      const targetUrl = new URL('https://' + monitor.target) // dummy https:// to parse hostname & port
      globalPingRequest = {
        type: 'ping',
        target: targetUrl.hostname,
        locations:
          gpUrl.searchParams.get('magic') !== null
            ? [
                {
                  magic: gpUrl.searchParams.get('magic'),
                },
              ]
            : undefined,
        measurementOptions: {
          port: targetUrl.port,
          packets: 1,
          protocol: 'tcp', // TODO: icmp?
          ipVersion: Number(gpUrl.searchParams.get('ipVersion') || 4),
        },
      }
    } else {
      const targetUrl = new URL(monitor.target)
      if (monitor.body !== undefined) {
        throw 'custom body not supported'
      }
      if (monitor.method && !['GET', 'HEAD', 'OPTIONS'].includes(monitor.method.toUpperCase())) {
        throw 'only GET, HEAD, OPTIONS methods are supported'
      }
      globalPingRequest = {
        type: 'http',
        target: targetUrl.hostname,
        locations:
          gpUrl.searchParams.get('magic') !== null
            ? [
                {
                  magic: gpUrl.searchParams.get('magic'),
                },
              ]
            : undefined,
        measurementOptions: {
          request: {
            method: monitor.method,
            path: targetUrl.pathname,
            query: targetUrl.search === '' ? undefined : targetUrl.search,
            headers: Object.fromEntries(
              Object.entries(monitor.headers ?? {}).map(([key, value]) => [key, String(value)])
            ), // TODO: host header?
          },
          port:
            targetUrl.port === ''
              ? targetUrl.protocol === 'http:'
                ? 80
                : 443
              : Number(targetUrl.port),
          protocol: targetUrl.protocol.replace(':', ''),
          ipVersion: Number(gpUrl.searchParams.get('ipVersion') || 4),
        },
      }
    }

    const startTime = Date.now()
    console.log(`Requesting the Global Ping API, payload: ${JSON.stringify(globalPingRequest)}`)
    const measurement = await fetchTimeout('https://api.globalping.io/v1/measurements', 5000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(globalPingRequest),
    })
    const measurementResponse = (await measurement.json()) as any

    if (measurement.status !== 202) {
      throw measurementResponse.error.message
    }

    const measurementId = measurementResponse.id
    console.log(
      `Measurement created successfully, id: ${measurementId}, time elapsed: ${
        Date.now() - startTime
      }ms`
    )

    const pollStart = Date.now()
    let measurementResult: any
    while (true) {
      if (Date.now() - pollStart > (monitor.timeout ?? 10000) + 2000) {
        // 2s extra buffer
        throw 'api polling timeout'
      }

      measurementResult = (await (
        await fetchTimeout(`https://api.globalping.io/v1/measurements/${measurementId}`, 5000)
      ).json()) as any
      if (measurementResult.status !== 'in-progress') {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log(
      `Measurement ${measurementId} finished with response: ${JSON.stringify(
        measurementResult
      )}, time elapsed: ${Date.now() - pollStart}ms`
    )

    if (
      measurementResult.status !== 'finished' ||
      measurementResult.results[0].result.status !== 'finished'
    ) {
      console.log(
        `measurement failed with status: ${measurementResult.status}, result status: ${measurementResult.results[0].result.status}`
      )
      // Truncate raw output to avoid huge error messages
      throw `status [${measurementResult.status}|${
        measurementResult.results[0].result.status
      }]: ${measurementResult.results?.[0].result?.rawOutput?.slice(0, 64)}`
    }

    const country = measurementResult.results[0].probe.country
    const city = measurementResult.results[0].probe.city

    if (monitor.method === 'TCP_PING') {
      const time = Math.round(measurementResult.results[0].result.stats.avg)
      return {
        location: country + '/' + city,
        status: {
          ping: time,
          up: true,
          err: '',
        },
      }
    } else {
      const time = measurementResult.results[0].result.timings.total
      const code = measurementResult.results[0].result.statusCode
      const body = measurementResult.results[0].result.rawBody

      let err = await httpResponseBasicCheck(monitor, code, () => body)
      if (err !== null) {
        console.log(`${monitor.name} didn't pass response check: ${err}`)
      }

      if (
        monitor.target.toLowerCase().startsWith('https') &&
        !measurementResult.results[0].result.tls.authorized
      ) {
        console.log(
          `${monitor.name} TLS certificate not trusted: ${measurementResult.results[0].result.tls.error}`
        )
        err = 'TLS 证书不受信任: ' + measurementResult.results[0].result.tls.error
      }

      return {
        location: country + '/' + city,
        status: {
          ping: time,
          up: err === null,
          err: err ?? '',
        },
      }
    }
  } catch (e: any) {
    console.log(`Globalping ${monitor.name} errored with ${e}`)
    return {
      location: '错误',
      status: {
        ping: e.toString().toLowerCase().includes('timeout') ? monitor.timeout ?? 10000 : 0,
        up: false,
        err: 'Globalping 错误: ' + e.toString(),
      },
    }
  }
}

export async function getStatus(
  monitor: MonitorTarget
): Promise<{ ping: number; up: boolean; err: string }> {
  let status = {
    ping: 0,
    up: false,
    err: 'Unknown',
  }

  const startTime = Date.now()

  if (monitor.method === 'TCP_PING') {
    // TCP port endpoint monitor
    try {
      const connect = await import(/* webpackIgnore: true */ 'cloudflare:sockets').then(
        (sockets) => sockets.connect
      )
      // This is not a real https connection, but we need to add a dummy `https://` to parse the hostname & port
      const parsed = new URL('https://' + monitor.target)
      const socket = connect({ hostname: parsed.hostname, port: Number(parsed.port) })

      // Now we have an `opened` promise!
      await withTimeout(monitor.timeout || 10000, socket.opened)
      await socket.close()

      console.log(`${monitor.name} connected to ${monitor.target}`)

      status.ping = Date.now() - startTime
      status.up = true
      status.err = ''
    } catch (e: Error | any) {
      console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
      if (e.message.includes('timed out')) {
        status.ping = monitor.timeout || 10000
      }
      status.up = false
      status.err = e.name + ': ' + e.message
    }
  } else {
    // HTTP endpoint monitor
    try {
      let headers = new Headers(monitor.headers as any)
      if (!headers.has('user-agent')) {
        headers.set('user-agent', 'UptimeFlare/1.0 (+https://github.com/lyc8503/UptimeFlare)')
      }

      const response = await fetchTimeout(monitor.target, monitor.timeout || 10000, {
        method: monitor.method,
        headers: headers,
        body: monitor.body,
        cf: {
          cacheTtlByStatus: {
            '100-599': -1, // Don't cache any status code, from https://developers.cloudflare.com/workers/runtime-apis/request/#requestinitcfproperties
          },
        },
      })

      console.log(`${monitor.name} responded with ${response.status}`)
      status.ping = Date.now() - startTime

      const err = await httpResponseBasicCheck(
        monitor,
        response.status,
        response.text.bind(response)
      )
      if (err !== null) {
        console.log(`${monitor.name} didn't pass response check: ${err}`)
      }
      status.up = err === null
      status.err = err ?? ''
    } catch (e: any) {
      console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
      if (e.name === 'AbortError') {
        status.ping = monitor.timeout || 10000
        status.up = false
        status.err = `超时，耗时 ${status.ping}ms`
      } else {
        status.up = false
        // 翻译常见的错误类型名称
        let errorName = e.name
        const errorNameMap: { [key: string]: string } = {
          'TypeError': '类型错误',
          'NetworkError': '网络错误',
          'DNS': 'DNS 错误',
          'ECONNREFUSED': '连接被拒绝',
          'ENOTFOUND': '域名未找到',
          'ETIMEDOUT': '连接超时',
          'Connection': '连接错误',
          'FetchError': '请求错误',
          'SyntaxError': '语法错误',
        }
        if (errorNameMap[errorName]) {
          errorName = errorNameMap[errorName]
        }
        status.err = `${errorName}: ${e.message}`
      }
    }
  }

  return status
}

/**
 * 从URL中提取域名
 */
function extractDomain(target: string): string | null {
  try {
    // 如果target是URL，提取域名
    let url: URL
    if (target.startsWith('http://') || target.startsWith('https://')) {
      url = new URL(target)
    } else {
      // 尝试添加https://前缀
      url = new URL('https://' + target)
    }
    return url.hostname.replace(/^www\./, '') // 移除www前缀
  } catch (e) {
    console.log(`Failed to parse domain from target: ${target}, error: ${e}`)
    return null
  }
}

/**
 * 查询域名到期信息
 * 使用免费的WHOIS API服务
 */
export async function getDomainExpiry(
  monitor: MonitorTarget
): Promise<{ expiryDate: number; daysRemaining: number; error?: string } | null> {
  const domain = extractDomain(monitor.target)
  if (!domain) {
    return { expiryDate: 0, daysRemaining: -1, error: '无法解析域名' }
  }

  try {
    console.log(`Checking domain expiry for: ${domain}`)

    // 使用多个免费的WHOIS API服务，按优先级尝试
    const apiEndpoints: Array<{ url: string; parser: (data: any) => Date | null }> = []
    
    // 优先使用配置的API密钥
    if (monitor.domainExpiryWhoisApiKey) {
      apiEndpoints.push({
        url: `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${monitor.domainExpiryWhoisApiKey}&domainName=${domain}&outputFormat=JSON`,
        parser: (data: any) => {
          if (data.WhoisRecord?.expiresDate) {
            return new Date(data.WhoisRecord.expiresDate)
          }
          return null
        },
      })
    }

    // 备用：使用whoisjson.com的免费API（有一定限制）
    apiEndpoints.push({
      url: `https://api.whoisjson.com/v1/whois?domain=${domain}`,
      parser: (data: any) => {
        if (data.expires_date) {
          return new Date(data.expires_date)
        }
        return null
      },
    })

    let expiryDate: Date | null = null
    let error: string | null = null

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying WHOIS API: ${endpoint.url}`)
        const response = await fetchTimeout(endpoint.url, monitor.timeout || 10000, {
          headers: {
            'User-Agent': 'UptimeFlare/1.0 (+https://github.com/lyc8503/UptimeFlare)',
          },
        })

        if (!response.ok) {
          console.log(`WHOIS API returned status ${response.status}`)
          if (response.status === 429) {
            error = 'API请求频率限制，请稍后重试'
          }
          continue
        }

        const data = await response.json()

        // 使用解析器函数解析响应
        expiryDate = endpoint.parser(data)

        if (expiryDate && !isNaN(expiryDate.getTime())) {
          console.log(`Found expiry date: ${expiryDate.toISOString()}`)
          break
        } else {
          console.log(`Failed to parse expiry date from API response: ${JSON.stringify(data).slice(0, 200)}`)
        }
      } catch (e: any) {
        console.log(`Error with WHOIS API ${endpoint.url}: ${e.message}`)
        error = e.message
        continue
      }
    }

    if (!expiryDate || isNaN(expiryDate.getTime())) {
      // 如果所有API都失败，返回错误信息
      const errorMessage = error
        ? `无法获取域名到期信息: ${error}`
        : '无法获取域名到期信息，建议配置WHOIS API密钥以获得更可靠的结果（可选：whoisxmlapi.com）'
      return {
        expiryDate: 0,
        daysRemaining: -1,
        error: errorMessage,
      }
    }

    const now = new Date()
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      expiryDate: Math.floor(expiryDate.getTime() / 1000), // 转换为秒级时间戳
      daysRemaining,
      error: error || undefined,
    }
  } catch (e: any) {
    console.log(`Error checking domain expiry for ${domain}: ${e.message}`)
    return {
      expiryDate: 0,
      daysRemaining: -1,
      error: `查询域名到期信息时出错: ${e.message}`,
    }
  }
}