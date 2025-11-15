import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import { Box, Button, Center, Container, Group, Select, Pagination } from '@mantine/core'
import { useEffect, useState } from 'react'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import NoIncidentsAlert from '@/components/NoIncidents'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

const ITEMS_PER_PAGE = 10

function getSelectedMonth() {
  const hash = window.location.hash.replace('#', '')
  if (!hash) {
    const now = new Date()
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  }
  return hash.split('-').splice(0, 2).join('-')
}

function filterIncidentsByMonth(
  incidents: MaintenanceConfig[],
  monthStr: string
): (Omit<MaintenanceConfig, 'monitors'> & { monitors: MonitorTarget[] })[] {
  return incidents
    .filter((incident) => {
      const d = new Date(incident.start)
      const incidentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      return incidentMonth === monthStr
    })
    .map((e) => ({
      ...e,
      monitors: (e.monitors || []).map((e) => workerConfig.monitors.find((mon) => mon.id === e)!),
    }))
    .sort((a, b) => (new Date(a.start) > new Date(b.start) ? -1 : 1))
}

function getPrevNextMonth(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1)
  const prev = new Date(date)
  prev.setMonth(prev.getMonth() - 1)
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
  return {
    prev: prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0'),
    next: next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0'),
  }
}

export default function IncidentsPage() {
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>('')
  const [selectedMonth, setSelectedMonth] = useState(getSelectedMonth())
  const [activePage, setActivePage] = useState(1)

  useEffect(() => {
    const onHashChange = () => {
      setSelectedMonth(getSelectedMonth())
      setActivePage(1) // 切换月份时重置到第一页
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    setActivePage(1) // 切换监控项时重置到第一页
  }, [selectedMonitor])

  const filteredIncidents = filterIncidentsByMonth(maintenances, selectedMonth)
  const monitorFilteredIncidents = selectedMonitor
    ? filteredIncidents.filter((i) => i.monitors.find((e) => e.id === selectedMonitor))
    : filteredIncidents

  // 分页计算
  const totalPages = Math.ceil(monitorFilteredIncidents.length / ITEMS_PER_PAGE)
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedIncidents = monitorFilteredIncidents.slice(startIndex, endIndex)

  const { prev, next } = getPrevNextMonth(selectedMonth)

  const monitorOptions = [
    { value: '', label: '全部' },
    ...workerConfig.monitors.map((monitor) => ({
      value: monitor.id,
      label: monitor.name,
    })),
  ]

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>

      <main className={inter.className} style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #151520 30%, #1a1a2e 60%, #151520 100%)',
        paddingTop: '40px',
        paddingBottom: '40px',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="tech-background" />
        <div className="tech-background-glow" />
        <Center style={{ position: 'relative', zIndex: 1 }}>
          <Container size="md" style={{ width: '100%' }}>
            <Group justify="end" mb="md">
              <Select
                placeholder="选择监控项"
                data={monitorOptions}
                value={selectedMonitor}
                onChange={setSelectedMonitor}
                clearable
                style={{ 
                  maxWidth: 300, 
                  float: 'right',
                }}
                styles={{
                  input: {
                    background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(30, 20, 50, 0.85) 100%)',
                    border: '2px solid rgba(138, 43, 226, 0.4)',
                    color: '#ffffff',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)'
                  }
                }}
                classNames={{
                  input: 'tech-select-input'
                }}
              />
            </Group>
            <Box>
              {monitorFilteredIncidents.length === 0 ? (
                <NoIncidentsAlert />
              ) : (
                <>
                  {paginatedIncidents.map((incident, i) => (
                    <MaintenanceAlert key={i} maintenance={incident} />
                  ))}
                  {totalPages > 1 && (
                    <Center mt="xl" mb="md">
                      <Pagination
                        total={totalPages}
                        value={activePage}
                        onChange={setActivePage}
                        size="md"
                        styles={{
                          control: {
                            background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(30, 20, 50, 0.85) 100%)',
                            border: '2px solid rgba(138, 43, 226, 0.4)',
                            color: '#ffffff',
                            borderRadius: '12px',
                            backdropFilter: 'blur(20px)',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        classNames={{
                          control: 'tech-pagination-control'
                        }}
                      />
                    </Center>
                  )}
                </>
              )}
            </Box>
            <Group justify="space-between" mt="md">
              <Button 
                className="tech-button"
                onClick={() => (window.location.hash = prev)}
                style={{
                  background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(0, 240, 255, 0.2))',
                  border: '2px solid rgba(138, 43, 226, 0.5)',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '12px 24px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: '0 4px 20px rgba(138, 43, 226, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(-4px) scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(138, 43, 226, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(138, 43, 226, 0.3)'
                }}
              >
                ← 上一个月
              </Button>
              <Box style={{ 
                alignSelf: 'center', 
                fontWeight: 700, 
                fontSize: 24,
                color: '#ffffff',
                textShadow: '0 0 20px rgba(138, 43, 226, 0.6), 0 0 40px rgba(0, 240, 255, 0.4)',
                letterSpacing: '3px',
                fontFamily: 'monospace',
                background: 'linear-gradient(135deg, rgba(138, 43, 226, 1), rgba(0, 240, 255, 1))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {selectedMonth}
              </Box>
              <Button 
                className="tech-button"
                onClick={() => (window.location.hash = next)}
                style={{
                  background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(0, 240, 255, 0.2))',
                  border: '2px solid rgba(138, 43, 226, 0.5)',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '12px 24px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: '0 4px 20px rgba(138, 43, 226, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px) scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(138, 43, 226, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(138, 43, 226, 0.3)'
                }}
              >
                下一个月 →
              </Button>
            </Group>
          </Container>
        </Center>
      </main>
    </>
  )
}
