import crypto from 'crypto'

/**
 * 验证LiveKit Webhook签名
 * LiveKit使用API Secret作为密钥，通过HMAC-SHA256计算签名
 * @param payload Webhook原始payload（字符串）
 * @param signature 请求头中的签名
 * @param secret API Secret
 * @returns 签名是否有效
 */
export function verifyLiveKitWebhook(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    console.warn('LiveKit webhook: Missing signature header')
    return false
  }

  try {
    // LiveKit webhook签名格式通常是 "sha256=<hash>"
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // 使用时间安全的比较函数防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('LiveKit webhook verification error:', error)
    return false
  }
}

/**
 * 验证ZEGO Webhook签名
 * ZEGO使用AppSign作为密钥，签名算法取决于配置
 * @param payload Webhook原始payload（字符串）
 * @param signature 请求头中的签名（通常在X-Signature）
 * @param timestamp 时间戳（防重放攻击）
 * @param secret ZEGO AppSign
 * @returns 签名是否有效
 */
export function verifyZegoWebhook(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): boolean {
  if (!signature || !timestamp) {
    console.warn('ZEGO webhook: Missing signature or timestamp header')
    return false
  }

  try {
    // 检查时间戳，防止重放攻击（允许5分钟误差）
    const now = Date.now()
    const requestTime = parseInt(timestamp, 10) * 1000 // ZEGO时间戳通常是秒
    const timeDiff = Math.abs(now - requestTime)

    if (timeDiff > 5 * 60 * 1000) {
      console.warn('ZEGO webhook: Request timestamp too old or in future', {
        now,
        requestTime,
        diff: timeDiff
      })
      return false
    }

    // ZEGO签名算法：HMAC-SHA256(timestamp + payload, secret)
    const message = timestamp + payload
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex')

    // 使用时间安全的比较函数
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('ZEGO webhook verification error:', error)
    return false
  }
}

/**
 * 验证Webhook请求的通用nonce，防止重放攻击
 * 注意：这需要配合Redis等存储实现nonce去重
 * @param nonce 请求中的唯一标识
 * @param ttlSeconds nonce有效期（秒）
 * @returns nonce是否有效
 */
export async function verifyWebhookNonce(
  nonce: string | null,
  ttlSeconds: number = 300
): Promise<boolean> {
  if (!nonce) {
    return false
  }

  // TODO: 在生产环境中，这里应该使用Redis检查nonce是否已被使用
  // 示例实现：
  // const exists = await redis.exists(`webhook:nonce:${nonce}`)
  // if (exists) return false
  // await redis.setex(`webhook:nonce:${nonce}`, ttlSeconds, '1')
  // return true

  console.warn('Nonce verification not implemented - using placeholder')
  return true // 暂时返回true，待Redis集成后完善
}
