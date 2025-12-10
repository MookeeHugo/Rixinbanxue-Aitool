/**
 * 文件删除 API 路由
 * - 校验用户权限
 * - 路径与速率控制
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateFromCookies } from '@/lib/server/auth'
import { deleteFile } from '@/lib/storage'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    const rate = checkRateLimit(`delete-file:${clientId}`, { limit: 12, windowMs: 60_000 })
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

    const body = await request.json()
    const { key } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: '缺少文件 key' }, { status: 400 })
    }

    if (key.includes('..')) {
      return NextResponse.json({ error: '非法路径' }, { status: 400 })
    }

    // 格式：uploads/{userId}/{timestamp}.{ext}
    const pathParts = key.split('/')
    if (pathParts.length >= 2) {
      const fileUserId = pathParts[1]
      if (fileUserId !== user.id && user.role !== 'teacher') {
        return NextResponse.json({ error: '无权删除该文件' }, { status: 403 })
      }
    }

    await deleteFile(key)

    logger.info('File deleted successfully', {
      userId: user.id,
      fileKey: key,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : undefined
    logger.error('File deletion failed', appError, { error })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deletion failed' },
      { status: 500 }
    )
  }
}
