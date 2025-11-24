import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  // 触发 session 刷新，从而在响应头写入最新 cookie
  await supabase.auth.getSession()
  await supabase.auth.refreshSession()
  return res
}

// 跳过静态资源
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
