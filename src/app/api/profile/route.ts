import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile
 * 获取当前用户的 profile 信息
 * 使用服务端 API 避免客户端 Supabase SDK 初始化超时
 */
export async function GET() {
  try {
    const cookieStore = cookies()

    // 尝试从多种格式的 cookie 中获取 auth token
    const authToken =
      cookieStore.get('sb-auth-token')?.value ||
      cookieStore.get('sb-127-auth-token')?.value ||
      cookieStore.get('sb-Rixindemo-codex-m1-auth-token')?.value

    if (!authToken) {
      return NextResponse.json(
        { error: '未登录', code: 'UNAUTHORIZED', debug: 'No auth token cookie found' },
        { status: 401 }
      )
    }

    // 解析 auth token（URL 编码的 JSON）
    let session
    try {
      const decodedToken = decodeURIComponent(authToken)
      session = JSON.parse(decodedToken)
    } catch (err) {
      logger.error('[API /profile] Token parse error:', { error: err })
      return NextResponse.json(
        { error: 'Auth token 格式错误', code: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }

    if (!session.access_token) {
      console.error('[API /profile] No access_token in session')
      return NextResponse.json(
        { error: 'Session 缺少 access_token', code: 'INVALID_SESSION' },
        { status: 401 }
      )
    }

    // 对于没有 user 对象的情况，尝试从 access_token 中解码获取 user_id
    let userId = session.user?.id
    if (!userId && session.access_token) {
      try {
        // JWT 格式: header.payload.signature
        const payload = session.access_token.split('.')[1]
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
        userId = decoded.sub
      } catch (err) {
        logger.error('[API /profile] Failed to decode JWT:', { error: err })
      }
    }

    if (!userId) {
      console.error('[API /profile] No user_id available')
      return NextResponse.json(
        { error: 'Session 无效', code: 'INVALID_SESSION' },
        { status: 401 }
      )
    }

    // 使用 Supabase 客户端查询 profile
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    })

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      logger.error('[API /profile] Supabase error:', { error: error })
      return NextResponse.json(
        { error: error.message, code: 'DATABASE_ERROR', details: error },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: '用户资料不存在', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 返回 profile 数据
    return NextResponse.json({ profile })
  } catch (error) {
    logger.error('[API /profile] Unexpected error:', { error: error })
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器错误',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}
