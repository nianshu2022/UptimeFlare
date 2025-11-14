import { Alert, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

export default function NoIncidentsAlert({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="tech-card"
      style={{
        margin: '16px auto 0 auto',
        padding: '24px',
        background: 'rgba(15, 22, 41, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 255, 255, 0.1) inset',
        textAlign: 'center',
        position: 'relative',
        ...style,
      }}
    >
      <IconInfoCircle 
        style={{ 
          color: '#00aaff', 
          marginBottom: '12px',
          filter: 'drop-shadow(0 0 10px rgba(0, 170, 255, 0.5))'
        }} 
        size={48}
      />
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '8px',
          letterSpacing: '1px',
          textShadow: '0 0 10px rgba(0, 170, 255, 0.5)',
          fontFamily: 'monospace'
        }}
      >
        本月无事件
      </div>
      <Text style={{ color: '#b0b8c4', fontSize: '14px' }}>本月没有任何事件记录。</Text>
    </div>
  )
}
