import { supabase } from './supabase'
import type { UserRole } from './supabase'

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

/**
 * 用户注册
 */
export async function signUp({ email, password, name, role }: SignUpData) {
  // 1. 创建认证用户
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

  // 2. 创建用户资料
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      name,
      role,
    })

  if (profileError) {
    throw new Error(`创建用户资料失败：${profileError.message}`)
  }

  return authData.user
}

/**
 * 用户登录
 */
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

/**
 * 用户登出
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * 获取当前用户资料
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
