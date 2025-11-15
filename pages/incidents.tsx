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
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 30%, #0f1629 70%, #0a0e27 100%)',
        paddingTop: '40px',
        paddingBottom: '40px',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="tech-background" />
        <div className="tech-background-glow" />
        <div className="tech-grid-overlay" />
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
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    color: '#1d1d1f',
                    borderRadius: '12px',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)'
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
                            background: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            color: '#1d1d1f',
                            borderRadius: '12px',
                            backdropFilter: 'blur(40px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
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
                  background: 'rgba(0, 122, 255, 0.1)',
                  border: '1px solid rgba(0, 122, 255, 0.2)',
                  color: '#007aff',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(-2px)'
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.1)'
                }}
              >
                ← 上一个月
              </Button>
              <Box style={{ 
                alignSelf: 'center', 
                fontWeight: 600, 
                fontSize: 20,
                color: '#1d1d1f',
                letterSpacing: '0.5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
              }}>
                {selectedMonth}
              </Box>
              <Button 
                className="tech-button"
                onClick={() => (window.location.hash = next)}
                style={{
                  background: 'rgba(0, 122, 255, 0.1)',
                  border: '1px solid rgba(0, 122, 255, 0.2)',
                  color: '#007aff',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(2px)'
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.1)'
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
