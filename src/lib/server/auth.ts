import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase'
import { logger } from '@/lib/logger'
// 延迟初始化 Supabase 客户端，避免构建时错误
let supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseAdmin
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  name: string
}

/**
 * 从cookies中获取access token
 * @returns access token，如果未找到返回 null
 */
export function getAccessTokenFromCookies(): string | null {
  try {
    const cookieStore = cookies()

    // 尝试从多种格式的 cookie 中获取 auth token
    const authToken =
      cookieStore.get('sb-auth-token')?.value ||
      cookieStore.get('sb-127-auth-token')?.value ||
      cookieStore.get('sb-Rixindemo-codex-m1-auth-token')?.value

    if (!authToken) {
      return null
    }

    // 解析 auth token（URL 编码的 JSON）
    let session
    try {
      const decodedToken = decodeURIComponent(authToken)
      session = JSON.parse(decodedToken)
    } catch (err) {
      logger.error('[getAccessTokenFromCookies] Token parse error:', { error: err })
      return null
    }

    return session.access_token || null
  } catch (error) {
    logger.error('[getAccessTokenFromCookies] Error:', { error: error })
    return null
  }
}

/**
 * 创建带有当前用户认证的Supabase客户端
 * @returns 带认证的Supabase客户端，如果未登录返回 null
 */
export function createAuthenticatedSupabaseClient() {
  const accessToken = getAccessTokenFromCookies()
  if (!accessToken) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

/**
 * 从cookies中验证用户身份并返回用户信息
 * @returns 认证的用户信息，如果未认证返回 null
 */
export async function authenticateFromCookies(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies()

    // 尝试从多种格式的 cookie 中获取 auth token
    const authToken =
      cookieStore.get('sb-auth-token')?.value ||
      cookieStore.get('sb-127-auth-token')?.value ||
      cookieStore.get('sb-Rixindemo-codex-m1-auth-token')?.value

    if (!authToken) {
      return null
    }

    // 解析 auth token（URL 编码的 JSON）
    let session
    try {
      const decodedToken = decodeURIComponent(authToken)
      session = JSON.parse(decodedToken)
    } catch (err) {
      logger.error('[authenticateFromCookies] Token parse error:', { error: err })
      return null
    }

    if (!session.access_token) {
      console.error('[authenticateFromCookies] No access_token in session')
      return null
    }

    // 使用 Supabase API 验证 token（安全的方式）
    const admin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await admin.auth.getUser(session.access_token)

    if (authError || !user) {
      logger.error('[authenticateFromCookies] Token verification failed:', { error: authError })
      return null
    }

    const userId = user.id
    const email = user.email

    // 使用 anon key + access token 进行认证（与 /api/profile 相同的方式）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    })

    // 获取用户资料（包括角色信息）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      logger.error('[authenticateFromCookies] Profile error:', { error: profileError })
      return null
    }

    if (!email) {
      console.error('[authenticateFromCookies] No email available')
      return null
    }

    return {
      id: userId,
      email: email,
      role: (profile as any).role as UserRole,
      name: (profile as any).name
    }
  } catch (error) {
    logger.error('[authenticateFromCookies] Authentication failed:', { error: error })
    return null
  }
}

/**
 * 从请求中验证用户身份并返回用户信息
 * 优先从cookies读取，然后尝试从Authorization header读取
 * @param req Next.js 请求对象
 * @returns 认证的用户信息，如果未认证返回 null
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // 先尝试从cookies读取（适用于客户端fetch请求）
    const userFromCookies = await authenticateFromCookies()
    if (userFromCookies) {
      return userFromCookies
    }

    // 如果cookies中没有，尝试从请求头中获取 Authorization token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀
    const admin = getSupabaseAdmin()

    // 验证 JWT token
    const { data: { user }, error } = await admin.auth.getUser(token)

    if (error || !user) {
      logger.error('Auth error:', { error: error })
      return null
    }

    // 获取用户资料（包括角色信息）
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      logger.error('Profile error:', { error: profileError })
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      role: (profile as any).role as UserRole,
      name: (profile as any).name
    }
  } catch (error) {
    logger.error('Authentication failed:', { error: error })
    return null
  }
}

/**
 * 要求用户必须是教师角色
 * @param user 认证的用户
 * @returns 如果是教师返回 true，否则返回 false
 */
export function requireTeacher(user: AuthenticatedUser | null): boolean {
  return user?.role === 'teacher'
}

/**
 * 要求用户必须是学生角色
 * @param user 认证的用户
 * @returns 如果是学生返回 true，否则返回 false
 */
export function requireStudent(user: AuthenticatedUser | null): boolean {
  return user?.role === 'student'
}

/**
 * 要求用户已登录（任何角色）
 * @param user 认证的用户
 * @returns 如果已登录返回 true，否则返回 false
 */
export function requireAuth(user: AuthenticatedUser | null): boolean {
  return user !== null
}
