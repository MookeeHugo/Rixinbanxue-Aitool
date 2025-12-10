import { NextRequest, NextResponse } from 'next/server'
import { authenticateFromCookies } from '@/lib/server/auth'
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit'
import { deleteFile } from '@/lib/storage'
import { extractR2KeyFromUrl } from '@/lib/storage-utils'
import { logger } from '@/lib/logger'

type DeletePayload = {
  key?: string
  url?: string
}

function normalizeKey(payload: DeletePayload): string {
  if (payload.key && typeof payload.key === 'string') {
    return payload.key.trim().replace(/^\/*/, '')
  }
  if (payload.url && typeof payload.url === 'string') {
    return extractR2KeyFromUrl(payload.url)
  }
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req)
    const rate = checkRateLimit(`files-delete:${clientId}`, { limit: 12, windowMs: 60_000 })
    if (!rate.ok) {
      return NextResponse.json(
        { error: '删除请求过于频繁，请稍后再试' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
      )
    }

    const user = await authenticateFromCookies()
    if (!user) {
      return NextResponse.json({ error: '未登录，无法删除文件' }, { status: 401 })
    }

    const payload = (await req.json().catch(() => ({}))) as DeletePayload
    const key = normalizeKey(payload)

    if (!key) {
      return NextResponse.json({ error: '缺少有效的文件标识' }, { status: 400 })
    }

    if (key.includes('..')) {
      return NextResponse.json({ error: '非法路径' }, { status: 400 })
    }

    if (key.startsWith('questions/')) {
      const [, ownerId] = key.split('/')
      if (ownerId && ownerId !== user.id && user.role !== 'teacher') {
        return NextResponse.json({ error: '无权删除该文件' }, { status: 403 })
      }
    }

    await deleteFile(key)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[files/delete] 删除失败', error instanceof Error ? error : undefined, { error })
    return NextResponse.json({ error: '文件删除失败，请稍后再试' }, { status: 500 })
  }
}
