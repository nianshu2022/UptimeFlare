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
    gray: { bg: 'rgba(15, 22, 41, 0.8)', border: 'rgba(0, 255, 255, 0.2)', text: '#b0b8c4' },
    yellow: { bg: 'rgba(255, 170, 0, 0.1)', border: 'rgba(255, 170, 0, 0.4)', text: '#ffaa00' },
    orange: { bg: 'rgba(255, 170, 0, 0.1)', border: 'rgba(255, 170, 0, 0.4)', text: '#ffaa00' },
    red: { bg: 'rgba(255, 51, 102, 0.1)', border: 'rgba(255, 51, 102, 0.4)', text: '#ff3366' },
    blue: { bg: 'rgba(0, 170, 255, 0.1)', border: 'rgba(0, 170, 255, 0.4)', text: '#00aaff' },
  }
  
  const colors = colorMap[alertColor] || colorMap.gray

  return (
    <div
      className="tech-card"
      style={{
        margin: '16px auto 0 auto',
        padding: '20px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${colors.border} inset`,
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <IconAlertTriangle 
          style={{ 
            color: colors.text, 
            marginRight: '8px',
            filter: `drop-shadow(0 0 8px ${colors.text})`
          }} 
        />
        <span
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: colors.text,
            textShadow: `0 0 10px ${colors.text}`,
            letterSpacing: '1px',
            fontFamily: 'monospace'
          }}
        >
          {(upcoming ? '[即将到来] ' : '') + (maintenance.title || '计划维护')}
        </span>
      </div>
      <div style={{ color: '#b0b8c4' }}>
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
            fontWeight: 'bold',
            color: colors.text,
            fontFamily: 'monospace',
            fontSize: '13px'
          }}>
            {upcoming ? '计划时间:' : '开始时间:'}
          </div>
          <div style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '13px' }}>
            {new Date(maintenance.start).toLocaleString('zh-CN')}
          </div>
          <div style={{ 
            textAlign: 'right', 
            fontWeight: 'bold',
            color: colors.text,
            fontFamily: 'monospace',
            fontSize: '13px'
          }}>
            {upcoming ? '预计结束:' : '结束时间:'}
          </div>
          <div style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '13px' }}>
            {maintenance.end ? new Date(maintenance.end).toLocaleString('zh-CN') : '另行通知'}
          </div>
        </div>
      </div>

        <Text style={{ 
          paddingTop: '3px', 
          whiteSpace: 'pre-line',
          color: '#ffffff',
          lineHeight: '1.6'
        }}>
          {maintenance.body}
        </Text>
        {maintenance.monitors && maintenance.monitors.length > 0 && (
          <>
            <Text mt="xs" style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', letterSpacing: '1px' }}>
              受影响的组件:
            </Text>
            <List size="sm" withPadding style={{ color: '#b0b8c4', marginTop: '8px' }}>
              {maintenance.monitors.map((comp, compIdx) => (
                <List.Item 
                  key={compIdx}
                  style={{
                    fontFamily: 'monospace',
                    padding: '4px 0',
                    borderLeft: '2px solid rgba(0, 255, 255, 0.3)',
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
