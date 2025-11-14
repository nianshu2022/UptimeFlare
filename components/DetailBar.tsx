import { MonitorState, MonitorTarget } from '@/types/config'
import { getColor } from '@/util/color'
import { Box, Tooltip, Modal } from '@mantine/core'
import { useResizeObserver } from '@mantine/hooks'
import { useState } from 'react'
const moment = require('moment')
require('moment-precise-range-plugin')

export default function DetailBar({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  const [barRef, barRect] = useResizeObserver()
  const [modalOpened, setModalOpened] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modelContent, setModelContent] = useState(<div />)

  const overlapLen = (x1: number, x2: number, y1: number, y2: number) => {
    return Math.max(0, Math.min(x2, y2) - Math.max(x1, y1))
  }

  const uptimePercentBars = []

  const currentTime = Math.round(Date.now() / 1000)
  const montiorStartTime = state.incident[monitor.id][0].start[0]

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  for (let i = 89; i >= 0; i--) {
    const dayStart = Math.round(todayStart.getTime() / 1000) - i * 86400
    const dayEnd = dayStart + 86400

    const dayMonitorTime = overlapLen(dayStart, dayEnd, montiorStartTime, currentTime)
    let dayDownTime = 0

    let incidentReasons: Array<{ start: string; end: string; duration: string; error: string }> = []

    for (let incident of state.incident[monitor.id]) {
      const incidentStart = incident.start[0]
      const incidentEnd = incident.end ?? currentTime

      const overlap = overlapLen(dayStart, dayEnd, incidentStart, incidentEnd)
      dayDownTime += overlap

      // Incident history for the day
      if (overlap > 0) {
        for (let i = 0; i < incident.error.length; i++) {
          let partStart = incident.start[i]
          let partEnd =
            i === incident.error.length - 1 ? incident.end ?? currentTime : incident.start[i + 1]
          partStart = Math.max(partStart, dayStart)
          partEnd = Math.min(partEnd, dayEnd)

          if (overlapLen(dayStart, dayEnd, partStart, partEnd) > 0) {
            const startDate = new Date(partStart * 1000)
            const endDate = new Date(partEnd * 1000)
            
            // 格式化开始时间
            const startStr = startDate.toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
            
            // 格式化结束时间
            const endStr = endDate.toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
            
            // 计算持续时长
            const durationSeconds = partEnd - partStart
            const durationMinutes = Math.floor(durationSeconds / 60)
            const durationHours = Math.floor(durationMinutes / 60)
            
            let durationText = ''
            if (durationHours > 0) {
              durationText = `${durationHours}小时${durationMinutes % 60}分钟`
            } else if (durationMinutes > 0) {
              durationText = `${durationMinutes}分钟`
            } else {
              durationText = `${durationSeconds}秒`
            }
            
            // 统一错误信息格式
            let errorText = incident.error[i]
            // 如果错误信息包含 "Expected codes"，提取更简洁的信息
            if (errorText.includes('Expected codes')) {
              const match = errorText.match(/Got: (\d+)/)
              if (match) {
                errorText = `HTTP ${match[1]}`
              }
            }
            // 如果错误信息以 "HTTP" 开头，保持原样
            // 否则原样显示
            
            incidentReasons.push({
              start: startStr,
              end: endStr,
              duration: durationText,
              error: errorText,
            })
          }
        }
      }
    }

    const dayPercent = (((dayMonitorTime - dayDownTime) / dayMonitorTime) * 100).toPrecision(4)

    uptimePercentBars.push(
      <Tooltip
        multiline
        key={i}
        events={{ hover: true, focus: false, touch: true }}
        label={
          Number.isNaN(Number(dayPercent)) ? (
            <div style={{ color: '#b0b8c4', fontFamily: 'monospace', fontSize: '12px' }}>无数据</div>
          ) : (
            <div style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '12px' }}>
              <div>{dayPercent + '% - ' + new Date(dayStart * 1000).toLocaleDateString('zh-CN')}</div>
              {dayDownTime > 0 && (
                <div style={{ color: '#ff3366', marginTop: '4px' }}>
                  {`故障时长: ${moment.preciseDiff(
                    moment(0),
                    moment(dayDownTime * 1000)
                  )} (点击查看详情)`}
                </div>
              )}
            </div>
          )
        }
      >
        <div
          style={{
            height: '20px',
            width: '7px',
            background: getColor(dayPercent, false),
            borderRadius: '2px',
            marginLeft: '1px',
            marginRight: '1px',
            transition: 'all 0.2s ease',
            boxShadow: `0 0 8px ${getColor(dayPercent, false)}`,
            cursor: dayDownTime > 0 ? 'pointer' : 'default',
          }}
          onMouseEnter={(e) => {
            if (dayDownTime > 0) {
              e.currentTarget.style.boxShadow = `0 0 15px ${getColor(dayPercent, false)}, 0 0 25px ${getColor(dayPercent, false)}`
              e.currentTarget.style.transform = 'scaleY(1.2)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 0 8px ${getColor(dayPercent, false)}`
            e.currentTarget.style.transform = 'scaleY(1)'
          }}
          onClick={() => {
            if (dayDownTime > 0) {
              setModalTitle(
                `🚨 ${monitor.name} 在 ${new Date(dayStart * 1000).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} 的事件详情`
              )
              setModelContent(
                <div style={{ lineHeight: '1.8' }}>
                  {[...incidentReasons].reverse().map((reason, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        marginBottom: '16px',
                        padding: '16px',
                        background: 'rgba(15, 22, 41, 0.8)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 51, 102, 0.4)',
                        borderLeft: '4px solid #ff3366',
                        boxShadow: '0 4px 20px rgba(255, 51, 102, 0.2)'
                      }}
                    >
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '12px', 
                        color: '#ff3366',
                        textShadow: '0 0 10px #ff3366',
                        fontSize: '16px',
                        fontFamily: 'monospace',
                        letterSpacing: '1px'
                      }}>
                        🔴 事件 #{index + 1}
                      </div>
                      <div style={{ marginBottom: '8px', color: '#b0b8c4' }}>
                        <span style={{ fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>开始时间：</span>
                        <span style={{ fontFamily: 'monospace', marginLeft: '8px' }}>{reason.start}</span>
                      </div>
                      <div style={{ marginBottom: '8px', color: '#b0b8c4' }}>
                        <span style={{ fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>结束时间：</span>
                        <span style={{ fontFamily: 'monospace', marginLeft: '8px' }}>{reason.end}</span>
                      </div>
                      <div style={{ marginBottom: '8px', color: '#b0b8c4' }}>
                        <span style={{ fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>持续时长：</span>
                        <span style={{ 
                          color: '#ff3366', 
                          fontFamily: 'monospace',
                          textShadow: '0 0 8px #ff3366',
                          marginLeft: '8px'
                        }}>{reason.duration}</span>
                      </div>
                      <div style={{ 
                        marginTop: '12px', 
                        paddingTop: '12px', 
                        borderTop: '1px solid rgba(0, 255, 255, 0.2)'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>错误信息：</span>
                        <div style={{ 
                          color: '#ff3366', 
                          fontFamily: 'monospace',
                          marginTop: '8px',
                          padding: '8px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 51, 102, 0.3)'
                        }}>{reason.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
              setModalOpened(true)
            }
          }}
        />
      </Tooltip>
    )
  }

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={modalTitle}
        size={'40em'}
        styles={{
          content: {
            background: 'linear-gradient(135deg, #0a0e27 0%, #0f1629 100%)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.2)',
          },
          title: {
            color: '#ffffff',
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '1px',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
          },
          close: {
            color: '#ffffff',
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
          },
          body: {
            background: 'transparent',
          }
        }}
      >
        {modelContent}
      </Modal>
      <Box
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          marginTop: '10px',
          marginBottom: '5px',
        }}
        visibleFrom="540"
        ref={barRef}
      >
        {uptimePercentBars.slice(Math.floor(Math.max(9 * 90 - barRect.width, 0) / 9), 90)}
      </Box>
    </>
  )
}
