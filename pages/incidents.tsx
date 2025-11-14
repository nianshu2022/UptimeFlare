import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import { Box, Button, Center, Container, Group, Select } from '@mantine/core'
import { useEffect, useState } from 'react'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import NoIncidentsAlert from '@/components/NoIncidents'
import '@/styles/global.css'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

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

  useEffect(() => {
    const onHashChange = () => setSelectedMonth(getSelectedMonth())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const filteredIncidents = filterIncidentsByMonth(maintenances, selectedMonth)
  const monitorFilteredIncidents = selectedMonitor
    ? filteredIncidents.filter((i) => i.monitors.find((e) => e.id === selectedMonitor))
    : filteredIncidents

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
        background: 'linear-gradient(135deg, #0a0e27 0%, #0f1629 50%, #0a0e27 100%)',
        paddingTop: '40px',
        paddingBottom: '40px',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="tech-background" />
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
                    background: 'rgba(15, 22, 41, 0.8)',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    color: '#ffffff',
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
                monitorFilteredIncidents.map((incident, i) => (
                  <MaintenanceAlert key={i} maintenance={incident} />
                ))
              )}
            </Box>
            <Group justify="space-between" mt="md">
              <Button 
                className="tech-button"
                onClick={() => (window.location.hash = prev)}
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 170, 255, 0.1))',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  color: '#ffffff',
                }}
              >
                ← 上一个月
              </Button>
              <Box style={{ 
                alignSelf: 'center', 
                fontWeight: 600, 
                fontSize: 18,
                color: '#ffffff',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                letterSpacing: '2px'
              }}>
                {selectedMonth}
              </Box>
              <Button 
                className="tech-button"
                onClick={() => (window.location.hash = next)}
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 170, 255, 0.1))',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  color: '#ffffff',
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
