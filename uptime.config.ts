import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  // 状态页面的标题
  title: "Nianshu's Status Page",
  // 显示在状态页面顶部的链接，可以将 `highlight` 设置为 `true` 来高亮显示
  links: [
    { link: 'https://mv.nianshu2022.cn/', label: 'MoonTV' },
    { link: 'https://time.nianshu2022.cn/', label: 'WithYou' },
    { link: 'mailto:ouerqixi@nianshu2022.cn', label: 'Email Me', highlight: true },
  ],
  // [可选] 对监控项进行分组
  // 如果不指定，所有监控项将显示在一个列表中
  // 如果指定，监控项将被分组和排序，未列出的监控项将不可见（但仍会被监控）
  // group: {
  //   '🌐 Public (example group name)': ['foo_monitor', 'bar_monitor', 'more monitor ids...'],
  //   '🔐 Private': ['test_tcp_monitor'],
  // },
  // [可选] 设置网站图标的路径，如果未指定则默认为 '/favicon.png'
  // favicon: 'https://example.com/favicon.ico',
  // [可选] 设置网站徽标的路径，如果未指定则默认为 '/logo.svg'
  // logo: 'https://example.com/logo.svg',
  // [可选] 维护相关设置
  maintenances: {
    // [可选] 即将到来的维护提醒的颜色，默认为 'gray'
    // 活动提醒将始终使用 MaintenanceConfig 中指定的颜色
    upcomingColor: 'gray',
  },
  // [可选] 自定义页脚 HTML
  // customFooter: '',
}

