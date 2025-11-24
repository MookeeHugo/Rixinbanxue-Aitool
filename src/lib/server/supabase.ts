/**
 * 服务器端 Supabase 客户端
 * 用于 API 路由和服务器组件
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * 创建服务器端 Supabase 客户端
 * 使用 service_role 密钥，绕过 RLS（仅在服务器端使用！）
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 创建带用户上下文的服务器端客户端
 * 使用用户的访问令牌，遵守 RLS 策略
 */
export async function createAuthenticatedServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = cookies()

  // 尝试从 cookie 获取访问令牌
  const accessToken =
    cookieStore.get('sb-access-token')?.value ||
    cookieStore.get('supabase-auth-token')?.value

  if (!accessToken) {
    throw new Error('No authentication token found')
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  return client
}

/**
 * 获取 Supabase Admin 客户端（service role）
 * 用于需要完全权限的操作
 */
export function getSupabaseAdmin() {
  return createServerClient()
}
