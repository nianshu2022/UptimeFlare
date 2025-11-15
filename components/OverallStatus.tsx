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
  let icon = <IconAlertCircle style={{ width: 64, height: 64, color: '#b91c1c' }} />
  if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = '暂无数据'
  } else if (state.overallUp === 0) {
    statusString = '所有系统不可用'
  } else if (state.overallDown === 0) {
    statusString = '所有系统正常运行'
    icon = <IconCircleCheck style={{ width: 64, height: 64, color: '#059669' }} />
  } else {
    statusString = `部分系统不可用 (${state.overallDown}/${state.overallUp + state.overallDown})`
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
          animation: 'fadeInScale 0.6s ease-out',
          filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.6))',
          position: 'relative'
        }}>
          {icon}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
            animation: 'pulseRing 2s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
        </div>
      </Center>
      <Title 
        mt="md" 
        mb="lg"
        style={{ 
          textAlign: 'center',
          transition: 'all 0.3s ease',
          animation: 'fadeInUp 0.6s ease-out 0.2s both',
          color: '#ffffff',
          textShadow: '0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(0, 255, 255, 0.3)',
          fontWeight: 700,
          letterSpacing: '3px',
          fontSize: '32px',
          background: 'linear-gradient(135deg, #ffffff 0%, #00ffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
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
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
      <Box style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '16px', 
        marginTop: '24px',
        marginBottom: '32px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(15, 22, 41, 0.8) 0%, rgba(26, 31, 58, 0.6) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        backdropFilter: 'blur(20px)',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '92%',
        maxWidth: '1400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.1) inset',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 装饰性边框光效 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.8), transparent)',
          animation: 'slideBorder 3s linear infinite'
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
          size="md"
          onClick={() => {
            setIsRefreshing(true)
            window.location.reload()
          }}
          title="刷新页面"
          loading={isRefreshing}
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 170, 255, 0.15) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.4)',
            color: '#00ffff',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.3)'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.25) 0%, rgba(0, 170, 255, 0.25) 100%)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 170, 255, 0.15) 100%)'
          }}
        >
          <IconRefresh size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
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
