import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withTimeout } from '@/lib/utils/timeout'
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')

  const clientId = getClientId(req as any)
  const rate = checkRateLimit(`export-status:${clientId}`, { limit: 30, windowMs: 60_000 })
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

  if (!taskId) {
    return NextResponse.json({ error: '缺少 taskId' }, { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未登录或凭证缺失' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: '未登录或凭证缺失' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser(), 10_000, 'Supabase 请求超时')
  if (!user) {
    return NextResponse.json({ error: '登录状态无效' }, { status: 401 })
  }

  const { data, error } = await withTimeout(
    supabase
      .from('export_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .maybeSingle(),
    10_000,
    'Supabase 请求超时'
  )

  if (error) {
    const status = error?.code === 'PGRST116' ? 404 : 500
    logger.error('[export-tasks/status] 查询失败', error || undefined, { userId: user.id, taskId })
    return NextResponse.json({ error: error?.message || '任务不存在' }, { status })
  }

  if (!data) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  const progress =
    typeof data.progress === 'number'
      ? Math.min(100, Math.max(0, data.progress))
      : data.status === 'COMPLETED'
        ? 100
        : data.status === 'FAILED'
          ? 100
          : 0

  const normalized = {
    ...data,
    progress,
    download_url: data.download_url || null,
    error_message: data.error_message || null,
  }

  return NextResponse.json({ task: normalized })
}
