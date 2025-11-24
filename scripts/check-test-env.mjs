#!/usr/bin/env node

/**
 * 检查 E2E 测试环境是否就绪
 * - Dev 服务器 (http://localhost:3002)
 * - Supabase (http://127.0.0.1:54321)
 */

const DEV_SERVER_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002'
const SUPABASE_URL = 'http://127.0.0.1:54321'

console.log('🔍 检查 E2E 测试环境...\n')

let allPassed = true

/**
 * 检查 Dev 服务器
 */
async function checkDevServer() {
  try {
    const response = await fetch(DEV_SERVER_URL)
    if (response.ok || response.status === 404) {
      console.log(`✅ Dev 服务器正在运行: ${DEV_SERVER_URL}`)
      return true
    } else {
      console.error(`❌ Dev 服务器响应异常: ${response.status} ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Dev 服务器未运行: ${DEV_SERVER_URL}`)
    console.log(`   请运行: npm run dev`)
    return false
  }
}

/**
 * 检查 Supabase
 */
async function checkSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`)
    if (response.status === 401 || response.status === 200) {
      // 401 = 需要认证，但服务正在运行
      console.log(`✅ Supabase 正在运行: ${SUPABASE_URL}`)
      return true
    } else {
      console.error(`❌ Supabase 响应异常: ${response.status} ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Supabase 未运行: ${SUPABASE_URL}`)
    console.log(`   请运行: npx supabase start`)
    return false
  }
}

/**
 * 检查测试账号配置
 */
function checkTestAccounts() {
  const teacherEmail = process.env.PLAYWRIGHT_TEACHER_EMAIL || 'playwright-teacher@test.com'
  const studentEmail = process.env.PLAYWRIGHT_STUDENT_EMAIL || 'playwright-student@test.com'

  console.log(`✅ 测试账号配置:`)
  console.log(`   教师: ${teacherEmail}`)
  console.log(`   学生: ${studentEmail}`)
  return true
}

/**
 * 主函数
 */
async function main() {
  const devOk = await checkDevServer()
  const supabaseOk = await checkSupabase()
  const accountsOk = checkTestAccounts()

  console.log('')

  if (!devOk || !supabaseOk || !accountsOk) {
    console.log('❌ 环境检查失败，请修复以上问题后再运行测试\n')
    process.exit(1)
  }

  console.log('✅ 所有检查通过，测试环境就绪！\n')
  process.exit(0)
}

main()
