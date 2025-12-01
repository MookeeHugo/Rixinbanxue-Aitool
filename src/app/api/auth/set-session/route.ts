import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
type SessionPayload = {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SessionPayload
    const { access_token, refresh_token, expires_at } = body

    logger.debug('[set-session] 📥 接收 payload:', {
      hasAccess: !!access_token,
      hasRefresh: !!refresh_token,
      expires_at,
      expiresIn: expires_at ? Math.floor((expires_at * 1000 - Date.now()) / 60000) + ' 分钟' : 'N/A'
    })

    if (!access_token || !refresh_token || !expires_at) {
      console.error('[set-session] ❌ 缺少必要字段')
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
    }

    // 使用 Next.js cookies API（更可靠）
    const cookieStore = cookies()
    const sessionData = JSON.stringify({
      access_token,
      refresh_token,
      expires_at,
      token_type: 'bearer',
    })

    // 计算过期时间（使用 session 的 expires_at）
    const maxAge = Math.max(0, expires_at - Math.floor(Date.now() / 1000))

    // 设置多个格式的 cookie 以确保兼容性
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false, // 本地开发使用 http
      maxAge, // 使用 session 的有效期
    }

    // 方法 1：标准 Supabase cookie（基于 URL）
    cookieStore.set('sb-127-auth-token', sessionData, cookieOptions)
    logger.debug('[set-session] ✅ 设置 cookie: sb-127-auth-token')

    // 方法 2：项目特定 cookie（兼容性）
    cookieStore.set('sb-Rixindemo-codex-m1-auth-token', sessionData, cookieOptions)
    logger.debug('[set-session] ✅ 设置 cookie: sb-Rixindemo-codex-m1-auth-token')

    // 方法 3：通用 auth cookie（最大兼容性）
    cookieStore.set('sb-auth-token', sessionData, cookieOptions)
    logger.debug('[set-session] ✅ 设置 cookie: sb-auth-token')

    // 验证 cookie 是否设置成功
    const verifyToken = cookieStore.get('sb-127-auth-token')
    if (verifyToken) {
      logger.debug('[set-session] ✅ Cookie 设置成功，已验证')
    } else {
      console.warn('[set-session] ⚠️ Cookie 设置后无法读取，可能被拦截')
    }

    return NextResponse.json({
      ok: true,
      cookies_set: ['sb-127-auth-token', 'sb-Rixindemo-codex-m1-auth-token', 'sb-auth-token'],
      expires_in_seconds: maxAge
    })
  } catch (error) {
    const appError = error instanceof Error ? error : undefined
    logger.error('[set-session] ❌ 设置失败:', appError, { error })
    return NextResponse.json({
      error: '设置 session 失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
