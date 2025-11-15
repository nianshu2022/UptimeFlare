import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MonitorState, MonitorTarget } from '@/types/config'
import { KVNamespace } from '@cloudflare/workers-types'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import MonitorList from '@/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'

export const runtime = 'experimental-edge'

const inter = Inter({ subsets: ['latin'] })

export default function Home({
  state: stateStr,
  monitors,
}: {
  state: string
  monitors: MonitorTarget[]
}) {
  let state
  if (stateStr !== undefined) {
    state = JSON.parse(stateStr) as MonitorState
  }

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  const monitorId = window.location.hash.substring(1)
  if (monitorId) {
    const monitor = monitors.find((monitor) => monitor.id === monitorId)
    if (!monitor || !state) {
      return <Text fw={700}>未找到 ID 为 {monitorId} 的监控项！</Text>
    }
    return (
      <div style={{ maxWidth: '810px' }}>
        <MonitorDetail monitor={monitor} state={state} />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>

      <main className={inter.className} style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 40%, #f0f0f5 100%)',
        paddingTop: '40px',
        paddingBottom: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        position: 'relative',
        zIndex: 1,
        overflowX: 'hidden'
      }}>
        {/* iOS 风格背景层 */}
        <div className="tech-background" />
        <div className="tech-background-glow" />
        {state == undefined ? (
          <Center style={{ padding: '60px 20px', position: 'relative', zIndex: 1 }}>
            <div className="tech-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
              <Text fw={700} size="lg" className="tech-status-offline">
                监控状态未定义，请检查 Worker 的状态和 KV 绑定！
              </Text>
            </div>
          </Center>
        ) : (
          <div style={{ animation: 'fadeInContent 0.8s ease-out', position: 'relative', zIndex: 1 }}>
            <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
            <MonitorList monitors={monitors} state={state} />
          </div>
        )}

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeInContent {
            from {
              opacity: 0;
              transform: translateY(30px) scale(0.95) rotateX(5deg);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1) rotateX(0deg);
            }
          }
          @keyframes float {
            0%, 100% {
              transform: translate(0, 0) scale(1);
              opacity: 0.3;
            }
            25% {
              transform: translate(20px, -30px) scale(1.2);
              opacity: 0.8;
            }
            50% {
              transform: translate(-15px, -50px) scale(0.9);
              opacity: 0.5;
            }
            75% {
              transform: translate(25px, -20px) scale(1.1);
              opacity: 0.7;
            }
          }
        `}</style>
      </main>
    </>
  )
}

export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  // Read state as string from KV, to avoid hitting server-side cpu time limit
  const state = (await UPTIMEFLARE_STATE?.get('state')) as unknown as MonitorState

  // Only present these values to client
  const monitors = workerConfig.monitors.map((monitor) => {
    return {
      id: monitor.id,
      name: monitor.name,
      target: monitor.target,
      method: monitor.method,
      // @ts-ignore
      tooltip: monitor?.tooltip,
      // @ts-ignore
      statusPageLink: monitor?.statusPageLink,
      // @ts-ignore
      hideLatencyChart: monitor?.hideLatencyChart,
      // @ts-ignore
      domainExpiryCheck: monitor?.domainExpiryCheck,
    }
  })

  return { props: { state, monitors } }
}
