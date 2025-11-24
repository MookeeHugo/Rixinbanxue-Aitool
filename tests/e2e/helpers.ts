/**
 * E2E 测试辅助函数
 * 提供稳定的登录验证和常用操作
 */

import { type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PLAYWRIGHT_BASE_URL?.replace('3002', '54321') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/**
 * 确保用户已登录
 * 改进版：更快速的登录态检测，避免UI等待超时
 */
export async function ensureLoggedIn(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // 1. 先检查 cookies 中是否有 auth token（最快的检测方式）
  const cookies = await page.context().cookies()
  const authCookie = cookies.find(c => c.name.includes('auth-token'))

  if (authCookie) {
    // 有 cookie，尝试直接访问受保护页面
    await page.goto('/questions', { waitUntil: 'domcontentloaded', timeout: 30000 })

    // 快速检查是否成功（给5秒时间）
    const isLoggedIn = await page.getByText('题库管理').isVisible({ timeout: 5000 }).catch(() => false)
    if (isLoggedIn) {
      console.log(`✓ 已登录 (使用 storageState): ${email}`)
      return
    }
  }

  console.log(`→ 需要登录: ${email}`)

  // 2. 需要登录，跳转到登录页
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 })

  // 等待表单加载
  await page.waitForSelector('#email', { timeout: 10000 })

  // 填写表单（使用 pressSequentially 以正确触发 React onChange 事件）
  const emailInput = page.locator('#email')
  const passwordInput = page.locator('#password')

  await emailInput.clear()
  await emailInput.pressSequentially(email, { delay: 50 })

  await passwordInput.clear()
  await passwordInput.pressSequentially(password, { delay: 50 })

  // 等待一下确保 React 状态更新
  await page.waitForTimeout(200)

  // 点击登录按钮
  const loginButton = page.getByRole('button', { name: /登录/ })
  await loginButton.click()

  // 3. 等待登录完成（增加超时时间，因为登录可能需要更长时间）
  try {
    await Promise.race([
      // 等待跳转到其他页面（不是登录页）
      page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 }),
      // 或者等待"题库管理"文本出现
      page.getByText('题库管理').waitFor({ state: 'visible', timeout: 30000 })
    ])

    console.log(`✓ 登录成功: ${email}`)
  } catch (error) {
    // 登录失败，获取更多调试信息
    const currentURL = page.url()
    const errorText = await page
      .locator('.ant-message-error, [role="alert"]')
      .first()
      .innerText()
      .catch(() => '')

    // 检查按钮状态
    const buttonText = await loginButton.innerText().catch(() => '')

    // 截图用于调试
    const screenshotPath = `test-results/login-failure-${Date.now()}.png`
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    }).catch(() => {})

    throw new Error(
      `登录失败: ${email}\n` +
      `当前URL: ${currentURL}\n` +
      `按钮文本: ${buttonText}\n` +
      `错误提示: ${errorText || '未知错误'}\n` +
      `截图: ${screenshotPath}`
    )
  }
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
      await page.goto('/questions/create', { waitUntil: 'domcontentloaded' })

      // 等待页面加载完成（不再显示"加载中..."）- 给足够时间让 Supabase 客户端初始化 session
      await page.waitForSelector('text=加载中...', { state: 'hidden', timeout: 60000 }).catch(() => {
        console.log('⚠️ 未检测到加载状态，继续执行')
      })

      // 等待表单元素可见并可交互
      await page.waitForSelector('textarea[placeholder*="请输入题干内容"]', { state: 'visible', timeout: 60000 })

      // 使用 pressSequentially 确保 React 状态正确更新
      await page.getByPlaceholder('请输入题干内容，支持 LaTeX').pressSequentially(content, { delay: 20 })
      await page.getByPlaceholder('选项A').pressSequentially('选项内容A', { delay: 20 })
      await page.getByPlaceholder('选项B').pressSequentially('选项内容B', { delay: 20 })

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

      // 等待跳转到详情页（创建成功后会跳转到 /questions/[id]）
      await page.waitForURL('**/questions/**', { timeout: 10000 })
      console.log(`✓ 创建题目成功: ${content}`)

      // 导航回列表页，以便后续测试
      await page.goto('/questions')
      await page.waitForLoadState('networkidle')
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
