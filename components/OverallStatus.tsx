import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { Center, Container, Title, Collapse, Button, Box, ActionIcon, Transition } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle, IconRefresh } from '@tabler/icons-react'
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
  state: { overallUp: number; overallDown: number; lastUpdate: number }
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
        
        {/* 最后更新时间（无卡片样式） */}
        <Title style={{ 
          textAlign: 'center', 
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '13px',
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          letterSpacing: '0.3px',
          margin: 0,
          marginTop: '16px'
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
      </div>
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
