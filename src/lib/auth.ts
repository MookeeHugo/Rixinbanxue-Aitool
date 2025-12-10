import { supabase } from './supabase'
import type { UserRole } from './supabase'
import { withSupabaseRetry } from './utils/timeout'

export interface SignUpData {
  email: string
  password: string
  name: string
  role: UserRole
}

export interface SignInData {
  email: string
  password: string
}

export async function signUp({ email, password, name, role }: SignUpData) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('注册失败：未返回用户信息')
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      name,
      role,
    })

  if (profileError) {
    throw new Error(`创建用户资料失败: ${profileError.message}`)
  }

  return authData.user
}

export async function signIn({ email, password }: SignInData) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

/**
 * 获取当前用户（带超时重试）
 */
export async function getCurrentUser() {
  const { data: { user } } = await withSupabaseRetry({
    factory: () => supabase.auth.getUser(),
    timeoutMs: 15000,
    retries: 2,
    backoffMs: 800,
  }) as any
  return user as any
}

/**
 * 获取当前用户资料；若超时视为未登录，避免首页阻塞
 */
export async function getCurrentProfile() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = (await withSupabaseRetry({
      factory: () =>
        Promise.resolve(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        ),
      timeoutMs: 15000,
      retries: 2,
      backoffMs: 800,
    })) as any

    if (error) {
      throw new Error(`获取用户资料失败: ${error.message}`)
    }

    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('请求超时') || message.toLowerCase().includes('timeout')) {
      return null
    }
    if (error instanceof Error) throw error
    throw new Error('获取用户资料时发生未知错误')
  }
}
