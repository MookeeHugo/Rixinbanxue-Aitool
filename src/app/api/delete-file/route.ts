/**
 * 文件删除 API 路由
 * 安全地处理文件删除，验证权限
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteFile } from '@/lib/storage'
import { authenticateFromCookies } from '@/lib/server/auth'
import { logger } from '@/lib/logger'
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await authenticateFromCookies()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取请求体
    const body = await request.json()
    const { key } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Invalid file key' }, { status: 400 })
    }

    // 验证文件所有权（基于路径）
    // 格式：uploads/{userId}/{timestamp}.{ext}
    const pathParts = key.split('/')
    if (pathParts.length >= 2) {
      const fileUserId = pathParts[1]
      if (fileUserId !== user.id && user.role !== 'teacher') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    }

    // 删除文件
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
