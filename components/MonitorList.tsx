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
                        padding: '28px',
                        borderRadius: '20px',
                        marginBottom: '20px',
                        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.85) 0%, rgba(30, 20, 50, 0.75) 100%)',
                        border: '2px solid rgba(138, 43, 226, 0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(138, 43, 226, 0.1) inset'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 20, 50, 0.95) 0%, rgba(40, 30, 60, 0.9) 100%)'
                        e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.8)'
                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 60px rgba(138, 43, 226, 0.4) inset, 0 0 100px rgba(0, 240, 255, 0.2), 0 0 150px rgba(138, 43, 226, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 20, 35, 0.85) 0%, rgba(30, 20, 50, 0.75) 100%)'
                        e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.3)'
                        e.currentTarget.style.transform = 'translateY(0) scale(1)'
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(138, 43, 226, 0.1) inset'
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
              padding: '28px',
              borderRadius: '20px',
              marginBottom: '20px',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.85) 0%, rgba(30, 20, 50, 0.75) 100%)',
              border: '2px solid rgba(138, 43, 226, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(138, 43, 226, 0.1) inset'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 20, 50, 0.95) 0%, rgba(40, 30, 60, 0.9) 100%)'
              e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.8)'
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 60px rgba(138, 43, 226, 0.4) inset, 0 0 100px rgba(0, 240, 255, 0.2), 0 0 150px rgba(138, 43, 226, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 20, 35, 0.85) 0%, rgba(30, 20, 50, 0.75) 100%)'
              e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.3)'
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(138, 43, 226, 0.1) inset'
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
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95) 0%, rgba(30, 20, 50, 0.9) 100%)',
          border: '2px solid rgba(138, 43, 226, 0.4)',
          backdropFilter: 'blur(30px) saturate(180%)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(138, 43, 226, 0.2) inset, 0 0 100px rgba(0, 240, 255, 0.1)',
          position: 'relative',
          marginLeft: 'auto',
          marginRight: 'auto',
          borderRadius: '24px',
          padding: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.8), 0 0 80px rgba(138, 43, 226, 0.4) inset, 0 0 150px rgba(0, 240, 255, 0.2), 0 0 200px rgba(138, 43, 226, 0.4)'
          e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.8)'
          e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(138, 43, 226, 0.2) inset, 0 0 100px rgba(0, 240, 255, 0.1)'
          e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.4)'
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
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
