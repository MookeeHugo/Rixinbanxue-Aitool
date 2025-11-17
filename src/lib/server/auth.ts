import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase'

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
 * 从请求中验证用户身份并返回用户信息
 * @param req Next.js 请求对象
 * @returns 认证的用户信息，如果未认证返回 null
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // 从请求头中获取 Authorization token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀
    const admin = getSupabaseAdmin()

    // 验证 JWT token
    const { data: { user }, error } = await admin.auth.getUser(token)

    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }

    // 获取用户资料（包括角色信息）
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      role: (profile as any).role as UserRole,
      name: (profile as any).name
    }
  } catch (error) {
    console.error('Authentication failed:', error)
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
