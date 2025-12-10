import crypto from 'crypto'
import { logger } from '@/lib/logger'

type Provider = 'livekit' | 'zego' | string

const replayCache = new Map<string, number>()

function isTimingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  try {
    return crypto.timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

export function detectWebhookReplay(provider: Provider, fingerprint: string, ttlMs: number): boolean {
  const key = `${provider}:${fingerprint}`
  const now = Date.now()
  const expiresAt = replayCache.get(key)
  if (expiresAt && expiresAt > now) {
    return true
  }
  replayCache.set(key, now + ttlMs)
  return false
}

setInterval(() => {
  const now = Date.now()
  for (const [key, expiresAt] of replayCache.entries()) {
    if (expiresAt < now) {
      replayCache.delete(key)
    }
  }
}, 10 * 60 * 1000).unref()

/**
 * 验证 LiveKit Webhook 签名
 * LiveKit 使用 API Secret 作为密钥，通过 HMAC-SHA256 计算签名
 */
export function verifyLiveKitWebhook(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    logger.warn('LiveKit webhook: Missing signature header')
    return false
  }

  try {
    // LiveKit webhook 签名格式通常是 "sha256=<hash>"
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return isTimingSafeEqual(signature, expectedSignature)
  } catch (error) {
    logger.error('LiveKit webhook verification error:', { error: error })
    return false
  }
}

/**
 * 验证 ZEGO Webhook 签名
 * ZEGO 使用 AppSign 作为密钥，签名算法取决于配置
 */
export function verifyZegoWebhook(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): boolean {
  if (!signature || !timestamp) {
    logger.warn('ZEGO webhook: Missing signature or timestamp header')
    return false
  }

  try {
    // 检查时间戳，防止重放攻击（允许 5 分钟误差）
    const now = Date.now()
    const requestTime = parseInt(timestamp, 10) * 1000 // ZEGO 时间戳通常是秒
    const timeDiff = Math.abs(now - requestTime)

    if (timeDiff > 5 * 60 * 1000) {
      logger.warn('ZEGO webhook: Request timestamp too old or in future', {
        now,
        requestTime,
        diff: timeDiff
      })
      return false
    }

    // ZEGO 签名算法：HMAC-SHA256(timestamp + payload, secret)
    const message = timestamp + payload
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex')

    return isTimingSafeEqual(signature, expectedSignature)
  } catch (error) {
    logger.error('ZEGO webhook verification error:', { error: error })
    return false
  }
}

/**
 * 验证 Webhook 请求的通用 nonce，防止重放攻击
 * 说明：目前使用内存级缓存；生产环境建议换成 Redis 等持久化存储
 */
export async function verifyWebhookNonce(
  nonce: string | null,
  ttlSeconds: number = 300
): Promise<boolean> {
  if (!nonce) {
    return false
  }

  const isReplay = detectWebhookReplay('nonce', nonce, ttlSeconds * 1000)
  if (isReplay) return false
  return true
}
