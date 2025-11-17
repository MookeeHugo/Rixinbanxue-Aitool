import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'
import { extractR2KeyFromUrl } from '@/lib/storage-utils'

interface DeletePayload {
  questionId?: string
  hard?: boolean
  deleteAssets?: boolean
  imageUrls?: string[]
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: '缺少 Supabase 配置' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未登录或凭证缺失' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: '未登录或凭证缺失' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => ({}))) as DeletePayload
  const questionId = payload.questionId
  const hardDeleteRequested = Boolean(payload.hard)
  const deleteAssets = payload.deleteAssets ?? hardDeleteRequested

  if (!questionId) {
    return NextResponse.json({ error: '缺少 questionId' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: '登录状态无效' }, { status: 401 })
  }

  const { data: question, error: fetchError } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (fetchError || !question) {
    const status = fetchError?.code === 'PGRST116' ? 404 : 403
    return NextResponse.json({ error: '题目不存在或无权访问' }, { status })
  }

  const ownerCandidates = [
    (question as any).created_by,
    (question as any).owner_id,
    (question as any).teacher_id,
  ].filter(Boolean)

  if (ownerCandidates.length && !ownerCandidates.includes(user.id)) {
    return NextResponse.json({ error: '无权删除该题目' }, { status: 403 })
  }

  let finalMode: 'soft' | 'hard' = hardDeleteRequested ? 'hard' : 'soft'

  if (!hardDeleteRequested) {
    const updates: Record<string, any> = {}
    if ('is_deleted' in question) updates.is_deleted = true
    if ('is_public' in question) updates.is_public = false
    if ('status' in question) updates.status = 'deleted'
    if ('deleted_at' in question) updates.deleted_at = new Date().toISOString()
    if ('deleted_by' in question) updates.deleted_by = user.id
    if ('archived_at' in question) updates.archived_at = new Date().toISOString()

    if (Object.keys(updates).length === 0) {
      finalMode = 'hard'
    } else {
      const { error: updateError } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', questionId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }
  }

  if (finalMode === 'hard') {
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
  }

  const assetCandidates: string[] = []
  if (Array.isArray(payload.imageUrls)) {
    assetCandidates.push(...payload.imageUrls)
  }
  if ((question as any).image_key) {
    assetCandidates.push((question as any).image_key as string)
  }
  if ((question as any).image_url) {
    assetCandidates.push((question as any).image_url as string)
  }
  if (Array.isArray((question as any).asset_urls)) {
    assetCandidates.push(...((question as any).asset_urls as string[]))
  }

  if ((deleteAssets || finalMode === 'hard') && assetCandidates.length) {
    const uniqueKeys = Array.from(
      new Set(
        assetCandidates
          .map((url) => extractR2KeyFromUrl(url))
          .filter((key): key is string => Boolean(key))
      )
    )

    await Promise.all(
      uniqueKeys.map((key) =>
        deleteFile(key).catch((err) => {
          console.error('删除图片失败', err)
        })
      )
    )
  }

  return NextResponse.json({ ok: true, mode: finalMode, deleted: finalMode === 'hard' })
}
