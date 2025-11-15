import { MonitorState, MonitorTarget } from '@/types/config'
import { Accordion, Card, Center, Text } from '@mantine/core'
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
                    style={{
                      transition: 'all 0.3s ease',
                      animation: `fadeInUp 0.4s ease-in ${index * 0.1}s both`
                    }}
                  >
                    <Card.Section 
                      ml="xs" 
                      mr="xs"
                      style={{
                        padding: '20px',
                        borderRadius: '16px',
                        marginBottom: '12px',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)'
                        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.6) inset'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'
                        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset'
                      }}
                    >
                      <MonitorDetail monitor={monitor} state={state} />
                    </Card.Section>
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
          style={{
            transition: 'all 0.3s ease',
            animation: `fadeInUp 0.4s ease-in ${index * 0.1}s both`
          }}
        >
          <Card.Section 
            ml="xs" 
            mr="xs"
            style={{
              padding: '20px',
              borderRadius: '16px',
              marginBottom: '12px',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)'
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.6) inset'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset'
            }}
          >
            <MonitorDetail monitor={monitor} state={state} />
          </Card.Section>
        </div>
      ))
  }

  return (
    <Center>
      <Card
        className="tech-card"
        shadow="none"
        padding="lg"
        radius="md"
        mt="xl"
        withBorder={false}
        style={{ 
          width: groupedMonitor ? '92%' : '92%',
          maxWidth: '1400px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          background: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset',
          position: 'relative',
          marginLeft: 'auto',
          marginRight: 'auto',
          borderRadius: '20px',
          padding: '16px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.6) inset'
          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset'
          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
          e.currentTarget.style.transform = 'translateY(0)'
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
      </Card>
    </Center>
  )
}
