import type { Env } from '../worker/src'

export type PageConfig = {
  title?: string
  links?: PageConfigLink[]
  group?: PageConfigGroup
  favicon?: string
  logo?: string
  maintenances?: {
    upcomingColor?: string
  }
  customFooter?: string
}

export type MaintenanceConfig = {
  monitors?: string[]
  title?: string
  body: string
  start: number | string
  end?: number | string
  color?: string
}

export type PageConfigGroup = { [key: string]: string[] }

export type PageConfigLink = {
  link: string
  label: string
  highlight?: boolean
}

export type MonitorTarget = {
  id: string
  name: string
  method: string
  target: string
  tooltip?: string
  statusPageLink?: string
  hideLatencyChart?: boolean
  expectedCodes?: number[]
  timeout?: number
  headers?: { [key: string]: string | number }
  body?: string
  responseKeyword?: string
  responseForbiddenKeyword?: string
  checkProxy?: string
  checkProxyFallback?: boolean
  // 域名到期监控相关配置
  domainExpiryCheck?: boolean
  domainExpiryWarningDays?: number // 提前多少天警告域名即将到期，默认30天
  domainExpiryWhoisApiKey?: string // WHOIS API密钥（可选，如果不提供则使用免费API）
}

export type WorkerConfig<TEnv = Env> = {
  kvWriteCooldownMinutes?: number
  passwordProtection?: string
  monitors: MonitorTarget[]
  notification?: Notification
  callbacks?: Callbacks<TEnv>
}

export type Notification = {
  webhook?: WebhookConfig
  timeZone?: string
  gracePeriod?: number
  skipNotificationIds?: string[]
  skipErrorChangeNotification?: boolean
}

type SingleWebhook = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: { [key: string]: string | number }
  payloadType: 'param' | 'json' | 'x-www-form-urlencoded'
  payload: any
  timeout?: number
  // [可选] 钉钉加签密钥，如果提供，将自动计算签名并添加到URL中
  dingtalkSecret?: string
}

export type WebhookConfig = SingleWebhook | SingleWebhook[]

export type Callbacks<TEnv = Env> = {
  onStatusChange?: (
    env: TEnv,
    monitor: MonitorTarget,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
  onIncident?: (
    env: TEnv,
    monitor: MonitorTarget,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
}

export type MonitorState = {
  lastUpdate: number
  overallUp: number
  overallDown: number
  incident: Record<
    string,
    {
      start: number[]
      end: number | undefined // undefined if it's still open
      error: string[]
    }[]
  >

  latency: Record<
    string,
    {
      recent: {
        loc: string
        ping: number
        time: number
      }[] // recent 12 hour data, 2 min interval
      all: {
        loc: string
        ping: number
        time: number
      }[] // all data in 90 days, 1 hour interval
    }
  >
  // 域名到期信息
  domainExpiry?: Record<
    string,
    {
      expiryDate: number // 到期时间戳（秒）
      daysRemaining: number // 剩余天数
      warningSent: boolean // 是否已发送警告
      lastChecked: number // 最后检查时间戳（秒）
      error?: string // 错误信息（如果有）
    }
  >
}
