#!/usr/bin/env node
/**
 * 验证测试账号是否能正常登录
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const testAccounts = [
  {
    email: 'playwright-teacher@test.com',
    password: 'Playwright123!',
    expectedRole: 'teacher'
  },
  {
    email: 'playwright-student@test.com',
    password: 'Playwright123!',
    expectedRole: 'student'
  }
]

async function verifyLogin(account) {
  console.log(`\n测试登录: ${account.email}`)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })

    if (error) {
      console.error(`  ✗ 登录失败: ${error.message}`)
      return false
    }

    if (!data.user) {
      console.error(`  ✗ 登录失败: 未返回用户数据`)
      return false
    }

    console.log(`  ✓ 登录成功`)
    console.log(`    User ID: ${data.user.id}`)
    console.log(`    Email: ${data.user.email}`)

    // 检查 profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error(`  ✗ 获取 profile 失败: ${profileError.message}`)
      await supabase.auth.signOut()
      return false
    }

    if (!profile) {
      console.error(`  ✗ Profile 不存在`)
      await supabase.auth.signOut()
      return false
    }

    console.log(`    Profile: ${profile.name} (${profile.role})`)

    if (profile.role !== account.expectedRole) {
      console.error(`  ✗ 角色不匹配: 期望 ${account.expectedRole}, 实际 ${profile.role}`)
      await supabase.auth.signOut()
      return false
    }

    console.log(`  ✓ 验证通过`)
    await supabase.auth.signOut()
    return true
  } catch (err) {
    console.error(`  ✗ 异常:`, err.message)
    return false
  }
}

async function main() {
  console.log('======================================')
  console.log('验证 Playwright 测试账号')
  console.log('======================================')
  console.log(`Supabase URL: ${SUPABASE_URL}`)

  let successCount = 0

  for (const account of testAccounts) {
    const success = await verifyLogin(account)
    if (success) successCount++
  }

  console.log('\n======================================')
  console.log(`结果: ${successCount}/${testAccounts.length} 个账号可用`)
  console.log('======================================')

  if (successCount < testAccounts.length) {
    console.log('\n需要创建或修复测试账号，请运行:')
    console.log('  node scripts/create-test-users.mjs')
    process.exit(1)
  } else {
    console.log('\n✓ 所有测试账号正常')
  }
}

main().catch(err => {
  console.error('验证测试账号时出错:', err)
  process.exit(1)
})
