import { DurableObject } from 'cloudflare:workers'
import { MonitorState, MonitorTarget } from '../../types/config'
import { maintenances, workerConfig } from '../../uptime.config'
import { getStatus, getStatusWithGlobalPing, getDomainExpiry } from './monitor'
import { formatStatusChangeNotification, getWorkerLocation, webhookNotify } from './util'

export interface Env {
  UPTIMEFLARE_STATE: KVNamespace
  REMOTE_CHECKER_DO: DurableObjectNamespace<RemoteChecker>
}

const Worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    
    // 添加测试端点：GET /test-check
    if (url.pathname === '/test-check' && request.method === 'GET') {
      console.log('Manual test check triggered via HTTP')
      
      // 创建一个假的 ScheduledEvent 来触发检查
      const fakeEvent = {
        type: 'scheduled' as const,
        scheduledTime: Date.now(),
        cron: '* * * * *',
      } as ScheduledEvent
      
      try {
        await Worker.scheduled(fakeEvent, env, ctx)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: '检查已触发，请查看日志或等待通知',
            timestamp: new Date().toISOString()
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } catch (e: any) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: e.message || String(e),
            timestamp: new Date().toISOString()
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }
    }
    
    // 默认返回 404
    return new Response('Not Found', { status: 404 })
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const workerLocation = (await getWorkerLocation()) || 'ERROR'
    console.log(`Running scheduled event on ${workerLocation}...`)

    // Auxiliary function to format notification and send it via webhook
    let formatAndNotify = async (
      monitor: MonitorTarget,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // Skip notification if monitor is in the skip list
      const skipList = workerConfig.notification?.skipNotificationIds
      if (skipList && skipList.includes(monitor.id)) {
        console.log(
          `Skipping notification for ${monitor.name} (${monitor.id} in skipNotificationIds)`
        )
        return
      }

      // Skip notification if monitor is in maintenance
      const maintenanceList = maintenances
        .filter(
          (m) =>
            new Date(timeNow * 1000) >= new Date(m.start) &&
            (!m.end || new Date(timeNow * 1000) <= new Date(m.end))
        )
        .map((e) => e.monitors || [])
        .flat()

      if (maintenanceList.includes(monitor.id)) {
        console.log(`Skipping notification for ${monitor.name} (in maintenance)`)
        return
      }

      if (workerConfig.notification?.webhook) {
        const notification = formatStatusChangeNotification(
          monitor,
          isUp,
          timeIncidentStart,
          timeNow,
          reason,
          workerConfig.notification?.timeZone ?? 'Etc/GMT'
        )
        await webhookNotify(workerConfig.notification.webhook, notification)
      } else {
        console.log(`Webhook not set, skipping notification for ${monitor.name}`)
      }
    }

    // Read state, set init state if it doesn't exist
    let state =
      ((await env.UPTIMEFLARE_STATE.get('state', {
        type: 'json',
      })) as unknown as MonitorState) ||
      ({
        version: 1,
        lastUpdate: 0,
        overallUp: 0,
        overallDown: 0,
        incident: {},
        latency: {},
        domainExpiry: {},
      } as MonitorState)
    state.overallDown = 0
    state.overallUp = 0
    if (!state.domainExpiry) {
      state.domainExpiry = {}
    }
    if (!state.pendingIncidents) {
      state.pendingIncidents = {}
    }

    let statusChanged = false
    const currentTimeSecond = Math.round(Date.now() / 1000)

    // Check each monitor
    // TODO: concurrent status check
    for (const monitor of workerConfig.monitors) {
      // 判断是否需要执行检测
      const pendingIncident = state.pendingIncidents?.[monitor.id]
      const lastNormalCheckTime = state.latency[monitor.id]?.recent?.slice(-1)?.[0]?.time || 0
      const isNormalCheck = !pendingIncident && (currentTimeSecond - lastNormalCheckTime >= 300 || lastNormalCheckTime === 0) // 5分钟间隔或首次检测
      const isConfirmationCheck = pendingIncident && !pendingIncident.notified && (currentTimeSecond - pendingIncident.lastCheckTime >= 60) // 故障确认检测（每1分钟）
      
      // 如果既不是正常检测也不是故障确认检测，跳过
      if (!isNormalCheck && !isConfirmationCheck) {
        console.log(`[${monitor.name}] Skipping check: normal check interval not met and no pending incident confirmation needed`)
        // 继续更新统计（使用上次状态）
        const lastIncident = state.incident[monitor.id]?.slice(-1)?.[0]
        if (lastIncident && lastIncident.end === undefined) {
          state.overallDown++
        } else {
          state.overallUp++
        }
        continue
      }
      
      console.log(`[${workerLocation}] Checking ${monitor.name}... (${isNormalCheck ? 'normal check' : 'confirmation check'})`)

      let monitorStatusChanged = false
      let checkLocation = workerLocation
      let status

      if (monitor.checkProxy) {
        // Initiate a check using proxy (Geo-specific monitoring)
        try {
          console.log('Calling check proxy: ' + monitor.checkProxy)
          let resp
          if (monitor.checkProxy.startsWith('worker://')) {
            const doLoc = monitor.checkProxy.replace('worker://', '')
            const doId = env.REMOTE_CHECKER_DO.idFromName(doLoc)
            const doStub = env.REMOTE_CHECKER_DO.get(doId, {
              locationHint: doLoc as DurableObjectLocationHint,
            })
            resp = await doStub.getLocationAndStatus(monitor)
            try {
              // Kill the DO instance after use, to avoid extra resource usage
              await doStub.kill()
            } catch (err) {
              // An error here is expected, ignore it
            }
          } else if (monitor.checkProxy.startsWith('globalping://')) {
            resp = await getStatusWithGlobalPing(monitor)
          } else {
            resp = await (
              await fetch(monitor.checkProxy, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(monitor),
              })
            ).json<{ location: string; status: { ping: number; up: boolean; err: string } }>()
          }
          checkLocation = resp.location
          status = resp.status
        } catch (err) {
          console.log('Error calling proxy: ' + err)
          if (monitor.checkProxyFallback) {
            console.log('Falling back to local check...')
            status = await getStatus(monitor)
          } else {
            status = { ping: 0, up: false, err: '检查代理未知错误' }
          }
        }
      } else {
        // Initiate a check from the current location
        status = await getStatus(monitor)
      }

      // const status = await getStatus(monitor)
      // currentTimeSecond 已在循环外部定义

      // Update counters
      status.up ? state.overallUp++ : state.overallDown++

      // Update incidents
      // Create a dummy incident to store the start time of the monitoring and simplify logic
      state.incident[monitor.id] = state.incident[monitor.id] || [
        {
          start: [currentTimeSecond],
          end: currentTimeSecond,
          error: ['dummy'],
        },
      ]
      // Then lastIncident here must not be undefined
      let lastIncident = state.incident[monitor.id].slice(-1)[0]

      if (status.up) {
        // Current status is up
        // 清除待确认故障信息（如果服务已恢复）
        if (state.pendingIncidents[monitor.id]) {
          console.log(`[${monitor.name}] Service recovered, clearing pending incident`)
          delete state.pendingIncidents[monitor.id]
        }
        
        // close existing incident if any
        if (lastIncident.end === undefined) {
          lastIncident.end = currentTimeSecond
          monitorStatusChanged = true
          try {
            // 状态变化（从故障恢复），立即发送通知
            console.log(`Service ${monitor.name} recovered, sending notification immediately`)
            await formatAndNotify(monitor, true, lastIncident.start[0], currentTimeSecond, '服务已恢复正常')

            console.log('Calling config onStatusChange callback...')
            await workerConfig.callbacks?.onStatusChange?.(
              env,
              monitor,
              true,
              lastIncident.start[0],
              currentTimeSecond,
              '服务已恢复正常'
            )
          } catch (e) {
            console.log('Error calling callback: ')
            console.log(e)
          }
        }
      } else {
        // Current status is down
        // 故障确认机制：连续3次检测到故障才发送通知
        
        if (isNormalCheck) {
          // 正常检测（每5分钟）首次检测到故障，开始故障确认流程
          console.log(`[${monitor.name}] First detection of failure at ${new Date(currentTimeSecond * 1000).toISOString()}, starting confirmation process`)
          state.pendingIncidents[monitor.id] = {
            firstDetectionTime: currentTimeSecond,
            confirmationChecks: 0,
            lastCheckTime: currentTimeSecond,
            lastError: status.err,
            notified: false,
          }
          
          // 更新 incident 记录
          if (lastIncident.end !== undefined) {
            state.incident[monitor.id].push({
              start: [currentTimeSecond],
              end: undefined,
              error: [status.err],
            })
            monitorStatusChanged = true
          }
        } else if (pendingIncident && !pendingIncident.notified) {
          // 故障确认检测（每1分钟）
          const timeSinceLastCheck = currentTimeSecond - pendingIncident.lastCheckTime
          
          if (timeSinceLastCheck >= 60) {
            // 距离上次检查已超过1分钟，进行确认检测
            pendingIncident.confirmationChecks++
            pendingIncident.lastCheckTime = currentTimeSecond
            pendingIncident.lastError = status.err
            
            console.log(`[${monitor.name}] Confirmation check #${pendingIncident.confirmationChecks} at ${new Date(currentTimeSecond * 1000).toISOString()}, still down: ${status.err}`)
            
            if (pendingIncident.confirmationChecks >= 2) {
              // 已连续3次检测到故障（首次检测 + 2次确认），发送通知
              console.log(`[${monitor.name}] Confirmed failure after ${pendingIncident.confirmationChecks} confirmation checks, sending notification`)
              
              // 更新 incident 记录
              if (lastIncident.end !== undefined) {
                state.incident[monitor.id].push({
                  start: [pendingIncident.firstDetectionTime],
                  end: undefined,
                  error: [pendingIncident.lastError],
                })
                monitorStatusChanged = true
              } else {
                // 如果已经有 incident，更新错误信息
                if (lastIncident.error.slice(-1)[0] !== pendingIncident.lastError) {
                  lastIncident.error.push(pendingIncident.lastError)
                  monitorStatusChanged = true
                }
              }
              
              const currentIncident = state.incident[monitor.id].slice(-1)[0]
              
              try {
                // 发送通知
                console.log(`Sending notification for ${monitor.name} (DOWN) after confirmation`)
                await formatAndNotify(
                  monitor,
                  false,
                  pendingIncident.firstDetectionTime,
                  currentTimeSecond,
                  pendingIncident.lastError
                )
                
                // 标记已通知
                pendingIncident.notified = true
                
                if (monitorStatusChanged) {
                  console.log('Calling config onStatusChange callback...')
                  await workerConfig.callbacks?.onStatusChange?.(
                    env,
                    monitor,
                    false,
                    pendingIncident.firstDetectionTime,
                    currentTimeSecond,
                    pendingIncident.lastError
                  )
                }
              } catch (e) {
                console.log('Error sending notification: ')
                console.log(e)
              }
            }
          } else {
            // 距离上次检查不足1分钟，跳过（等待下次 cron 触发）
            console.log(`[${monitor.name}] Skipping confirmation check, only ${timeSinceLastCheck}s since last check (need 60s)`)
          }
        } else if (pendingIncident && pendingIncident.notified) {
          // 已发送通知，继续更新 incident 记录
          if (lastIncident.end === undefined) {
            if (lastIncident.error.slice(-1)[0] !== status.err) {
              lastIncident.start.push(currentTimeSecond)
              lastIncident.error.push(status.err)
              monitorStatusChanged = true
            }
          }
        }

        const currentIncident = state.incident[monitor.id].slice(-1)[0]
        try {
          console.log('Calling config onIncident callback...')
          await workerConfig.callbacks?.onIncident?.(
            env,
            monitor,
            currentIncident.start[0],
            currentTimeSecond,
            status.err
          )
        } catch (e) {
          console.log('Error calling callback: ')
          console.log(e)
        }
      }

      // append to latency data
      let latencyLists = state.latency[monitor.id] || {
        recent: [],
      }
      latencyLists.all = []

      const record = {
        loc: checkLocation,
        ping: status.ping,
        time: currentTimeSecond,
      }
      latencyLists.recent.push(record)

      // discard old data
      while (latencyLists.recent[0]?.time < currentTimeSecond - 12 * 60 * 60) {
        latencyLists.recent.shift()
      }
      state.latency[monitor.id] = latencyLists

      // discard old incidents
      let incidentList = state.incident[monitor.id]
      while (
        incidentList.length > 0 &&
        incidentList[0].end &&
        incidentList[0].end < currentTimeSecond - 90 * 24 * 60 * 60
      ) {
        incidentList.shift()
      }

      if (
        incidentList.length == 0 ||
        (incidentList[0].start[0] > currentTimeSecond - 90 * 24 * 60 * 60 &&
          incidentList[0].error[0] != 'dummy')
      ) {
        // put the dummy incident back
        incidentList.unshift({
          start: [currentTimeSecond - 90 * 24 * 60 * 60],
          end: currentTimeSecond - 90 * 24 * 60 * 60,
          error: ['dummy'],
        })
      }
      state.incident[monitor.id] = incidentList

      statusChanged ||= monitorStatusChanged

      // 检查域名到期（如果启用了域名到期监控）
      if (monitor.domainExpiryCheck) {
        try {
          const warningDays = monitor.domainExpiryWarningDays || 30
          const shouldCheckExpiry =
            !state.domainExpiry[monitor.id] ||
            currentTimeSecond - state.domainExpiry[monitor.id].lastChecked >= 24 * 60 * 60 // 每24小时检查一次

          if (shouldCheckExpiry) {
            console.log(`Checking domain expiry for ${monitor.name}...`)
            const expiryInfo = await getDomainExpiry(monitor)

            if (expiryInfo && expiryInfo.expiryDate > 0) {
              const expiryEntry = state.domainExpiry[monitor.id] || {
                expiryDate: expiryInfo.expiryDate,
                daysRemaining: expiryInfo.daysRemaining,
                warningSent: false,
                lastChecked: currentTimeSecond,
              }

              expiryEntry.expiryDate = expiryInfo.expiryDate
              expiryEntry.daysRemaining = expiryInfo.daysRemaining
              expiryEntry.lastChecked = currentTimeSecond
              // 清除之前的错误信息
              delete expiryEntry.error

              // 如果域名即将到期且未发送过警告，发送通知
              if (
                expiryEntry.daysRemaining > 0 &&
                expiryEntry.daysRemaining <= warningDays &&
                !expiryEntry.warningSent
              ) {
                const expiryDateFormatted = new Date(expiryEntry.expiryDate * 1000).toLocaleDateString(
                  'zh-CN'
                )
                const warningReason = `域名即将在 ${expiryEntry.daysRemaining} 天后到期（${expiryDateFormatted}）`
                console.log(`Domain expiry warning for ${monitor.name}: ${warningReason}`)

                // 发送域名到期警告通知
                await formatAndNotify(monitor, false, currentTimeSecond, currentTimeSecond, warningReason)

                // 标记警告已发送
                expiryEntry.warningSent = true
                statusChanged = true
              } else if (expiryEntry.daysRemaining <= 0 && !expiryEntry.warningSent) {
                // 域名已到期
                const expiryDateFormatted = new Date(expiryEntry.expiryDate * 1000).toLocaleDateString(
                  'zh-CN'
                )
                const expiredReason = `域名已到期（${expiryDateFormatted}），请尽快续费！`
                console.log(`Domain expired for ${monitor.name}: ${expiredReason}`)

                await formatAndNotify(monitor, false, currentTimeSecond, currentTimeSecond, expiredReason)
                expiryEntry.warningSent = true
                statusChanged = true
              } else if (expiryEntry.daysRemaining > warningDays && expiryEntry.warningSent) {
                // 如果域名已续费（剩余天数超过警告阈值），重置警告状态
                expiryEntry.warningSent = false
                statusChanged = true
              }

              state.domainExpiry[monitor.id] = expiryEntry
            } else if (expiryInfo && expiryInfo.error) {
              console.log(
                `Failed to get domain expiry info for ${monitor.name}: ${expiryInfo.error}`
              )
              // 保存错误信息到 state，以便前端显示
              const expiryEntry = state.domainExpiry[monitor.id] || {
                expiryDate: 0,
                daysRemaining: -1,
                warningSent: false,
                lastChecked: currentTimeSecond,
              }
              expiryEntry.error = expiryInfo.error
              expiryEntry.lastChecked = currentTimeSecond
              state.domainExpiry[monitor.id] = expiryEntry
              statusChanged = true
            }
          }
        } catch (e) {
          console.log(`Error checking domain expiry for ${monitor.name}: ${e}`)
        }
      }

    }

    console.log(
      `statusChanged: ${statusChanged}, lastUpdate: ${state.lastUpdate}, currentTime: ${currentTimeSecond}`
    )
    // Update state
    // Allow for a cooldown period before writing to KV
    if (
      statusChanged ||
      currentTimeSecond - state.lastUpdate >= (workerConfig.kvWriteCooldownMinutes ?? 3) * 60 - 10 // Allow for 10 seconds of clock drift
    ) {
      console.log('Updating state...')
      state.lastUpdate = currentTimeSecond
      await env.UPTIMEFLARE_STATE.put('state', JSON.stringify(state))
    } else {
      console.log('Skipping state update due to cooldown period.')
    }
  },
}

export default Worker

export class RemoteChecker extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async getLocationAndStatus(
    monitor: MonitorTarget
  ): Promise<{ location: string; status: { ping: number; up: boolean; err: string } }> {
    const colo = (await getWorkerLocation()) as string
    console.log(`Running remote checker (DurableObject) at ${colo}...`)
    const status = await getStatus(monitor)
    return {
      location: colo,
      status: status,
    }
  }

  async kill() {
    // Throwing an error in `blockConcurrencyWhile` will terminate the Durable Object instance
    // https://developers.cloudflare.com/durable-objects/api/state/#blockconcurrencywhile
    this.ctx.blockConcurrencyWhile(async () => {
      throw 'killed'
    })
  }
}
