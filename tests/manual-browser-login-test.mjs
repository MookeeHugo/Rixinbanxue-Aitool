#!/usr/bin/env node
/**
 * 手动浏览器登录测试 - 用于调试 Playwright E2E 登录问题
 */

import { chromium } from '@playwright/test'

const baseURL = 'http://localhost:3002'
const testAccount = {
  email: 'playwright-teacher@test.com',
  password: 'Playwright123!',
}

async function testLogin() {
  console.log('\n🧪 手动浏览器登录测试\n')
  console.log(`Base URL: ${baseURL}`)
  console.log(`Test Account: ${testAccount.email}\n`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 访问登录页面
    console.log('1️⃣ 访问登录页...')
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // 等待表单加载
    console.log('2️⃣ 等待表单加载...')
    await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
    await page.waitForSelector('#password', { state: 'visible', timeout: 10000 })

    // 填写表单
    console.log('3️⃣ 填写登录信息...')
    await page.fill('#email', testAccount.email)
    await page.fill('#password', testAccount.password)

    // 添加延迟确保 React 状态更新
    console.log('4️⃣ 等待 React 状态更新...')
    await page.waitForTimeout(500)

    // 验证输入值
    const emailValue = await page.inputValue('#email')
    const passwordValue = await page.inputValue('#password')
    console.log(`   Email 值: "${emailValue}"`)
    console.log(`   Password 值: "${passwordValue ? '***已填写***' : '空'}"`)

    if (!emailValue || !passwordValue) {
      throw new Error('输入字段未正确填写')
    }

    // 点击登录按钮
    console.log('5️⃣ 点击登录按钮...')

    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('/auth/')) {
        console.log(`   📡 请求: ${request.method()} ${request.url()}`)
      }
    })

    page.on('response', response => {
      if (response.url().includes('/auth/')) {
        console.log(`   📥 响应: ${response.status()} ${response.url()}`)
      }
    })

    await page.getByRole('button', { name: /登录/ }).click()

    // 等待导航或错误消息
    console.log('6️⃣ 等待登录结果...')

    const result = await Promise.race([
      // 成功: URL 变化
      page.waitForURL(
        url => !url.pathname.includes('/login'),
        { waitUntil: 'networkidle', timeout: 15000 }
      ).then(() => ({ success: true, url: page.url() })),

      // 失败: 错误消息出现
      page.waitForSelector('[class*="red"], [class*="error"]', { timeout: 15000 })
        .then(async el => {
          const text = await el.textContent()
          return { success: false, error: text }
        })
    ])

    if (result.success) {
      console.log(`\n✅ 登录成功!`)
      console.log(`   当前 URL: ${result.url}`)

      // 检查 localStorage
      const authData = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('supabase'))
        return keys.map(k => ({ key: k, hasValue: !!localStorage.getItem(k) }))
      })
      console.log(`   LocalStorage keys:`, authData)

      // 保持浏览器打开一会儿以便观察
      console.log('\n浏览器将保持打开 5 秒...')
      await page.waitForTimeout(5000)
    } else {
      console.log(`\n❌ 登录失败!`)
      console.log(`   错误消息: ${result.error}`)

      // 截图
      const screenshot = `./playwright/.auth/manual-test-error-${Date.now()}.png`
      await page.screenshot({ path: screenshot, fullPage: true })
      console.log(`   截图已保存: ${screenshot}`)

      // 保持浏览器打开以便调试
      console.log('\n浏览器将保持打开 10 秒以便调试...')
      await page.waitForTimeout(10000)
    }
  } catch (error) {
    console.error('\n❌ 测试出错:', error.message)

    // 截图
    const screenshot = `./playwright/.auth/manual-test-exception-${Date.now()}.png`
    await page.screenshot({ path: screenshot, fullPage: true })
    console.log(`   截图已保存: ${screenshot}`)

    throw error
  } finally {
    await browser.close()
  }
}

testLogin().catch(err => {
  console.error('\n测试失败:', err)
  process.exit(1)
})
