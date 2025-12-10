import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withTimeout } from '@/lib/utils/timeout'
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const clientId = getClientId(req as any)
  const rate = checkRateLimit(`export-create:${clientId}`, { limit: 10, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
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

  const payload = await req.json().catch(() => null)
  const questionIds = Array.isArray(payload?.questionIds)
    ? payload.questionIds.map((id: any) => String(id)).filter(Boolean)
    : []
  if (!payload || !questionIds.length) {
    return NextResponse.json({ error: 'questionIds 不能为空' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error: userError,
  } = await withTimeout(supabase.auth.getUser(), 10_000, 'Supabase 请求超时')
  if (userError || !user) {
    return NextResponse.json({ error: '登录状态无效' }, { status: 401 })
  }

  const task = {
    user_id: user.id,
    template_id: payload.templateId || 'basket_default',
    question_ids: questionIds,
    options: payload.options || {},
    status: 'PENDING',
    progress: 5,
  }

  const { data, error } = await withTimeout(
    supabase.from('export_tasks').insert(task).select().single(),
    10_000,
    'Supabase 请求超时'
  )
  if (error) {
    logger.error('[export-tasks/create] 创建失败', error || undefined, { userId: user.id })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}
