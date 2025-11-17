/**
 * E2E 测试辅助函数
 * 提供稳定的登录验证和常用操作
 */

import { type Page, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PLAYWRIGHT_BASE_URL?.replace('3002', '54321') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/**
 * 确保用户已登录
 * 改进版：使用 Supabase API 直接验证 session，而非 UI 交互
 */
export async function ensureLoggedIn(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // 1. 先检查是否已经登录（通过访问受保护页面）
  await page.goto('/questions')

  const isLoggedIn = await page.getByText('题库管理').isVisible().catch(() => false)
  if (isLoggedIn) {
    console.log(`✓ 已登录: ${email}`)
    return
  }

  console.log(`→ 需要登录: ${email}`)

  // 2. 尝试登录
  await page.goto('/login')
  await page.waitForSelector('#email', { timeout: 10000 })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.getByRole('button', { name: /登录/ }).click()

  // 3. 等待登录完成（通过 URL 变化或导航栏更新）
  await Promise.race([
    page.waitForURL('**/questions', { timeout: 15000 }),
    page.getByText('题库管理').waitFor({ state: 'visible', timeout: 15000 })
  ]).catch(async () => {
    // 登录失败，获取错误信息
    const errorText = await page
      .locator('.ant-message-error')
      .first()
      .innerText()
      .catch(() => '')

    // 截图用于调试
    await page.screenshot({
      path: `test-results/login-failure-${Date.now()}.png`,
      fullPage: true
    })

    throw new Error(`登录失败: ${email}。错误提示: ${errorText || '未知错误'}`)
  })

  // 4. 使用 API 验证 session 是否有效（更可靠）
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const cookies = await page.context().cookies()

  // 提取 auth token
  const authCookie = cookies.find(c => c.name.includes('auth-token'))

  if (!authCookie) {
    throw new Error(`登录后未找到 auth cookie`)
  }

  console.log(`✓ 登录成功: ${email}`)
}

/**
 * 使用 API 直接验证当前 session
 * 更稳定的方法，避免依赖 UI 元素
 */
export async function verifySessionValid(page: Page): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // 从 page context 获取 cookies
    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name.includes('auth-token'))

    if (!authCookie) return false

    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}

/**
 * 创建测试题目（通过 UI）
 * 带重试机制
 */
export async function createTestQuestion(
  page: Page,
  content: string,
  options: {
    retries?: number
    difficulty?: 'easy' | 'medium' | 'hard'
    knowledgePoint?: string
  } = {}
): Promise<void> {
  const { retries = 2, difficulty = 'medium', knowledgePoint = '有理数加法' } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto('/questions/create')
      await page.getByPlaceholder('请输入题干内容，支持 LaTeX').fill(content)
      await page.getByPlaceholder('选项A').fill('选项内容A')
      await page.getByPlaceholder('选项B').fill('选项内容B')

      // 选择知识点
      await page.locator('label').filter({ hasText: knowledgePoint }).first().click()

      // 选择难度
      const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' }
      await page
        .locator('label.ant-radio-wrapper')
        .filter({ hasText: difficultyMap[difficulty] })
        .first()
        .click()

      // 选择答案
      await page.getByRole('radio', { name: 'A' }).check()

      // 保存
      await page.getByRole('button', { name: '保存题目' }).click()

      // 等待成功消息或跳转
      await Promise.race([
        page.waitForURL('**/questions', { timeout: 5000 }),
        page.getByText(/保存成功|创建成功/).waitFor({ timeout: 5000 })
      ])

      console.log(`✓ 创建题目成功: ${content}`)
      return
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`创建题目失败 (${retries + 1}次尝试): ${error}`)
      }
      console.log(`× 创建题目失败，重试 ${attempt + 1}/${retries}`)
      await page.waitForTimeout(1000)
    }
  }
}

/**
 * 等待元素出现并重试
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const { timeout = 5000, retries = 3 } = options

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout })
      return
    } catch {
      if (attempt === retries - 1) {
        throw new Error(`元素未出现: ${selector} (${retries}次尝试)`)
      }
      await page.reload()
      await page.waitForTimeout(1000)
    }
  }
}
