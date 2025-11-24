#!/usr/bin/env node
/**
 * 测试 /api/profile API 路由
 * 用于验证环境变量和 Supabase 连接
 */

import http from 'http'

const BASE_URL = 'http://localhost:3002'

console.log('🧪 测试 /api/profile API 路由...\n')

// 从环境变量获取测试用户 cookie（需要先登录获取）
const AUTH_COOKIE = process.env.TEST_AUTH_COOKIE || ''

if (!AUTH_COOKIE) {
  console.log('⚠️  警告: 未提供 TEST_AUTH_COOKIE 环境变量')
  console.log('   这个测试将返回 401，但可以验证服务器日志中的环境变量配置\n')
}

const options = {
  method: 'GET',
  headers: {
    'Cookie': AUTH_COOKIE ? `sb-auth-token=${AUTH_COOKIE}` : '',
    'User-Agent': 'test-script/1.0'
  }
}

const req = http.request(`${BASE_URL}/api/profile`, options, (res) => {
  console.log(`📊 状态码: ${res.statusCode}`)
  console.log(`📋 响应头:`, res.headers)

  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => {
    try {
      const data = JSON.parse(body)
      console.log('\n📦 响应数据:')
      console.log(JSON.stringify(data, null, 2))

      if (res.statusCode === 401) {
        console.log('\n✅ 预期的 401 响应（未登录）')
        console.log('💡 请检查服务器日志中的环境变量配置')
      } else if (res.statusCode === 200) {
        console.log('\n✅ API 调用成功！')
        console.log('💡 用户资料:', data.profile)
      } else {
        console.log(`\n❌ 意外的响应状态: ${res.statusCode}`)
      }
    } catch (err) {
      console.error('\n❌ 解析响应失败:', err.message)
      console.log('原始响应:', body)
    }
  })
})

req.on('error', (err) => {
  console.error('❌ 请求失败:', err.message)
  console.log('\n💡 请确保开发服务器正在运行: npm run dev:legacy')
})

req.end()
