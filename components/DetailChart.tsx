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
        borderColor: '#007aff',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderWidth: 2,
        radius: 0,
        cubicInterpolationMode: 'monotone' as const,
        tension: 0.4,
        fill: true,
        segment: {
          borderColor: (ctx: any) => {
            // 根据响应时间动态改变颜色 - iOS风格
            const value = ctx.p1.parsed.y
            if (value > 1000) return '#ff3b30' // 红色 - 慢
            if (value > 500) return '#ff9500' // 橙色 - 中等
            return '#30d158' // 绿色 - 快
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
        bodyColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(0, 255, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        borderRadius: 10,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
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
          family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          size: 14,
          weight: '500' as const,
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
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 255, 255, 0.1)',
          lineWidth: 1,
        },
        border: {
          color: 'rgba(0, 255, 255, 0.2)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 255, 255, 0.1)',
          lineWidth: 1,
        },
        border: {
          color: 'rgba(0, 255, 255, 0.2)',
        },
      },
    },
  }

  return (
    <div style={{ 
      height: '160px',
      position: 'relative',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(0, 255, 255, 0.15)',
      marginTop: '0px',
      overflow: 'hidden',
      backdropFilter: 'blur(25px) saturate(180%)',
      WebkitBackdropFilter: 'blur(25px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 255, 255, 0.08) inset, 0 1px 0 rgba(255, 255, 255, 0.03) inset'
    }}>
      <Line options={options} data={data} />
      <style jsx>{`
        :global(canvas) {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
