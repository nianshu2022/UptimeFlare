import { Text, Tooltip, Badge } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/types/config'
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconCalendar } from '@tabler/icons-react'
import DetailChart from './DetailChart'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'
import { maintenances } from '@/uptime.config'

export default function MonitorDetail({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  if (!state.latency[monitor.id])
    return (
      <>
        <Text mt="sm" fw={700}>
          {monitor.name}
        </Text>
        <Text mt="sm" fw={700}>
          暂无数据，请确保已使用最新配置部署 Worker 并检查 Worker 状态！
        </Text>
      </>
    )

  let statusIcon =
    state.incident[monitor.id].slice(-1)[0].end === undefined ? (
      <IconAlertCircle
        style={{ width: '1.25em', height: '1.25em', color: '#b91c1c', marginRight: '3px' }}
      />
    ) : (
      <IconCircleCheck
        style={{ width: '1.25em', height: '1.25em', color: '#059669', marginRight: '3px' }}
      />
    )

  // Hide real status icon if monitor is in maintenance
  const now = new Date()
  const hasMaintenance = maintenances
    .filter((m) => now >= new Date(m.start) && (!m.end || now <= new Date(m.end)))
    .find((maintenance) => maintenance.monitors?.includes(monitor.id))
  if (hasMaintenance)
    statusIcon = (
      <IconAlertTriangle
        style={{
          width: '1.25em',
          height: '1.25em',
          color: '#fab005',
          marginRight: '3px',
        }}
      />
    )

  let totalTime = Date.now() / 1000 - state.incident[monitor.id][0].start[0]
  let downTime = 0
  for (let incident of state.incident[monitor.id]) {
    downTime += (incident.end ?? Date.now() / 1000) - incident.start[0]
  }

  const uptimePercent = (((totalTime - downTime) / totalTime) * 100).toPrecision(4)

  // 域名到期信息
  const domainExpiryInfo = state.domainExpiry?.[monitor.id]
  let domainExpiryElement: JSX.Element | null = null

  if (monitor.domainExpiryCheck && domainExpiryInfo && domainExpiryInfo.expiryDate > 0) {
    const expiryDate = new Date(domainExpiryInfo.expiryDate * 1000)
    const daysRemaining = domainExpiryInfo.daysRemaining
    const expiryDateStr = expiryDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    let badgeColor = 'green'
    let badgeText = `域名到期: ${expiryDateStr} (剩余 ${daysRemaining} 天)`

    if (daysRemaining <= 0) {
      badgeColor = 'red'
      badgeText = `域名已到期: ${expiryDateStr}！请尽快续费`
    } else if (daysRemaining <= 7) {
      badgeColor = 'red'
      badgeText = `域名即将到期: ${expiryDateStr} (剩余 ${daysRemaining} 天)`
    } else if (daysRemaining <= 30) {
      badgeColor = 'yellow'
      badgeText = `域名即将到期: ${expiryDateStr} (剩余 ${daysRemaining} 天)`
    }

    domainExpiryElement = (
      <Badge
        color={badgeColor}
        variant="light"
        leftSection={<IconCalendar size={12} />}
        style={{ marginTop: '8px' }}
      >
        {badgeText}
      </Badge>
    )
  } else if (monitor.domainExpiryCheck && domainExpiryInfo?.error) {
    domainExpiryElement = (
      <Badge
        color="gray"
        variant="light"
        leftSection={<IconCalendar size={12} />}
        style={{ marginTop: '8px' }}
      >
        域名到期信息查询失败
      </Badge>
    )
  }

  // Conditionally render monitor name with or without hyperlink based on monitor.url presence
  const monitorNameElement = (
    <Text mt="sm" fw={700} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {monitor.statusPageLink ? (
        <a
          href={monitor.statusPageLink}
          target="_blank"
          style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}
        >
          {statusIcon} {monitor.name}
        </a>
      ) : (
        <>
          {statusIcon} {monitor.name}
        </>
      )}
    </Text>
  )

  // 获取当前状态和错误信息
  const lastIncident = state.incident[monitor.id].slice(-1)[0]
  const isCurrentlyDown = lastIncident.end === undefined
  const currentError = isCurrentlyDown ? lastIncident.error.slice(-1)[0] : null
  const latestLatency = state.latency[monitor.id]?.recent?.slice(-1)[0]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {monitor.tooltip ? (
            <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip>
          ) : (
            monitorNameElement
          )}
          
          {/* 显示当前状态和错误信息 */}
          {isCurrentlyDown && currentError && (
            <Text 
              size="sm" 
              style={{ 
                color: '#dc2626', 
                marginTop: '4px',
                display: 'block',
                fontWeight: 500
              }}
            >
              ⚠️ {currentError.includes('HTTP') ? currentError : `错误: ${currentError}`}
            </Text>
          )}
          
          {/* 显示响应时间 */}
          {!isCurrentlyDown && latestLatency && (
            <Text 
              size="sm" 
              style={{ 
                color: '#059669', 
                marginTop: '4px',
                display: 'block'
              }}
            >
              ✓ 响应时间: {latestLatency.ping}ms · 位置: {latestLatency.loc}
            </Text>
          )}
        </div>

        <Text mt="sm" fw={700} style={{ display: 'inline', color: getColor(uptimePercent, true), whiteSpace: 'nowrap' }}>
          总体可用率: {uptimePercent}%
        </Text>
      </div>

      {domainExpiryElement}

      <DetailBar monitor={monitor} state={state} />
      {!monitor.hideLatencyChart && <DetailChart monitor={monitor} state={state} />}
    </>
  )
}
