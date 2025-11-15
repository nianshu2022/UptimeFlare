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
      <div style={{ maxWidth: '970px' }}>
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
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 30%, #0f1629 70%, #0a0e27 100%)',
        paddingTop: '40px',
        paddingBottom: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        position: 'relative',
        zIndex: 1,
        overflowX: 'hidden'
      }}>
        {/* 科技感背景层 */}
        <div className="tech-background" />
        <div className="tech-background-glow" />
        <div className="tech-grid-overlay" />
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
            {/* 页面标题 */}
            {pageConfig.title && (
              <div style={{
                textAlign: 'center',
                marginBottom: '32px',
                maxWidth: '970px',
                marginLeft: 'auto',
                marginRight: 'auto',
                padding: '0 20px'
              }}>
                <h1 style={{
                  fontSize: '42px',
                  fontWeight: 700,
                  color: '#ffffff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                  letterSpacing: '1px',
                  margin: 0,
                  marginBottom: '8px',
                  textShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                }}>
                  {pageConfig.title}
                </h1>
                {pageConfig.links && pageConfig.links.length > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: '16px'
                  }}>
                    {pageConfig.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.link}
                        target={link.link.startsWith('mailto:') ? undefined : '_blank'}
                        rel={link.link.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                        style={{
                          padding: '8px 16px',
                          background: link.highlight ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          border: `1px solid ${link.highlight ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 255, 0.15)'}`,
                          color: link.highlight ? '#00ffff' : 'rgba(255, 255, 255, 0.8)',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                          fontWeight: link.highlight ? 600 : 400,
                          transition: 'all 0.3s ease',
                          backdropFilter: 'blur(10px)',
                          display: 'inline-block'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = link.highlight ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 255, 255, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = link.highlight ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
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
