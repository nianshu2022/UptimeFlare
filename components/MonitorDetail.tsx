import { Text, Tooltip, Badge, Collapse } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/types/config'
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconCalendar, IconCertificate } from '@tabler/icons-react'
import DetailChart from './DetailChart'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'
import { maintenances } from '@/uptime.config'
import { useState } from 'react'

export default function MonitorDetail({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  const [chartExpanded, setChartExpanded] = useState(false)
  
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
    <Text mt="sm" fw={700} style={{ 
      display: 'inline-flex', 
      alignItems: 'center',
      color: '#ffffff',
      fontSize: '18px',
      letterSpacing: '1px',
      fontFamily: 'monospace'
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
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#00ffff'
            e.currentTarget.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#ffffff'
            e.currentTarget.style.textShadow = 'none'
          }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {monitor.tooltip ? (
              <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip>
            ) : (
              monitorNameElement
            )}
            
            {/* 显示当前状态和错误信息（内联显示） */}
            {isCurrentlyDown && formattedError && (
              <span style={{ 
                padding: '4px 8px',
                background: 'rgba(255, 51, 102, 0.1)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#ff3366',
                fontWeight: 600,
                textShadow: '0 0 8px rgba(255, 51, 102, 0.5)',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap'
              }}>
                ⚠️ {formattedError.message} {formattedError.description && `(${formattedError.description})`}
              </span>
            )}
            
            {/* 显示响应时间（内联显示） */}
            {!isCurrentlyDown && latestLatency && (
              <span style={{ 
                padding: '4px 8px',
                background: 'rgba(0, 255, 136, 0.1)',
                borderRadius: '4px',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#00ff88',
                fontWeight: 600,
                textShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap'
              }}>
                ✓ {latestLatency.ping}ms · {formatLocation(latestLatency.loc)}
              </span>
            )}

            <Text 
              fw={700} 
              style={{ 
                display: 'inline', 
                color: getColor(uptimePercent, true), 
                whiteSpace: 'nowrap',
                textShadow: `0 0 10px ${getColor(uptimePercent, true)}`,
                fontFamily: 'monospace',
                letterSpacing: '1px',
                fontSize: '16px',
                cursor: !monitor.hideLatencyChart ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'all 0.2s ease',
                marginLeft: 'auto'
              }}
              onClick={() => {
                if (!monitor.hideLatencyChart) {
                  setChartExpanded(!chartExpanded)
                }
              }}
              onMouseEnter={(e) => {
                if (!monitor.hideLatencyChart) {
                  e.currentTarget.style.opacity = '0.8'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!monitor.hideLatencyChart) {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              总体可用率: {uptimePercent}%
            </Text>
          </div>

          {/* DetailBar在同一行显示 */}
          <DetailBar monitor={monitor} state={state} />
        </div>
      </div>

      {domainExpiryElement}

      {/* 证书有效期信息（如果HTTPS监控）- 始终显示 */}
      {(() => {
        // 检查是否为HTTPS监控
        const isHttps = monitor.target && typeof monitor.target === 'string' && (
          monitor.target.toLowerCase().startsWith('https://') || 
          monitor.target.toLowerCase().startsWith('http://') && monitor.method === 'HTTPS'
        )
        
        if (!isHttps) {
          return null
        }

        const certInfo = state.certificateExpiry?.[monitor.id]
        
        if (certInfo && certInfo.expiryDate && certInfo.expiryDate > 0) {
          // 有证书信息，显示到期日期
          const expiryDate = new Date(certInfo.expiryDate * 1000)
          const daysRemaining = certInfo.daysRemaining || 0
          const expiryDateStr = expiryDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })

          let badgeColor = 'green'
          let badgeText = `证书到期: ${expiryDateStr} (剩余 ${daysRemaining} 天)`

          if (daysRemaining <= 0) {
            badgeColor = 'red'
            badgeText = `证书已过期: ${expiryDateStr}！请立即更新`
          } else if (daysRemaining <= 7) {
            badgeColor = 'red'
            badgeText = `证书即将过期: ${expiryDateStr} (剩余 ${daysRemaining} 天)`
          } else if (daysRemaining <= 30) {
            badgeColor = 'yellow'
            badgeText = `证书即将到期: ${expiryDateStr} (剩余 ${daysRemaining} 天)`
          }

          return (
            <Badge
              key="certificate-expiry"
              color={badgeColor}
              variant="light"
              leftSection={<IconCertificate size={12} />}
              style={{ marginTop: '8px', display: 'inline-block', marginRight: '8px' }}
            >
              {badgeText}
            </Badge>
          )
        } else if (certInfo && certInfo.error) {
          // 显示证书查询错误
          return (
            <Badge
              key="certificate-error"
              color="gray"
              variant="light"
              leftSection={<IconCertificate size={12} />}
              style={{ marginTop: '8px', display: 'inline-block', marginRight: '8px' }}
            >
              证书信息查询失败: {certInfo.error}
            </Badge>
          )
        } else {
          // 如果还没有证书信息，始终显示待检查提示
          return (
            <Badge
              key="certificate-pending"
              color="blue"
              variant="light"
              leftSection={<IconCertificate size={12} />}
              style={{ marginTop: '8px', display: 'inline-block', marginRight: '8px' }}
            >
              🔒 证书信息待检查
            </Badge>
          )
        }
      })()}

      {!monitor.hideLatencyChart && (
        <Collapse in={chartExpanded}>
          <DetailChart monitor={monitor} state={state} />
        </Collapse>
      )}
    </>
  )
}
