#!/usr/bin/env node

/**
 * 测试 /api/auth/set-session API
 * 验证 cookie 是否正确设置
 */

const BASE_URL = 'http://localhost:3002'

async function testSetSession() {
  console.log('🧪 测试 /api/auth/set-session API\n')

  // 模拟 session 数据
  const mockSession = {
    access_token: 'mock_access_token_' + Date.now(),
    refresh_token: 'mock_refresh_token_' + Date.now(),
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
  }

  console.log('📤 发送请求...')
  console.log('Payload:', {
    hasAccess: !!mockSession.access_token,
    hasRefresh: !!mockSession.refresh_token,
    expires_at: new Date(mockSession.expires_at * 1000).toISOString(),
  })

  try {
    const response = await fetch(`${BASE_URL}/api/auth/set-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockSession),
    })

    console.log('\n📥 响应状态:', response.status, response.statusText)

    // 检查响应头中的 Set-Cookie
    const setCookieHeaders = response.headers.getSetCookie?.() || []
    console.log('\n🍪 Set-Cookie 响应头数量:', setCookieHeaders.length)

    if (setCookieHeaders.length > 0) {
      console.log('✅ 发现 Set-Cookie 响应头:')
      setCookieHeaders.forEach((cookie, index) => {
        console.log(`  ${index + 1}. ${cookie.substring(0, 100)}...`)
      })
    } else {
      console.log('⚠️ 未发现 Set-Cookie 响应头')
    }

    // 读取响应 body
    const data = await response.json()
    console.log('\n📄 响应 body:', JSON.stringify(data, null, 2))

    if (response.ok && data.ok) {
      console.log('\n✅ API 调用成功')
      if (data.cookies_set && data.cookies_set.length > 0) {
        console.log('✅ 设置的 cookies:', data.cookies_set.join(', '))
      }
      return true
    } else {
      console.log('\n❌ API 调用失败')
      if (data.error) {
        console.log('错误信息:', data.error)
        if (data.details) {
          console.log('详细信息:', data.details)
        }
      }
      return false
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
    console.log('\n提示：请确保开发服务器正在运行（npm run dev）')
    return false
  }
}

// 运行测试
console.log('=' .repeat(60))
testSetSession().then(success => {
  console.log('=' .repeat(60))
  process.exit(success ? 0 : 1)
})
