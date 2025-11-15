import { MonitorState, MonitorTarget } from '@/types/config'
import { Accordion, Center, Text } from '@mantine/core'
import MonitorDetail from './MonitorDetail'
import { pageConfig } from '@/uptime.config'
import { useEffect, useState } from 'react'

function countDownCount(state: MonitorState, ids: string[]) {
  let downCount = 0
  for (let id of ids) {
    if (state.incident[id] === undefined || state.incident[id].length === 0) {
      continue
    }

    if (state.incident[id].slice(-1)[0].end === undefined) {
      downCount++
    }
  }
  return downCount
}

function getStatusTextColor(state: MonitorState, ids: string[]) {
  let downCount = countDownCount(state, ids)
  if (downCount === 0) {
    return '#00ff88'
  } else if (downCount === ids.length) {
    return '#ff3366'
  } else {
    return '#ffaa00'
  }
}

export default function MonitorList({
  monitors,
  state,
}: {
  monitors: MonitorTarget[]
  state: MonitorState
}) {
  const group = pageConfig.group
  const groupedMonitor = group && Object.keys(group).length > 0
  let content

  // Load expanded groups from localStorage
  const savedExpandedGroups = localStorage.getItem('expandedGroups')
  const expandedInitial = savedExpandedGroups
    ? JSON.parse(savedExpandedGroups)
    : Object.keys(group || {})
  const [expandedGroups, setExpandedGroups] = useState<string[]>(expandedInitial)
  useEffect(() => {
    localStorage.setItem('expandedGroups', JSON.stringify(expandedGroups))
  }, [expandedGroups])

  if (groupedMonitor) {
    // Grouped monitors
    content = (
      <Accordion
        multiple
        defaultValue={Object.keys(group)}
        variant="default"
        value={expandedGroups}
        onChange={(values) => setExpandedGroups(values)}
        styles={{
          item: {
            background: 'transparent',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            borderRadius: '8px',
            marginBottom: '12px',
            transition: 'all 0.3s ease',
          },
          control: {
            background: 'rgba(10, 14, 39, 0.5)',
            padding: '16px',
            borderRadius: '8px',
          },
          panel: {
            padding: '8px 16px 16px 16px',
            background: 'transparent',
          },
          label: {
            color: '#ffffff',
          }
        }}
        classNames={{
          control: 'tech-accordion-control'
        }}
      >
        {Object.keys(group).map((groupName) => (
          <Accordion.Item key={groupName} value={groupName}>
            <Accordion.Control>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div style={{ color: '#ffffff', fontWeight: 600, letterSpacing: '1px' }}>{groupName}</div>
                <Text
                  fw={600}
                  style={{
                    display: 'inline',
                    paddingRight: '5px',
                    color: getStatusTextColor(state, group[groupName]),
                    textShadow: `0 0 10px ${getStatusTextColor(state, group[groupName])}`,
                    fontFamily: 'monospace',
                    letterSpacing: '1px'
                  }}
                >
                  {group[groupName].length - countDownCount(state, group[groupName])}/
                  {group[groupName].length} 正常运行
                </Text>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              {monitors
                .filter((monitor) => group[groupName].includes(monitor.id))
                .sort((a, b) => group[groupName].indexOf(a.id) - group[groupName].indexOf(b.id))
                .map((monitor, index) => (
                  <div 
                    key={monitor.id}
                    id={`monitor-${monitor.id}`}
                    style={{
                      transition: 'all 0.3s ease',
                      animation: `fadeInUp 0.4s ease-in ${index * 0.1}s both`
                    }}
                  >
                    <div
                      style={{
                        padding: '24px',
                        borderRadius: '20px',
                        marginBottom: '16px',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(0, 255, 255, 0.15)',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.08) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.35)'
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'
                        e.currentTarget.style.boxShadow = '0 16px 64px rgba(0, 255, 255, 0.25), 0 0 0 1px rgba(0, 255, 255, 0.15) inset, 0 1px 0 rgba(255, 255, 255, 0.08) inset'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.15)'
                        e.currentTarget.style.transform = 'translateY(0) scale(1)'
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.08) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                      }}
                    >
                      <MonitorDetail monitor={monitor} state={state} />
                    </div>
                  </div>
                ))}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    )
  } else {
    // Ungrouped monitors - 按状态排序：故障的在前
    content = [...monitors]
      .sort((a, b) => {
        const aDown = state.incident[a.id]?.slice(-1)[0]?.end === undefined
        const bDown = state.incident[b.id]?.slice(-1)[0]?.end === undefined
        if (aDown && !bDown) return -1
        if (!aDown && bDown) return 1
        return 0
      })
      .map((monitor, index) => (
        <div 
          key={monitor.id}
          id={`monitor-${monitor.id}`}
          style={{
            transition: 'all 0.3s ease',
            animation: `fadeInUp 0.4s ease-in ${index * 0.1}s both`
          }}
        >
          <div
            style={{
              padding: '24px',
              borderRadius: '20px',
              marginBottom: '16px',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(0, 255, 255, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.08) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.35)'
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'
              e.currentTarget.style.boxShadow = '0 16px 64px rgba(0, 255, 255, 0.25), 0 0 0 1px rgba(0, 255, 255, 0.15) inset, 0 1px 0 rgba(255, 255, 255, 0.08) inset'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.08) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset'
            }}
          >
            <MonitorDetail monitor={monitor} state={state} />
          </div>
        </div>
      ))
  }

  return (
    <Center>
      <div
        style={{ 
          width: '100%',
          maxWidth: '970px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          position: 'relative',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingTop: '24px'
        }}
      >
        {content}
        <style jsx global>{`
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
        `}</style>
      </div>
    </Center>
  )
}
