import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * 为 Promise 添加超时保护
 * @param promise - 要执行的 Promise
 * @param ms - 超时时间（毫秒）
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`操作超时 (${ms}ms)`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    // 5秒超时保护 - 防止 Supabase 无响应时阻塞整个应用
    await withTimeout(supabase.auth.getSession(), 5000)
  } catch (error) {
    // 超时或错误时继续处理请求，不阻塞应用
    console.error('[middleware] Session check failed:', error instanceof Error ? error.message : String(error))
  }

  // 注意：移除了 refreshSession() - token 刷新由客户端 Supabase SDK 自动处理
  return res
}

// 跳过静态资源
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
