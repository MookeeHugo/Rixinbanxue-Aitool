import { NextRequest, NextResponse } from 'next/server'
import { authenticateFromCookies } from '@/lib/server/auth'
import { deleteFile } from '@/lib/storage'
import { extractR2KeyFromUrl } from '@/lib/storage-utils'

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
    const user = await authenticateFromCookies()
    if (!user) {
      return NextResponse.json({ error: '未登录，无法删除文件' }, { status: 401 })
    }

    const payload = (await req.json().catch(() => ({}))) as DeletePayload
    const key = normalizeKey(payload)

    if (!key) {
      return NextResponse.json({ error: '缺少有效的文件标识' }, { status: 400 })
    }

    // 题库图片遵循 questions/{userId}/xxx 命名，仅允许所属教师或管理员删除
    if (key.startsWith('questions/') && !key.includes(user.id) && user.role !== 'teacher') {
      return NextResponse.json({ error: '无权删除该文件' }, { status: 403 })
    }

    await deleteFile(key)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[files/delete] 删除失败', error)
    return NextResponse.json({ error: '文件删除失败，请稍后再试' }, { status: 500 })
  }
}
