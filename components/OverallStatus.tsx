import { MaintenanceConfig, MonitorTarget, MonitorState } from '@/types/config'
import { Center, Container, Title, Collapse, Button, Box, ActionIcon, Transition, Group, Text, Badge } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle, IconRefresh, IconClock, IconActivity, IconTrendingUp } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import MaintenanceAlert from './MaintenanceAlert'
import { pageConfig } from '@/uptime.config'

function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  return isVisible
}

export default function OverallStatus({
  state,
  maintenances,
  monitors,
}: {
  state: MonitorState
  maintenances: MaintenanceConfig[]
  monitors: MonitorTarget[]
}) {
  let group = pageConfig.group
  let groupedMonitor = (group && Object.keys(group).length > 0) || false

  let statusString = ''
  let icon = <IconAlertCircle style={{ width: 64, height: 64, color: '#ff3b30' }} />
  let statusColor = '#ff3b30'
  if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = '暂无数据'
    statusColor = '#007aff'
  } else if (state.overallUp === 0) {
    statusString = '所有系统不可用'
    statusColor = '#ff3b30'
  } else if (state.overallDown === 0) {
    statusString = '所有系统正常运行'
    icon = <IconCircleCheck style={{ width: 64, height: 64, color: '#30d158' }} />
    statusColor = '#30d158'
  } else {
    statusString = `部分系统不可用 (${state.overallDown}/${state.overallUp + state.overallDown})`
    statusColor = '#ff9500'
  }

  const [openTime] = useState(Math.round(Date.now() / 1000))
  const [currentTime, setCurrentTime] = useState(Math.round(Date.now() / 1000))
  const isWindowVisible = useWindowVisibility()
  const [expandUpcoming, setExpandUpcoming] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 格式化相对时间
  const formatRelativeTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} 秒前`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes} 分钟前`
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return minutes > 0 ? `${hours} 小时 ${minutes} 分钟前` : `${hours} 小时前`
    } else {
      const days = Math.floor(seconds / 86400)
      return `${days} 天前`
    }
  }

  // 计算统计信息
  const totalMonitors = monitors.length
  const overallUptime = state.overallUp + state.overallDown > 0
    ? ((state.overallUp / (state.overallUp + state.overallDown)) * 100).toFixed(2)
    : '0.00'
  
  // 计算平均响应时间
  let totalLatency = 0
  let latencyCount = 0
  monitors.forEach(monitor => {
    const latencyData = state.latency[monitor.id]
    if (latencyData && latencyData.recent && latencyData.recent.length > 0) {
      const latestLatency = latencyData.recent[latencyData.recent.length - 1]
      if (latestLatency && latestLatency.ping > 0) {
        totalLatency += latestLatency.ping
        latencyCount++
      }
    }
  })
  const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0

  // 获取最近的事件（最近的3个）
  const recentIncidents: Array<{ monitorName: string; monitorId: string; startTime: number; error: string; isActive: boolean }> = []
  monitors.forEach(monitor => {
    const incidents = state.incident[monitor.id]
    if (incidents && incidents.length > 0) {
      const lastIncident = incidents[incidents.length - 1]
      if (lastIncident && lastIncident.start && lastIncident.start.length > 0) {
        const startTime = lastIncident.start[0]
        const isActive = lastIncident.end === undefined
        const error = lastIncident.error && lastIncident.error.length > 0 ? lastIncident.error[lastIncident.error.length - 1] : '未知错误'
        recentIncidents.push({
          monitorName: monitor.name,
          monitorId: monitor.id,
          startTime,
          error,
          isActive
        })
      }
    }
  })
  
  // 按时间排序，取最近3个
  const sortedRecentIncidents = recentIncidents
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 3)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWindowVisible) return
      if (currentTime - state.lastUpdate > 300 && currentTime - openTime > 30) {
        window.location.reload()
      }
      setCurrentTime(Math.round(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  })

  const now = new Date()

  const activeMaintenances: (Omit<MaintenanceConfig, 'monitors'> & {
    monitors?: MonitorTarget[]
  })[] = maintenances
    .filter((m) => now >= new Date(m.start) && (!m.end || now <= new Date(m.end)))
    .map((maintenance) => ({
      ...maintenance,
      monitors: maintenance.monitors?.map(
        (monitorId) => monitors.find((mon) => monitorId === mon.id)!
      ),
    }))

  const upcomingMaintenances: (Omit<MaintenanceConfig, 'monitors'> & {
    monitors?: (MonitorTarget | undefined)[]
  })[] = maintenances
    .filter((m) => now < new Date(m.start))
    .map((maintenance) => ({
      ...maintenance,
      monitors: maintenance.monitors?.map(
        (monitorId) => monitors.find((mon) => monitorId === mon.id)!
      ),
    }))

  return (
    <Container size="md" mt="xl" style={{ transition: 'all 0.3s ease', position: 'relative', zIndex: 1, maxWidth: '100%', paddingLeft: '0', paddingRight: '0' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* 状态图标和文字组合 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          width: '100%'
        }}>
          <div style={{ 
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            animation: 'fadeInScale 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            position: 'relative'
          }}>
            {icon}
          </div>
          <Title 
            style={{ 
              textAlign: 'center',
              transition: 'all 0.3s ease',
              animation: 'fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both',
              fontWeight: 600,
              letterSpacing: '0.5px',
              fontSize: '32px',
              color: statusColor,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              position: 'relative',
              margin: 0
            }} 
            order={1}
          >
            {statusString}
          </Title>
        </div>
        
        {/* 最后更新时间和刷新按钮 */}
        <Group style={{ 
          gap: '12px',
          alignItems: 'center'
        }}>
          <Title style={{ 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '13px',
            fontWeight: 400,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            letterSpacing: '0.3px',
            margin: 0
          }} order={5}>
            最后更新: {formatRelativeTime(currentTime - state.lastUpdate)} · {' '}
            {new Date(state.lastUpdate * 1000).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Title>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => {
              setIsRefreshing(true)
              window.location.reload()
            }}
            title="刷新页面"
            loading={isRefreshing}
            style={{
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              color: '#00ffff',
              borderRadius: '8px',
              width: '32px',
              height: '32px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(90deg) scale(1.05)'
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 255, 255, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <IconRefresh size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          </ActionIcon>
        </Group>
      </div>

      {/* 统计信息卡片 */}
      <Group style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
        width: '100%',
        maxWidth: '970px'
      }}>
        {/* 总监控数 */}
        <Box style={{
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.15)',
          backdropFilter: 'blur(25px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 255, 255, 0.08) inset',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.15)'
        }}
        >
          <IconActivity size={24} style={{ color: '#00ffff', marginBottom: '8px' }} />
          <Text style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            marginBottom: '4px'
          }}>
            {totalMonitors}
          </Text>
          <Text style={{ 
            fontSize: '13px', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
          }}>
            总监控数
          </Text>
        </Box>

        {/* 平均响应时间 */}
        <Box style={{
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.15)',
          backdropFilter: 'blur(25px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 255, 255, 0.08) inset',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.15)'
        }}
        >
          <IconClock size={24} style={{ color: '#00ffff', marginBottom: '8px' }} />
          <Text style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            marginBottom: '4px'
          }}>
            {avgLatency}ms
          </Text>
          <Text style={{ 
            fontSize: '13px', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
          }}>
            平均响应时间
          </Text>
        </Box>

        {/* 总体可用率 */}
        <Box style={{
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.15)',
          backdropFilter: 'blur(25px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 255, 255, 0.08) inset',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.15)'
        }}
        >
          <IconTrendingUp size={24} style={{ color: '#00ffff', marginBottom: '8px' }} />
          <Text style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            color: parseFloat(overallUptime) >= 99 ? '#30d158' : parseFloat(overallUptime) >= 95 ? '#ff9500' : '#ff3b30',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            marginBottom: '4px'
          }}>
            {overallUptime}%
          </Text>
          <Text style={{ 
            fontSize: '13px', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
          }}>
            总体可用率
          </Text>
        </Box>
      </Group>

      {/* 最近事件预览 */}
      {sortedRecentIncidents.length > 0 && (
        <Box style={{
          width: '100%',
          maxWidth: '970px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.15)',
          backdropFilter: 'blur(25px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 255, 255, 0.08) inset',
          marginBottom: '32px'
        }}>
          <Text style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <IconAlertCircle size={18} style={{ color: '#ff9500' }} />
            最近事件
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedRecentIncidents.map((incident, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  background: incident.isActive ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  border: `1px solid ${incident.isActive ? 'rgba(255, 59, 48, 0.2)' : 'rgba(0, 255, 255, 0.1)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = incident.isActive ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 255, 255, 0.06)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = incident.isActive ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 255, 255, 0.04)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
                onClick={() => {
                  window.location.hash = incident.monitorId
                  window.location.reload()
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                  }}>
                    {incident.monitorName}
                  </Text>
                  <Text style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    wordBreak: 'break-word'
                  }}>
                    {incident.error.length > 50 ? incident.error.substring(0, 50) + '...' : incident.error}
                  </Text>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <Badge
                    color={incident.isActive ? 'red' : 'gray'}
                    variant="light"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  >
                    {incident.isActive ? '进行中' : '已解决'}
                  </Badge>
                  <Text style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatRelativeTime(currentTime - incident.startTime)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pulseRing {
          0% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% {
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(1.3);
          }
          100% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.8);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes slideBorder {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>

      {/* Upcoming Maintenance */}
      {upcomingMaintenances.length > 0 && (
        <>
          <Title mt="4px" style={{ textAlign: 'center', color: '#70778c' }} order={5}>
            {`${upcomingMaintenances.length} 个即将到来的维护`}{' '}
            <span
              style={{ textDecoration: 'underline', cursor: 'pointer' }}
              onClick={() => setExpandUpcoming(!expandUpcoming)}
            >
              {expandUpcoming ? '[隐藏]' : '[显示]'}
            </span>
          </Title>

          <Collapse in={expandUpcoming}>
            {upcomingMaintenances.map((maintenance, idx) => (
              <MaintenanceAlert
                key={`upcoming-${idx}`}
                maintenance={maintenance}
                style={{ maxWidth: groupedMonitor ? '897px' : '865px' }}
                upcoming
              />
            ))}
          </Collapse>
        </>
      )}

      {/* Active Maintenance */}
      {activeMaintenances.map((maintenance, idx) => (
        <MaintenanceAlert
          key={`active-${idx}`}
          maintenance={maintenance}
          style={{ maxWidth: groupedMonitor ? '897px' : '865px' }}
        />
      ))}
    </Container>
  )
}
