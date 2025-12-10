import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { authenticateFromCookies } from '@/lib/server/auth'
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit'
import { FileAccessLevel, getMimeType, uploadFile } from '@/lib/storage'
import { withTimeout } from '@/lib/utils/timeout'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_PREFIXES = ['questions', 'assignments', 'exports', 'avatars', 'public', 'uploads', 'papers', 'member-data']
const UPLOAD_TOKEN = process.env.FILE_UPLOAD_TOKEN || ''

function sanitizeFileName(fileName: string): string {
  const fallback = 'upload'
  const safeName = fileName?.trim() || fallback
  return safeName.replace(/[^\w.\-]/g, '_')
}

function isPrefixAllowed(prefix: string): boolean {
  return ALLOWED_PREFIXES.some(allowed => prefix === allowed || prefix.startsWith(`${allowed}/`))
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  try {
    return crypto.timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

function isUploadTokenValid(token: string | null): boolean {
  if (!UPLOAD_TOKEN) return true
  if (!token) return false
  return timingSafeEqual(token, UPLOAD_TOKEN)
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req)
    const rate = checkRateLimit(`files-upload:${clientId}`, { limit: 8, windowMs: 60_000 })
    if (!rate.ok) {
      return NextResponse.json(
        { error: '上传过于频繁，请稍后再试' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
      )
    }

    const user = await authenticateFromCookies()
    if (!user) {
      return NextResponse.json({ error: '未登录，无法上传文件' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '缺少文件数据' }, { status: 400 })
    }

    const tokenFromRequest = (formData.get('token') as string | null) || req.headers.get('x-upload-token')
    if (!isUploadTokenValid(tokenFromRequest)) {
      return NextResponse.json({ error: '签名校验失败' }, { status: 403 })
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不合法（需小于 2MB）' }, { status: 400 })
    }

    const originalFileName = sanitizeFileName((file as File).name || `image-${Date.now()}.png`)
    const prefix = (formData.get('prefix') as string | null)?.replace(/^\/*/, '') || 'questions'
    if (prefix.includes('..') || !isPrefixAllowed(prefix)) {
      return NextResponse.json({ error: '非法上传路径' }, { status: 400 })
    }

    const contentType = file.type || getMimeType(originalFileName)
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json({ error: '暂不支持该文件类型' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const folder = `${prefix}/${user.id}`
    const key = `${folder}/${Date.now()}-${originalFileName}`

    const accessFlag = String(formData.get('access') || 'public').toLowerCase()
    const accessLevel = accessFlag === 'private' ? FileAccessLevel.PRIVATE : FileAccessLevel.PUBLIC

    const result = await withTimeout(
      uploadFile({
        file: buffer,
        key,
        accessLevel,
        contentType,
      }),
      15_000,
      '文件存储超时'
    )

    if (!result.success) {
      logger.error('[files/upload] 存储失败', { key, error: result.error })
      return NextResponse.json({ error: result.error || '文件上传失败，请稍后再试' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        key: result.key,
        publicUrl: result.publicUrl || null,
        cdnUrl: result.cdnUrl || null,
        needsSignedUrl: result.needsSignedUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('[files/upload] 上传失败', error instanceof Error ? error : undefined, { error })
    return NextResponse.json({ error: '文件上传失败，请稍后再试' }, { status: 500 })
  }
}