const workerConfig: WorkerConfig = {
  // [可选] 除非状态改变，否则最多每 N 分钟写入一次 KV，默认为 3
  kvWriteCooldownMinutes: 3,
  // 通过取消注释下面一行来为状态页面和 API 启用 HTTP Basic 认证，格式为 `<USERNAME>:<PASSWORD>`
  // passwordProtection: 'username:password',
  // 在此定义所有监控项
  monitors: [
    // MoonTV 监控
    {
      // `id` 应该是唯一的，如果 `id` 保持不变，历史记录将被保留
      id: 'moontv_monitor',
      // `name` 用于状态页面和回调消息
      name: 'MoonTV',
      // `method` 应该是一个有效的 HTTP 方法
      method: 'GET',
      // `target` 是一个有效的 URL
      target: 'https://mv.nianshu2022.cn/',
      // [可选] `statusPageLink` 仅在状态页面用于可点击的链接
      statusPageLink: 'https://mv.nianshu2022.cn/',
      // [可选] 启用域名到期监控
      domainExpiryCheck: true,
      // [可选] 提前多少天警告域名即将到期，默认30天
      domainExpiryWarningDays: 30,
      // [可选] WHOIS API密钥（如果使用whoisxmlapi.com服务，可选）
      // domainExpiryWhoisApiKey: 'your-api-key-here',
    },
    // WithYou 监控
    {
      // `id` 应该是唯一的，如果 `id` 保持不变，历史记录将被保留
      id: 'withyou_monitor',
      // `name` 用于状态页面和回调消息
      name: 'WithYou',
      // `method` 应该是一个有效的 HTTP 方法
      method: 'GET',
      // `target` 是一个有效的 URL
      target: 'https://time.nianshu2022.cn/',
      // [可选] `statusPageLink` 仅在状态页面用于可点击的链接
      statusPageLink: 'https://time.nianshu2022.cn/',
      // [可选] 启用域名到期监控
      domainExpiryCheck: true,
      // [可选] 提前多少天警告域名即将到期，默认30天
      domainExpiryWarningDays: 30,
    },
    {
      // `id` 应该是唯一的，如果 `id` 保持不变，历史记录将被保留
      id: 'cs_monitor',
      // `name` 用于状态页面和回调消息
      name: 'cs',
      // `method` 应该是一个有效的 HTTP 方法
      method: 'GET',
      // `target` 是一个有效的 URL
      target: 'https://111.nianshu2022.cn/',
      // [可选] `statusPageLink` 仅在状态页面用于可点击的链接
      statusPageLink: 'https://111.nianshu2022.cn/',
      // [可选] 启用域名到期监控
      domainExpiryCheck: true,
      // [可选] 提前多少天警告域名即将到期，默认30天
      domainExpiryWarningDays: 30,
      // [可选] WHOIS API密钥（如果使用whoisxmlapi.com服务，可选）
      // domainExpiryWhoisApiKey: 'your-api-key-here',
    },
  ],
  // [可选] 通知设置
  notification: {
    // [可选] 通知 Webhook 设置，如果未指定，则不会发送通知
    // 更多信息请查看 Wiki: https://github.com/lyc8503/UptimeFlare/wiki/Setup-notification
    webhook: {
      // [必需] 钉钉群机器人 Webhook URL
      // 获取方式：在钉钉群聊中，点击右上角设置 -> 智能群助手 -> 添加机器人 -> 自定义机器人 -> 安全设置（建议选择"加签"或"关键词"）-> 复制 Webhook 地址
      url: 'https://oapi.dingtalk.com/robot/send?access_token=59f62a4b15f5fa9b7338ffaeacc5c199b537038ec79e57db681e48293cc6625d',
      // [可选] 钉钉加签密钥，如果使用加签方式，填写此处，系统会自动计算签名
      dingtalkSecret: 'SEC6243e3cced1f46b53340f22603f10fca92389f5891de46530a61ac30bc2da5c6',
      // HTTP 方法，钉钉使用 POST
      method: 'POST',
      // [可选] 要发送的请求头（通常不需要，系统会自动设置）
      headers: {},
      // [必需] 指定如何编码负载，钉钉使用 JSON 格式
      // 应该是 'param'、'json' 或 'x-www-form-urlencoded' 之一
      // 'param': 将 URL 编码的负载追加到 URL 查询参数
      // 'json': 将 JSON 负载作为请求体 POST，设置 content-type 请求头为 'application/json'
      // 'x-www-form-urlencoded': 将 URL 编码的负载作为请求体 POST，设置 content-type 请求头为 'x-www-form-urlencoded'
      payloadType: 'json',
      // [必需] 要发送的负载
      // $MSG 将被替换为人类可读的通知消息
      // 钉钉文本消息格式：https://open.dingtalk.com/document/group/message-types-and-data-format
      payload: {
        msgtype: 'text',
        text: {
          content: '$MSG',
        },
        // [可选] @ 特定成员
        at: {
          // [可选] @ 特定手机号的成员，如：['13800138000', '13900139000']
          // atMobiles: ['13800138000'],
          // [可选] 是否 @ 所有人，true 表示 @ 所有人
          isAtAll: false,
        },
      },
      // [可选] 调用此 webhook 的超时时间，单位为毫秒，默认为 5000
      timeout: 10000,
    },
    // [可选] 通知消息中使用的时区，默认为 "Etc/GMT"
    timeZone: 'Asia/Shanghai',
    // [可选] 发送通知前的宽限期（分钟）
    // 只有在初始失败后，监控项持续故障 N 次连续检查后才会发送通知
    // 如果未指定，通知将立即发送
    gracePeriod: 5,
    // [可选] 对指定 id 的监控项禁用通知
    skipNotificationIds: [],
    // [可选] 在事件期间抑制错误原因更改的额外通知，默认为 false
    skipErrorChangeNotification: true,
  },
  callbacks: {
    onStatusChange: async (
      env: any,
      monitor: any,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // 当任何监控项的状态发生变化时，将调用此回调
      // 在此编写任何 TypeScript 代码
      // 这不会遵循宽限期设置，将在状态变化时立即调用
      // 如果您想实现宽限期，需要手动处理
    },
    onIncident: async (
      env: any,
      monitor: any,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // 如果任何监控项正在发生事件，此回调将每分钟调用一次
      // 在此编写任何 TypeScript 代码
    },
  },
}

// 您可以在此定义多个维护计划
// 在维护期间，状态页面将显示提醒
// 此外，相关的故障通知将被跳过（如果有的话）
// 当然，如果您不需要此功能，可以留空
const maintenances: MaintenanceConfig[] = []

// 不要忘记这个，否则编译会失败
export { maintenances, pageConfig, workerConfig }
