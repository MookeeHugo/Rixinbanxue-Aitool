import { NextRequest } from 'next/server'

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const realIp = forwarded.split(',')[0]?.trim()
  const fallback = (req as any).ip || req.headers.get('x-real-ip') || 'unknown'
  return realIp || String(fallback)
}

export function checkRateLimit(key: string, options: RateLimitOptions): { ok: boolean; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { ok: true, retryAfterMs: 0 }
  }

  if (existing.count >= options.limit) {
    return { ok: false, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { ok: true, retryAfterMs: 0 }
}

// 简单的周期性清理，防止内存泄漏
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) {
      buckets.delete(key)
    }
  }
}, 5 * 60 * 1000).unref()
