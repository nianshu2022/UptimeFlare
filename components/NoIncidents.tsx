import { Alert, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

export default function NoIncidentsAlert({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="tech-card"
      style={{
        margin: '16px auto 0 auto',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(0, 122, 255, 0.2)',
        borderRadius: '16px',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset',
        textAlign: 'center',
        position: 'relative',
        ...style,
      }}
    >
      <IconInfoCircle 
        style={{ 
          color: '#007aff', 
          marginBottom: '12px'
        }} 
        size={48}
      />
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#1d1d1f',
          marginBottom: '8px',
          letterSpacing: '0.3px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
        }}
      >
        本月无事件
      </div>
      <Text style={{ color: '#6e6e73', fontSize: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>本月没有任何事件记录。</Text>
    </div>
  )
}
