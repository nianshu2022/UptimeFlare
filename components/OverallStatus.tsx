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
  let icon = <IconAlertCircle style={{ width: 72, height: 72, color: '#ff3366', filter: 'drop-shadow(0 0 20px #ff3366)' }} />
  let statusColor = '#ff3366'
  if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = '暂无数据'
    statusColor = '#6366f1'
  } else if (state.overallUp === 0) {
    statusString = '所有系统不可用'
    statusColor = '#ff3366'
  } else if (state.overallDown === 0) {
    statusString = '所有系统正常运行'
    icon = <IconCircleCheck style={{ width: 72, height: 72, color: '#00ff9f', filter: 'drop-shadow(0 0 20px #00ff9f)' }} />
    statusColor = '#00ff9f'
  } else {
    statusString = `部分系统不可用 (${state.overallDown}/${state.overallUp + state.overallDown})`
    statusColor = '#ffaa00'
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
      <Center>
        <div style={{ 
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          animation: 'fadeInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: `drop-shadow(0 0 40px ${statusColor}aa)`,
          position: 'relative'
        }}>
          {icon}
          {/* 多层脉冲环 */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${100 + i * 40}px`,
                height: `${100 + i * 40}px`,
                borderRadius: '50%',
                border: `2px solid ${statusColor}40`,
                animation: `pulseRing 2s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                pointerEvents: 'none'
              }}
            />
          ))}
        </div>
      </Center>
      <Title 
        mt="md" 
        mb="lg"
        style={{ 
          textAlign: 'center',
          transition: 'all 0.3s ease',
          animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
          fontWeight: 800,
          letterSpacing: '4px',
          fontSize: '42px',
          background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}cc 50%, ${statusColor} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: `0 0 40px ${statusColor}66, 0 0 80px ${statusColor}33`,
          fontFamily: 'monospace',
          position: 'relative'
        }} 
        order={1}
      >
        {statusString}
      </Title>
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
      `}</style>
      <Box style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '20px', 
        marginTop: '32px',
        marginBottom: '40px',
        padding: '24px 32px',
        background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(30, 20, 50, 0.85) 100%)',
        borderRadius: '20px',
        border: '2px solid rgba(138, 43, 226, 0.4)',
        backdropFilter: 'blur(30px) saturate(180%)',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '92%',
        maxWidth: '1400px',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 60px rgba(138, 43, 226, 0.2) inset, 0 0 100px rgba(0, 240, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 彩虹边框光效 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(138, 43, 226, 1), rgba(0, 240, 255, 1), rgba(255, 0, 255, 1), rgba(0, 255, 159, 1), transparent)',
          animation: 'slideBorder 4s linear infinite',
          filter: 'blur(1px)'
        }} />
        <Title style={{ 
          textAlign: 'center', 
          color: '#b0b8c4',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'monospace',
          letterSpacing: '1px'
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
          size="lg"
          onClick={() => {
            setIsRefreshing(true)
            window.location.reload()
          }}
          title="刷新页面"
          loading={isRefreshing}
          style={{
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)',
            border: '2px solid rgba(138, 43, 226, 0.5)',
            color: '#8a2be2',
            borderRadius: '12px',
            width: '44px',
            height: '44px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotate(180deg) scale(1.15)'
            e.currentTarget.style.boxShadow = '0 0 30px rgba(138, 43, 226, 0.8), 0 0 60px rgba(0, 240, 255, 0.4)'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(138, 43, 226, 0.4) 0%, rgba(0, 240, 255, 0.4) 100%)'
            e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)'
            e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.5)'
          }}
        >
          <IconRefresh size={20} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
        </ActionIcon>
      </Box>
      <style jsx>{`
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
