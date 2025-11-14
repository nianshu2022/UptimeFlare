import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-moment'
import { MonitorState, MonitorTarget } from '@/types/config'
import { codeToCountry } from '@/util/iata'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
)

export default function DetailChart({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  const latencyData = state.latency[monitor.id].recent.map((point) => ({
    x: point.time * 1000,
    y: point.ping,
    loc: point.loc,
  }))

  let data = {
    datasets: [
      {
        data: latencyData,
        borderColor: '#00ffff',
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        borderWidth: 2,
        radius: 0,
        cubicInterpolationMode: 'monotone' as const,
        tension: 0.4,
        fill: true,
        segment: {
          borderColor: (ctx: any) => {
            // 根据响应时间动态改变颜色
            const value = ctx.p1.parsed.y
            if (value > 1000) return '#ff3366' // 红色 - 慢
            if (value > 500) return '#ffaa00' // 橙色 - 中等
            return '#00ff88' // 绿色 - 快
          },
        },
      },
    ],
  }

  let options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    animation: {
      duration: 2000,
      easing: 'linear' as const,
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(15, 22, 41, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#b0b8c4',
        borderColor: 'rgba(0, 255, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (item: any) => {
            if (item.parsed.y) {
              return `${item.parsed.y}ms (${codeToCountry(item.raw.loc)})`
            }
          },
        },
      },
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Response times(ms)',
        align: 'start' as const,
        color: '#ffffff',
        font: {
          family: 'monospace',
          size: 14,
          weight: '600' as const,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        ticks: {
          source: 'auto' as const,
          maxRotation: 0,
          autoSkip: true,
          color: '#b0b8c4',
          font: {
            family: 'monospace',
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 255, 255, 0.15)',
          lineWidth: 1,
        },
        border: {
          color: 'rgba(0, 255, 255, 0.3)',
        },
      },
      y: {
        ticks: {
          color: '#b0b8c4',
          font: {
            family: 'monospace',
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 255, 255, 0.15)',
          lineWidth: 1,
        },
        border: {
          color: 'rgba(0, 255, 255, 0.3)',
        },
      },
    },
  }

  return (
    <div style={{ 
      height: '150px',
      position: 'relative',
      background: 'rgba(10, 14, 39, 0.3)',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid rgba(0, 255, 255, 0.1)',
      marginTop: '12px',
      overflow: 'hidden'
    }}>
      <Line options={options} data={data} />
      {/* 流动效果遮罩层 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.2) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'chartFlow 3s linear infinite',
        borderRadius: '8px',
        opacity: 0.6
      }} />
      <style jsx>{`
        @keyframes chartFlow {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        :global(canvas) {
          filter: drop-shadow(0 0 2px rgba(0, 255, 255, 0.4));
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
