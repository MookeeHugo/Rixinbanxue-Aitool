/**
 * 文件上传 API 路由
 * 安全地处理文件上传，不暴露存储凭证给客户端
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, FileAccessLevel } from '@/lib/storage'
import { authenticateFromCookies } from '@/lib/server/auth'
import { logger } from '@/lib/logger'
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await authenticateFromCookies()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取表单数据
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const accessLevel = (formData.get('access_level') as FileAccessLevel) || FileAccessLevel.PUBLIC
    const prefix = (formData.get('prefix') as string) || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 文件大小限制（10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // 允许的文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // 转换 File 为 Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 构建文件路径
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${prefix}/${user.id}/${timestamp}.${fileExtension}`

    // 上传文件
    const result = await uploadFile({
      file: buffer,
      key: fileName,
      accessLevel,
      contentType: file.type
    })

    logger.info('File uploaded successfully', {
      userId: user.id,
      fileName,
      fileSize: file.size,
      fileType: file.type,
    })

    return NextResponse.json({
      success: true,
      url: result.publicUrl || result.cdnUrl || null,
      key: result.key,
    })
  } catch (error) {
    logger.error('File upload failed', { error })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
