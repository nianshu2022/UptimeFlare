import { Alert, List, Text, useMantineTheme } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertTriangle } from '@tabler/icons-react'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { pageConfig } from '@/uptime.config'

export default function MaintenanceAlert({
  maintenance,
  style,
  upcoming = false,
}: {
  maintenance: Omit<MaintenanceConfig, 'monitors'> & { monitors?: (MonitorTarget | undefined)[] }
  style?: React.CSSProperties
  upcoming?: boolean
}) {
  const theme = useMantineTheme()
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`)

  const alertColor = upcoming 
    ? pageConfig.maintenances?.upcomingColor ?? 'gray' 
    : maintenance.color || 'yellow'
  
  const colorMap: { [key: string]: { bg: string; border: string; text: string } } = {
    gray: { bg: 'rgba(142, 142, 147, 0.15)', border: 'rgba(142, 142, 147, 0.2)', text: '#8e8e93' },
    yellow: { bg: 'rgba(255, 149, 0, 0.15)', border: 'rgba(255, 149, 0, 0.2)', text: '#ff9500' },
    orange: { bg: 'rgba(255, 149, 0, 0.15)', border: 'rgba(255, 149, 0, 0.2)', text: '#ff9500' },
    red: { bg: 'rgba(255, 59, 48, 0.15)', border: 'rgba(255, 59, 48, 0.2)', text: '#ff3b30' },
    blue: { bg: 'rgba(0, 122, 255, 0.15)', border: 'rgba(0, 122, 255, 0.2)', text: '#007aff' },
  }
  
  const colors = colorMap[alertColor] || colorMap.gray

  return (
    <div
      className="tech-card"
      style={{
        margin: '16px auto 0 auto',
        padding: '20px',
        background: `rgba(255, 255, 255, 0.8)`,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <IconAlertTriangle 
          style={{ 
            color: colors.text, 
            marginRight: '8px'
          }} 
        />
        <span
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: colors.text,
            letterSpacing: '0.3px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          }}
        >
          {(upcoming ? '[即将到来] ' : '') + (maintenance.title || '计划维护')}
        </span>
      </div>
      <div style={{ color: '#6e6e73' }}>
        {/* Date range in top right (desktop) or inline (mobile) */}
        <div
          style={{
            ...{
              top: 10,
              fontSize: '0.85rem',
              marginBottom: 12,
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 255, 0.1)',
            },
            ...(isDesktop
              ? {
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  padding: '8px 12px',
                  textAlign: 'right',
                }
              : { marginBottom: 12 }),
          }}
        >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gridColumnGap: '3px',
          }}
        >
          <div style={{ 
            textAlign: 'right', 
            fontWeight: '500',
            color: '#6e6e73',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            fontSize: '13px'
          }}>
            {upcoming ? '计划时间:' : '开始时间:'}
          </div>
          <div style={{ color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', fontSize: '13px' }}>
            {new Date(maintenance.start).toLocaleString('zh-CN')}
          </div>
          <div style={{ 
            textAlign: 'right', 
            fontWeight: '500',
            color: '#6e6e73',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            fontSize: '13px'
          }}>
            {upcoming ? '预计结束:' : '结束时间:'}
          </div>
          <div style={{ color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', fontSize: '13px' }}>
            {maintenance.end ? new Date(maintenance.end).toLocaleString('zh-CN') : '另行通知'}
          </div>
        </div>
      </div>

        <Text style={{ 
          paddingTop: '3px', 
          whiteSpace: 'pre-line',
          color: '#1d1d1f',
          lineHeight: '1.6',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
        }}>
          {maintenance.body}
        </Text>
        {maintenance.monitors && maintenance.monitors.length > 0 && (
          <>
            <Text mt="xs" style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '14px', letterSpacing: '0.3px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
              受影响的组件:
            </Text>
            <List size="sm" withPadding style={{ color: '#6e6e73', marginTop: '8px' }}>
              {maintenance.monitors.map((comp, compIdx) => (
                <List.Item 
                  key={compIdx}
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    padding: '4px 0',
                    borderLeft: `2px solid ${colors.border}`,
                    paddingLeft: '12px'
                  }}
                >
                  {comp?.name ?? '[错误: 未找到监控项]'}
                </List.Item>
              ))}
            </List>
          </>
        )}
      </div>
    </div>
  )
}
