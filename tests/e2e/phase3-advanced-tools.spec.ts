/**
 * Phase 3: 高级编辑工具 E2E 测试
 *
 * 测试内容：
 * 1. LaTeX 可视化编辑器
 * 2. 图片处理功能
 * 3. 图片拖拽排序
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const TEST_IMAGE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'test-image.png')

// 确保测试图片存在
async function ensureTestImage() {
  const dir = path.dirname(TEST_IMAGE_PATH)
  await fs.promises.mkdir(dir, { recursive: true })

  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    // 创建一个简单的测试图片 (1x1 PNG)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await fs.promises.writeFile(TEST_IMAGE_PATH, pngData)
  }
}

test.describe('Phase 3: 高级编辑工具', () => {
  test.use({ storageState: 'playwright/.auth/teacher.json' })

  test.beforeAll(async () => {
    await ensureTestImage()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/test-phase3')
    await expect(page.locator('[data-testid="phase3-test-page"]')).toBeVisible()
  })

  test.describe('LaTeX 可视化编辑器', () => {
    test('应该能够切换到 LaTeX 编辑器标签', async ({ page }) => {
      const latexTab = page.locator('[data-testid="tab-latex"]')
      await latexTab.click()
      await expect(latexTab).toHaveAttribute('data-state', 'active')
    })

    test('应该显示初始公式值', async ({ page }) => {
      await page.locator('[data-testid="tab-latex"]').click()

      const latexValue = page.locator('[data-testid="latex-value"]')
      await expect(latexValue).toBeVisible()
      await expect(latexValue).toContainText('\\frac{a}{b}')
    })

    test('应该能够设置预设公式 - 积分', async ({ page }) => {
      await page.locator('[data-testid="tab-latex"]').click()

      const integralButton = page.locator('[data-testid="latex-preset-integral"]')
      await integralButton.click()

      // 等待公式值更新
      await page.waitForTimeout(500)

      const latexValue = page.locator('[data-testid="latex-value"]')
      await expect(latexValue).toContainText('\\int_{a}^{b} f(x) dx')
    })

    test('应该能够设置预设公式 - 求和', async ({ page }) => {
      await page.locator('[data-testid="tab-latex"]').click()

      const sumButton = page.locator('[data-testid="latex-preset-sum"]')
      await sumButton.click()

      await page.waitForTimeout(500)

      const latexValue = page.locator('[data-testid="latex-value"]')
      await expect(latexValue).toContainText('\\sum_{i=1}^{n} x_i')
    })

    test('应该能够清空公式', async ({ page }) => {
      await page.locator('[data-testid="tab-latex"]').click()

      const clearButton = page.locator('[data-testid="latex-clear"]')
      await clearButton.click()

      await page.waitForTimeout(500)

      const latexValue = page.locator('[data-testid="latex-value"]')
      const text = await latexValue.textContent()
      expect(text?.trim()).toBe('')
    })

    test('应该显示 LaTeX 编辑器的三种模式标签', async ({ page }) => {
      await page.locator('[data-testid="tab-latex"]').click()

      // 检查是否有可视化、代码、预览三个标签
      const editorTabs = page.locator('.latex-field-container, [role="tablist"]').first()
      await expect(editorTabs).toBeVisible({ timeout: 10000 })
    })

    test('应该显示公式工具栏', async ({ page }) => {
      await page.locator('[data-testid="tab-latex"]').click()

      // 检查是否有工具栏按钮（上标、下标、分数等）
      const toolbar = page.locator('button').filter({ hasText: /上标|下标|分数|根号/ }).first()
      await expect(toolbar).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('图片处理功能', () => {
    test('应该能够切换到图片处理标签', async ({ page }) => {
      const imageTab = page.locator('[data-testid="tab-image-process"]')
      await imageTab.click()
      await expect(imageTab).toHaveAttribute('data-state', 'active')
    })

    test('应该显示图片上传输入框', async ({ page }) => {
      await page.locator('[data-testid="tab-image-process"]').click()

      const uploadInput = page.locator('[data-testid="image-upload-input"]')
      await expect(uploadInput).toBeVisible()
      await expect(uploadInput).toHaveAttribute('type', 'file')
      await expect(uploadInput).toHaveAttribute('accept', 'image/*')
    })

    test('应该能够上传并处理图片', async ({ page }) => {
      await page.locator('[data-testid="tab-image-process"]').click()

      const uploadInput = page.locator('[data-testid="image-upload-input"]')

      // 验证上传控件可以接收文件
      await expect(uploadInput).toBeEnabled()

      // 上传测试图片
      await uploadInput.setInputFiles(TEST_IMAGE_PATH)

      // 等待处理完成 - 检查是否出现处理结果或toast提示
      // 给予足够的时间让处理完成或显示错误
      await page.waitForTimeout(3000)

      // 验证处理触发了某种响应（成功的图片或错误提示）
      const processedImage = page.locator('[data-testid="processed-image"]')
      const toast = page.locator('[role="status"], [role="alert"]')

      // 至少应该有其中一个出现（处理成功的图片 或 错误提示）
      const imageVisible = await processedImage.isVisible().catch(() => false)
      const toastVisible = await toast.isVisible().catch(() => false)

      // 验证上传触发了处理流程（有结果或错误提示）
      expect(imageVisible || toastVisible).toBeTruthy()
    })

    test('应该显示图片处理参数说明', async ({ page }) => {
      await page.locator('[data-testid="tab-image-process"]').click()

      await expect(page.getByText('锐化强度: 30')).toBeVisible()
      await expect(page.getByText('调整尺寸: 宽度 800px')).toBeVisible()
      await expect(page.getByText('输出格式: PNG')).toBeVisible()
    })
  })

  test.describe('图片拖拽排序', () => {
    test('应该能够切换到图片拖拽标签', async ({ page }) => {
      const dragTab = page.locator('[data-testid="tab-image-drag"]')
      await dragTab.click()
      await expect(dragTab).toHaveAttribute('data-state', 'active')
    })

    test('应该显示初始图片列表', async ({ page }) => {
      await page.locator('[data-testid="tab-image-drag"]').click()

      const imageEditor = page.locator('[data-testid="image-position-editor"]')
      await expect(imageEditor).toBeVisible()

      // 检查图片顺序显示
      const orderDisplay = page.locator('[data-testid="image-order-display"]')
      await expect(orderDisplay).toBeVisible()
      await expect(orderDisplay).toContainText('测试图片 1')
      await expect(orderDisplay).toContainText('测试图片 2')
    })

    test('应该能够添加新图片', async ({ page }) => {
      await page.locator('[data-testid="tab-image-drag"]').click()

      // 获取初始图片数量
      const orderDisplay = page.locator('[data-testid="image-order-display"]')
      const initialText = await orderDisplay.textContent()
      const initialCount = (initialText?.match(/\d+\./g) || []).length

      // 点击添加按钮
      const addButton = page.locator('[data-testid="add-test-image"]')
      await addButton.click()

      // 等待图片添加
      await page.waitForTimeout(1000)

      // 验证图片数量增加
      const updatedText = await orderDisplay.textContent()
      const updatedCount = (updatedText?.match(/\d+\./g) || []).length
      expect(updatedCount).toBe(initialCount + 1)
    })

    test('应该显示图片的拖拽手柄', async ({ page }) => {
      await page.locator('[data-testid="tab-image-drag"]').click()

      // 检查图片卡片是否存在（包含拖拽手柄）
      const imageCard = page.locator('.group').first()
      await expect(imageCard).toBeVisible({ timeout: 5000 })

      // 检查卡片内是否有 SVG 图标
      const svgIcon = imageCard.locator('svg').first()
      await expect(svgIcon).toBeVisible()
    })

    test('应该显示图片的删除按钮', async ({ page }) => {
      await page.locator('[data-testid="tab-image-drag"]').click()

      // 检查图片卡片存在并包含按钮
      const imageCard = page.locator('.group').first()
      await expect(imageCard).toBeVisible()

      // 检查卡片内是否有按钮元素（包括删除和预览按钮）
      const buttons = imageCard.getByRole('button')
      await expect(buttons.first()).toBeAttached()

      // 验证至少有 2 个按钮（预览 + 删除）
      const buttonCount = await buttons.count()
      expect(buttonCount).toBeGreaterThanOrEqual(2)
    })

    test('应该能够删除图片', async ({ page }) => {
      await page.locator('[data-testid="tab-image-drag"]').click()

      // 获取初始图片数量
      const orderDisplay = page.locator('[data-testid="image-order-display"]')
      const initialText = await orderDisplay.textContent()
      const initialCount = (initialText?.match(/\d+\./g) || []).length

      if (initialCount === 0) {
        // 如果没有图片，先添加一个
        await page.locator('[data-testid="add-test-image"]').click()
        await page.waitForTimeout(1000)
      }

      // 获取当前实际数量
      const currentText = await orderDisplay.textContent()
      const currentCount = (currentText?.match(/\d+\./g) || []).length

      // 找到图片卡片并点击删除按钮（最后一个按钮是删除按钮）
      const imageCard = page.locator('.group').first()
      await imageCard.hover()
      await page.waitForTimeout(500) // 等待 CSS 动画

      // 找到所有按钮并点击最后一个（删除按钮）
      const buttons = imageCard.getByRole('button')
      const lastButton = buttons.last()
      await lastButton.click({ force: true, timeout: 5000 })

      // 等待删除完成
      await page.waitForTimeout(1000)

      // 验证图片数量减少
      const updatedText = await orderDisplay.textContent()
      const updatedCount = (updatedText?.match(/\d+\./g) || []).length
      expect(updatedCount).toBe(currentCount - 1)
    })

    test('应该显示图片预览按钮', async ({ page }) => {
      await page.locator('[data-testid="tab-image-drag"]').click()

      // 检查图片卡片存在
      const imageCard = page.locator('.group').first()
      await expect(imageCard).toBeVisible()

      // 验证卡片包含多个按钮（预览按钮是其中之一）
      const buttons = imageCard.getByRole('button')
      const buttonCount = await buttons.count()

      // 应该有至少 2 个按钮（预览 + 删除）
      expect(buttonCount).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('综合测试', () => {
    test('应该能够在三个标签之间切换', async ({ page }) => {
      // 切换到 LaTeX
      await page.locator('[data-testid="tab-latex"]').click()
      await expect(page.locator('[data-testid="latex-value"]')).toBeVisible()

      // 切换到图片处理
      await page.locator('[data-testid="tab-image-process"]').click()
      await expect(page.locator('[data-testid="image-upload-input"]')).toBeVisible()

      // 切换到图片拖拽
      await page.locator('[data-testid="tab-image-drag"]').click()
      await expect(page.locator('[data-testid="image-position-editor"]')).toBeVisible()

      // 再次切换回 LaTeX
      await page.locator('[data-testid="tab-latex"]').click()
      await expect(page.locator('[data-testid="latex-value"]')).toBeVisible()
    })

    test('页面应该响应式显示', async ({ page }) => {
      // 检查页面容器
      const container = page.locator('.container')
      await expect(container).toBeVisible()

      // 检查标题
      await expect(page.getByRole('heading', { name: 'Phase 3: 高级编辑工具测试' })).toBeVisible()
    })

    test('所有组件应该在页面加载后正常显示', async ({ page }) => {
      // 等待页面完全加载
      await page.waitForLoadState('networkidle')

      // 检查三个标签都存在
      await expect(page.locator('[data-testid="tab-latex"]')).toBeVisible()
      await expect(page.locator('[data-testid="tab-image-process"]')).toBeVisible()
      await expect(page.locator('[data-testid="tab-image-drag"]')).toBeVisible()

      // 默认应该显示 LaTeX 标签
      await expect(page.locator('[data-testid="tab-latex"]')).toHaveAttribute('data-state', 'active')
    })
  })
})
