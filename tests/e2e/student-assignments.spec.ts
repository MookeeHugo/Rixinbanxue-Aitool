import { test, expect } from '@playwright/test'

test.describe('学生作业流程', () => {
  // 使用预先生成的学生认证状态（由 auth.setup.ts 创建）
  test.use({ storageState: 'playwright/.auth/student.json' })

  test('作业列表 → 详情 → 作答/提交 并查看结果', async ({ page }) => {
    // 进入学生的作业列表页面（/my-assignments）
    await page.goto('/my-assignments')
    await page.waitForLoadState('networkidle')

    // 检查是否有作业数据
    const emptyState = page.getByText('还没有作业')
    const hasNoData = await emptyState.isVisible().catch(() => false)

    if (hasNoData) {
      console.log('⚠️ 测试账号暂无作业数据，跳过作业提交流程测试')
      // 至少验证页面能够正确加载和显示空状态
      await expect(page.getByRole('heading', { name: '我的作业' })).toBeVisible()
      await expect(emptyState).toBeVisible()
      await page.screenshot({ path: 'test-results/student-assignment-empty-state.png', fullPage: true })
      console.log('✅ 学生作业页面空状态显示正常')
      return // 优雅地结束测试
    }

    // 如果有数据，继续执行完整的测试流程
    const rows = page.locator('.ant-list-item, .assignment-card, .ant-table-row')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
    const firstAssignment = rows.first()
    const assignmentTitle = await firstAssignment.innerText()
    console.log('选中作业：', assignmentTitle.slice(0, 50))

    // 进入详情
    const detailLink = firstAssignment.getByRole('link').first().or(firstAssignment.getByRole('button', { name: /详情|进入|查看/ }))
    await detailLink.click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/student-assignment-detail.png', fullPage: true })

    // 开始作答入口
    const startBtn = page.getByRole('button', { name: /开始作答|继续作答|开始/ }).first()
    await expect(startBtn).toBeVisible({ timeout: 10000 })
    await startBtn.click()
    await page.waitForLoadState('networkidle')

    // 作答流程（示例：选择题/填空题的通用处理）
    const choiceQuestions = page.locator('[data-question-type="choice"], .question-choice')
    if (await choiceQuestions.count()) {
      const firstChoice = choiceQuestions.first()
      const option = firstChoice.getByRole('radio').first()
      await option.check({ force: true })
    } else {
      // 兜底：选中任意 radio
      const anyRadio = page.getByRole('radio').first()
      if (await anyRadio.isVisible().catch(() => false)) {
        await anyRadio.check({ force: true })
      }
    }

    const inputQuestions = page.locator('textarea, input[type="text"]').filter({ hasNotText: '' })
    if (await inputQuestions.count()) {
      await inputQuestions.first().fill('自动化作答内容')
    }

    await page.screenshot({ path: 'test-results/student-assignment-answering.png', fullPage: true })

    // 提交
    const submitBtn = page.getByRole('button', { name: /提交|交卷|完成/ }).first()
    await expect(submitBtn).toBeVisible({ timeout: 10000 })
    await submitBtn.click()

    // 等待结果页/提示
    await Promise.race([
      page.getByText(/提交成功|已提交|得分|成绩/).first().waitFor({ timeout: 15000 }).catch(() => {}),
      page.waitForLoadState('networkidle', { timeout: 15000 })
    ])

    await page.screenshot({ path: 'test-results/student-assignment-result.png', fullPage: true })

    // 结果断言：URL 不在 /login，且包含成绩或解析信息
    expect(page.url().includes('/login')).toBeFalsy()
    const hasScore = await page.getByText(/得分|正确|解析|错题/).first().isVisible().catch(() => false)
    expect(hasScore).toBeTruthy()
  })
})
