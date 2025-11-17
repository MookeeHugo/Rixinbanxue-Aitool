#!/usr/bin/env node
/**
 * 创建 Playwright E2E 测试专用账号
 * 使用 Supabase Auth API 正确创建测试账号
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const testUsers = [
  {
    email: 'playwright-teacher@test.com',
    password: 'Playwright123!',
    name: 'Playwright教师',
    role: 'teacher'
  },
  {
    email: 'playwright-student@test.com',
    password: 'Playwright123!',
    name: 'Playwright学生',
    role: 'student'
  }
]

async function createTestUser(user) {
  console.log(`\n创建账号: ${user.email}`)

  // 尝试注册
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
    options: {
      data: {
        name: user.name,
        role: user.role
      }
    }
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log(`✓ 账号已存在: ${user.email}`)

      // 账号已存在，更新 profile
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      })

      if (signInError) {
        console.error(`✗ 登录失败: ${signInError.message}`)
        return false
      }

      // 更新 profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: user.name, role: user.role })
        .eq('email', user.email)

      if (profileError) {
        console.error(`✗ 更新 profile 失败: ${profileError.message}`)
      } else {
        console.log(`✓ Profile 已更新`)
      }

      await supabase.auth.signOut()
      return true
    } else {
      console.error(`✗ 注册失败: ${authError.message}`)
      return false
    }
  }

  if (!authData.user) {
    console.error(`✗ 注册失败: 未返回用户数据`)
    return false
  }

  console.log(`✓ 账号创建成功: ${user.email}`)

  // 注册后需要登出
  await supabase.auth.signOut()

  return true
}

async function main() {
  console.log('======================================')
  console.log('创建 Playwright E2E 测试专用账号')
  console.log('======================================')
  console.log(`Supabase URL: ${SUPABASE_URL}`)

  let successCount = 0

  for (const user of testUsers) {
    const success = await createTestUser(user)
    if (success) successCount++
  }

  console.log('\n======================================')
  console.log(`完成: ${successCount}/${testUsers.length} 个账号`)
  console.log('======================================')
  console.log('教师账号: playwright-teacher@test.com / Playwright123!')
  console.log('学生账号: playwright-student@test.com / Playwright123!')
  console.log('======================================')

  if (successCount < testUsers.length) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('创建测试账号时出错:', err)
  process.exit(1)
})
