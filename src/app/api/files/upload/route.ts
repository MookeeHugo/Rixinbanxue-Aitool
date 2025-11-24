import { NextRequest, NextResponse } from 'next/server'
import { authenticateFromCookies } from '@/lib/server/auth'
import { FileAccessLevel, uploadFile } from '@/lib/storage'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

function sanitizeFileName(fileName: string): string {
  const fallback = 'upload'
  const safeName = fileName?.trim() || fallback
  return safeName.replace(/[^\w.\-]/g, '_')
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateFromCookies()
    if (!user) {
      return NextResponse.json({ error: '未登录，无法上传文件' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '缺少文件数据' }, { status: 400 })
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不合法（需小于 2MB）' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json({ error: '暂不支持该文件类型' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const prefix = (formData.get('prefix') as string | null)?.replace(/^\/*/, '') || 'questions'
    const fileName = sanitizeFileName((file as File).name || `image-${Date.now()}.png`)
    const folder = `${prefix}/${user.id}`
    const key = `${folder}/${Date.now()}-${fileName}`

    const accessFlag = String(formData.get('access') || 'public').toLowerCase()
    const accessLevel = accessFlag === 'private' ? FileAccessLevel.PRIVATE : FileAccessLevel.PUBLIC

    const result = await uploadFile({
      file: buffer,
      key,
      accessLevel,
      contentType,
    })

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
    console.error('[files/upload] 上传失败', error)
    return NextResponse.json({ error: '文件上传失败，请稍后再试' }, { status: 500 })
  }
}
