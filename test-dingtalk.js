/**
 * 钉钉通知本地测试脚本
 * 使用方法：node test-dingtalk.js
 */

const crypto = require('crypto')

// 从配置文件读取的钉钉配置
const DINGTALK_CONFIG = {
  url: 'https://oapi.dingtalk.com/robot/send?access_token=59f62a4b15f5fa9b7338ffaeacc5c199b537038ec79e57db681e48293cc6625d',
  secret: 'SEC6243e3cced1f46b53340f22603f10fca92389f5891de46530a61ac30bc2da5c6',
}

/**
 * 计算钉钉加签
 */
function calculateDingtalkSign(secret, timestamp) {
  // 签名字符串：timestamp + '\n' + secret
  const stringToSign = `${timestamp}\n${secret}`
  
  // 使用 Node.js crypto 模块计算 HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(stringToSign)
  
  // Base64 编码并 URL 编码
  const base64Signature = hmac.digest('base64')
  return encodeURIComponent(base64Signature)
}

/**
 * 发送钉钉消息
 */
async function sendDingtalkMessage(message) {
  const timestamp = Date.now()
  const sign = calculateDingtalkSign(DINGTALK_CONFIG.secret, timestamp)
  
  // 构建完整的 URL
  const url = new URL(DINGTALK_CONFIG.url)
  url.searchParams.set('timestamp', timestamp.toString())
  url.searchParams.set('sign', sign)
  
  const fullUrl = url.toString()
  
  // 构建消息体
  const payload = {
    msgtype: 'text',
    text: {
      content: message,
    },
    at: {
      isAtAll: false,
    },
  }
  
  console.log('='.repeat(60))
  console.log('钉钉通知测试')
  console.log('='.repeat(60))
  console.log('时间戳:', timestamp)
  console.log('签名:', sign)
  console.log('完整URL:', fullUrl)
  console.log('消息内容:', message)
  console.log('请求体:', JSON.stringify(payload, null, 2))
  console.log('='.repeat(60))
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    
    const responseText = await response.text()
    console.log('HTTP 状态码:', response.status)
    console.log('响应内容:', responseText)
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        if (data.errcode === 0) {
          console.log('✅ 消息发送成功！')
        } else {
          console.log('❌ 钉钉返回错误:')
          console.log('  错误代码:', data.errcode)
          console.log('  错误信息:', data.errmsg)
          
          // 常见错误码说明
          if (data.errcode === 310000) {
            console.log('  💡 提示: timestamp 无效或过期（时间差超过1小时）')
          } else if (data.errcode === 310001) {
            console.log('  💡 提示: sign 不匹配，加签算法可能有问题')
          } else if (data.errcode === 330101) {
            console.log('  💡 提示: 访问令牌无效或已过期')
          } else if (data.errcode === 310001) {
            console.log('  💡 提示: 加签签名不匹配')
          }
        }
      } catch (e) {
        console.log('⚠️ 响应不是有效的 JSON')
      }
    } else {
      console.log('❌ HTTP 请求失败')
    }
    
    return response.ok
  } catch (error) {
    console.error('❌ 发送消息时出错:', error.message)
    console.error('详细错误:', error)
    return false
  }
}

// 验证加签算法（与官方文档示例对比）
function verifySignature() {
  console.log('\n验证加签算法...')
  
  // 使用测试数据验证
  const testSecret = 'SEC6243e3cced1f46b53340f22603f10fca92389f5891de46530a61ac30bc2da5c6'
  const testTimestamp = 1234567890123 // 示例时间戳
  
  const sign = calculateDingtalkSign(testSecret, testTimestamp)
  console.log('测试时间戳:', testTimestamp)
  console.log('计算出的签名:', sign)
  console.log('签名字符串 (timestamp + \\n + secret):', `${testTimestamp}\n${testSecret}`)
  
  // 验证 HMAC 计算
  const stringToSign = `${testTimestamp}\n${testSecret}`
  const hmac = crypto.createHmac('sha256', testSecret)
  hmac.update(stringToSign)
  const expectedBase64 = hmac.digest('base64')
  console.log('预期 Base64:', expectedBase64)
  console.log('URL 编码后:', encodeURIComponent(expectedBase64))
}

// 主函数
async function main() {
  console.log('开始测试钉钉通知功能...\n')
  
  // 先验证加签算法
  verifySignature()
  
  console.log('\n')
  
  // 发送测试消息
  const testMessage = `🧪 测试消息

这是一条来自 UptimeFlare 的测试通知。

✅ 如果你收到这条消息，说明钉钉通知配置成功！
⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}`
  
  const success = await sendDingtalkMessage(testMessage)
  
  if (success) {
    console.log('\n✨ 测试完成！请检查钉钉群是否收到消息。')
  } else {
    console.log('\n❌ 测试失败！请检查上面的错误信息。')
    console.log('\n排查建议:')
    console.log('1. 检查 Webhook URL 和 Secret 是否正确')
    console.log('2. 确认钉钉机器人已启用且未被禁用')
    console.log('3. 检查网络连接是否正常')
    console.log('4. 查看上面的错误代码和提示信息')
  }
}

// 运行测试
main().catch(console.error)

