import { Text, Tooltip, Badge } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/types/config'
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconCalendar } from '@tabler/icons-react'
import DetailBar from './DetailBar'
import DetailChart from './DetailChart'
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
      <div style={{ 
        padding: '20px',
        background: 'rgba(10, 14, 39, 0.5)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 51, 102, 0.3)'
      }}>
        <Text mt="sm" fw={700} style={{ 
          color: '#ffffff', 
          fontSize: '18px', 
          letterSpacing: '1px',
          fontFamily: 'monospace'
        }}>
          {monitor.name}
        </Text>
        <Text mt="sm" fw={500} style={{ 
          color: '#ff3366', 
          fontSize: '14px',
          fontFamily: 'monospace',
          textShadow: '0 0 8px rgba(255, 51, 102, 0.5)'
        }}>
          暂无数据，请确保已使用最新配置部署 Worker 并检查 Worker 状态！
        </Text>
      </div>
    )

  let statusIcon =
    state.incident[monitor.id].slice(-1)[0].end === undefined ? (
      <IconAlertCircle
        style={{ 
          width: '1.25em', 
          height: '1.25em', 
          color: '#ff3366', 
          marginRight: '3px',
          filter: 'drop-shadow(0 0 8px #ff3366)'
        }}
      />
    ) : (
      <IconCircleCheck
        style={{ 
          width: '1.25em', 
          height: '1.25em', 
          color: '#00ff88', 
          marginRight: '3px',
          filter: 'drop-shadow(0 0 8px #00ff88)'
        }}
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
          color: '#ffaa00',
          marginRight: '3px',
          filter: 'drop-shadow(0 0 8px #ffaa00)'
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
  }

  // Conditionally render monitor name with or without hyperlink based on monitor.url presence
  const monitorNameElement = (
    <Text fw={600} style={{ 
      display: 'inline-flex', 
      alignItems: 'center',
      color: '#ffffff',
      fontSize: '20px',
      letterSpacing: '0.3px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      margin: 0
    }}>
      {monitor.statusPageLink ? (
        <a
          href={monitor.statusPageLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            color: '#ffffff',
            textDecoration: 'none',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#00ffff'
            e.currentTarget.style.transform = 'translateX(2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#ffffff'
            e.currentTarget.style.transform = 'translateX(0)'
          }}
        >
          <span style={{ 
            filter: 'drop-shadow(0 0 8px currentColor)', 
            display: 'inline-flex', 
            alignItems: 'center',
            lineHeight: 1
          }}>{statusIcon}</span>
          <span>{monitor.name}</span>
        </a>
      ) : (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            filter: 'drop-shadow(0 0 8px currentColor)', 
            display: 'inline-flex', 
            alignItems: 'center',
            lineHeight: 1
          }}>{statusIcon}</span>
          <span>{monitor.name}</span>
        </div>
      )}
    </Text>
  )

  // 获取当前状态和错误信息
  const lastIncident = state.incident[monitor.id].slice(-1)[0]
  const isCurrentlyDown = lastIncident.end === undefined
  const currentError = isCurrentlyDown ? lastIncident.error.slice(-1)[0] : null
  const latestLatency = state.latency[monitor.id]?.recent?.slice(-1)[0]

  // 优化错误信息显示
  const formatError = (error: string): { message: string; description?: string } => {
    if (!error) return { message: '' }
    
    // 处理 "Expected codes: 2xx, Got: XXX" 格式
    const expectedMatch = error.match(/Expected codes: (?:2xx|\[.*?\]), Got: (\d+)/)
    if (expectedMatch) {
      const statusCode = parseInt(expectedMatch[1])
      let description = ''
      
      // HTTP 状态码说明
      const statusDescriptions: { [key: number]: string } = {
        400: '请求错误',
        401: '未授权',
        403: '禁止访问',
        404: '未找到',
        500: '服务器内部错误',
        502: '网关错误',
        503: '服务不可用',
        504: '网关超时',
        521: 'Cloudflare: 网站服务器未连接',
        522: 'Cloudflare: 连接超时',
        523: 'Cloudflare: 源站不可达',
        524: 'Cloudflare: 超时',
        525: 'Cloudflare: SSL 握手失败',
        526: 'Cloudflare: 无效的 SSL 证书',
      }
      
      description = statusDescriptions[statusCode] || `HTTP ${statusCode}`
      
      return {
        message: `HTTP ${statusCode}`,
        description: description
      }
    }
    
    // 如果已经是 HTTP 开头的格式，直接返回
    if (error.startsWith('HTTP ')) {
      return { message: error }
    }
    
    // 其他错误格式
    return { message: error }
  }
  
  const formattedError = currentError ? formatError(currentError) : null

  // 格式化位置显示
  const formatLocation = (loc: string): string => {
    if (!loc) return '未知'
    
    // Cloudflare 数据中心代码到地名的映射
    const locationMap: { [key: string]: string } = {
      'TPE': '台北',
      'HKG': '香港',
      'SIN': '新加坡',
      'NRT': '东京',
      'ICN': '首尔',
      'BKK': '曼谷',
      'KUL': '吉隆坡',
      'HND': '东京',
      'SYD': '悉尼',
      'MEL': '墨尔本',
      'AKL': '奥克兰',
      'FRA': '法兰克福',
      'LHR': '伦敦',
      'CDG': '巴黎',
      'AMS': '阿姆斯特丹',
      'MAD': '马德里',
      'IAD': '华盛顿',
      'ORD': '芝加哥',
      'DFW': '达拉斯',
      'SFO': '旧金山',
      'LAX': '洛杉矶',
      'SEA': '西雅图',
      'JFK': '纽约',
      'YYZ': '多伦多',
      'YVR': '温哥华',
      'GRU': '圣保罗',
      'EZE': '布宜诺斯艾利斯',
    }
    
    // 如果包含斜杠，说明是 "国家/城市" 格式（Globalping）
    if (loc.includes('/')) {
      return loc
    }
    
    // 如果是三字母代码，查找映射
    const upperLoc = loc.toUpperCase()
    if (locationMap[upperLoc]) {
      return locationMap[upperLoc]
    }
    
    // 否则直接返回原值
    return loc
  }

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '20px', 
        flexWrap: 'nowrap',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
        marginBottom: '20px',
        position: 'relative'
      }}>
        {/* 左侧：监控信息 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          flexWrap: 'wrap', 
          flex: '1 1 auto', 
          minWidth: 0
        }}>
          {monitor.tooltip ? (
            <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip>
          ) : (
            monitorNameElement
          )}
          
          {/* 当前状态：响应时间或错误信息 */}
          {!isCurrentlyDown && latestLatency ? (
            <span style={{ 
              padding: '8px 14px',
              background: 'rgba(48, 209, 88, 0.2)',
              borderRadius: '10px',
              border: '1px solid rgba(48, 209, 88, 0.3)',
              fontSize: '13px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              color: '#30d158',
              fontWeight: 600,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(48, 209, 88, 0.2), 0 0 0 1px rgba(48, 209, 88, 0.1) inset'
            }}>
              ✓ {latestLatency.ping}ms · {formatLocation(latestLatency.loc)}
            </span>
          ) : isCurrentlyDown && formattedError ? (
            <span style={{ 
              padding: '8px 14px',
              background: 'rgba(255, 59, 48, 0.2)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 59, 48, 0.3)',
              fontSize: '13px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              color: '#ff3b30',
              fontWeight: 600,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(255, 59, 48, 0.2), 0 0 0 1px rgba(255, 59, 48, 0.1) inset'
            }}>
              ⚠️ {formattedError.message} {formattedError.description && `(${formattedError.description})`}
            </span>
          ) : null}
        </div>

        {/* 右侧：总体可用率 */}
        <div style={{
          flex: '0 0 auto',
          marginLeft: 'auto'
        }}>
          <Text 
            fw={600} 
            style={{ 
              display: 'inline-block', 
              color: getColor(uptimePercent, true), 
              whiteSpace: 'nowrap',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              letterSpacing: '0.3px',
              fontSize: '15px',
              userSelect: 'none',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 255, 255, 0.25)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 255, 255, 0.08) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset'
            }}
          >
            总体可用率: {uptimePercent}%
          </Text>
        </div>

      </div>

      {domainExpiryElement}

      {/* Response times 图表 */}
      {!monitor.hideLatencyChart && state.latency[monitor.id]?.recent && state.latency[monitor.id].recent.length > 0 && (
        <>
          {/* DetailBar 显示在图表上方 */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'nowrap', 
            marginTop: '0px', 
            marginBottom: '16px', 
            minWidth: '200px', 
            alignItems: 'center', 
            gap: '2px', 
            padding: '10px 14px', 
            background: 'rgba(255, 255, 255, 0.04)', 
            borderRadius: '12px', 
            border: '1px solid rgba(0, 255, 255, 0.12)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 255, 255, 0.05) inset'
          }}>
            <DetailBar monitor={monitor} state={state} />
          </div>
          <DetailChart monitor={monitor} state={state} />
        </>
      )}

    </>
  )
}
