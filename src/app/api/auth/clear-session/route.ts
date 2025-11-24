import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const COOKIE_KEYS = ['sb-127-auth-token', 'sb-Rixindemo-codex-m1-auth-token', 'sb-auth-token']

export async function POST() {
  try {
    const cookieStore = cookies()
    for (const key of COOKIE_KEYS) {
      cookieStore.delete(key)
    }

    return NextResponse.json({
      ok: true,
      cleared: COOKIE_KEYS,
    })
  } catch (error) {
    logger.error('[clear-session] 清除失败', { error })
    return NextResponse.json(
      {
        error: '清除 session 失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
