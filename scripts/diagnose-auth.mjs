#!/usr/bin/env node

/**
 * 认证诊断工具
 * 帮助排查Supabase认证和RLS问题
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

console.log('🔍 Supabase 认证诊断工具\n')
console.log(`Supabase URL: ${SUPABASE_URL}`)
console.log(`Anon Key: ${SUPABASE_ANON_KEY.slice(0, 20)}...\n`)

async function testLogin(email, password) {
  console.log(`\n===== 测试登录: ${email} =====\n`)

  try {
    // 1. 登录
    console.log('1️⃣ 正在登录...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('❌ 登录失败:', signInError.message)
      return
    }

    console.log('✅ 登录成功!')
    console.log(`   User ID: ${signInData.user?.id}`)
    console.log(`   Email: ${signInData.user?.email}`)
    console.log(`   Access Token (前30字符): ${signInData.session?.access_token?.slice(0, 30)}...`)

    // 2. 获取当前session
    console.log('\n2️⃣ 获取当前session...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('❌ 获取session失败:', sessionError.message)
    } else {
      console.log('✅ Session有效')
      console.log(`   User ID: ${sessionData.session?.user?.id}`)
    }

    // 3. 测试查询classes（有RLS保护）
    console.log('\n3️⃣ 测试查询classes表（有RLS保护）...')
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', signInData.user?.id)

    if (classesError) {
      console.error('❌ 查询classes失败:', classesError.message)
      console.error('   错误详情:', JSON.stringify(classesError, null, 2))
    } else {
      console.log(`✅ 查询classes成功，找到 ${classesData?.length || 0} 条记录`)
      if (classesData && classesData.length > 0) {
        console.log('   班级列表:')
        classesData.forEach(cls => {
          console.log(`   - ${cls.name} (ID: ${cls.id})`)
        })
      }
    }

    // 4. 测试查询profiles
    console.log('\n4️⃣ 测试查询profiles表...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user?.id)
      .single()

    if (profileError) {
      console.error('❌ 查询profile失败:', profileError.message)
    } else {
      console.log('✅ 查询profile成功')
      console.log(`   姓名: ${profileData?.name}`)
      console.log(`   角色: ${profileData?.role}`)
    }

    // 5. 测试直接REST API调用（模拟浏览器行为）
    console.log('\n5️⃣ 测试直接REST API调用（带认证头）...')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/classes?teacher_id=eq.${signInData.user?.id}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${signInData.session?.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`❌ REST API调用失败: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('   响应:', errorText)
    } else {
      const data = await response.json()
      console.log(`✅ REST API调用成功，返回 ${data?.length || 0} 条记录`)
    }

    // 6. 测试不带认证头的REST API调用（这会失败）
    console.log('\n6️⃣ 测试不带认证头的REST API调用（预期失败）...')
    const noAuthResponse = await fetch(`${SUPABASE_URL}/rest/v1/classes?teacher_id=eq.${signInData.user?.id}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!noAuthResponse.ok) {
      console.error(`❌ 不带认证调用失败（预期行为）: ${noAuthResponse.status}`)
    } else {
      const data = await noAuthResponse.json()
      console.log(`⚠️ 不带认证调用成功（意外！），返回 ${data?.length || 0} 条记录`)
      console.log('   这可能表示RLS未正确配置')
    }

    // 登出
    await supabase.auth.signOut()

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
  }
}

// 测试teacher账号
await testLogin('teacher@test.com', 'test123456')

console.log('\n\n' + '='.repeat(60))
console.log('📊 诊断完成！')
console.log('='.repeat(60))
console.log('\n💡 提示：')
console.log('1. 如果步骤3失败（查询classes），说明RLS策略或session传递有问题')
console.log('2. 如果步骤5失败但步骤3成功，说明浏览器中的token没有正确传递')
console.log('3. 如果步骤6成功，说明RLS未正确启用')
console.log('\n')
