import { test as base, expect } from '@playwright/test';

/**
 * 手动登录测试 - 不使用 pre-authenticated storage state
 * 直接测试 student@test.com 账号登录
 */

// 创建一个不使用 storage state 的 test
const test = base.extend({
  storageState: async ({}, use) => {
    await use(undefined);  // 不使用任何 storage state
  },
});

test.describe('手动登录测试', () => {
  test('student@test.com 应该能够成功登录', async ({ page }) => {
    // 直接导航到登录页面
    await page.goto('http://localhost:3002/login');
    await page.waitForLoadState('networkidle');

    console.log('当前URL:', page.url());

    // 填写登录表单
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('student@test.com');

    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('test123456');

    // 截图：登录表单已填写
    await page.screenshot({ path: 'test-results/manual-login-01-form-filled.png', fullPage: true });

    // 点击登录按钮
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    console.log('登录按钮文本:', await loginButton.textContent());

    await loginButton.click();
    console.log('已点击登录按钮');

    // 等待一段时间让请求完成
    await page.waitForTimeout(5000);

    // 截图：登录后
    await page.screenshot({ path: 'test-results/manual-login-02-after-login.png', fullPage: true });

    // 检查URL是否已改变
    const currentUrl = page.url();
    console.log('登录后URL:', currentUrl);

    // 检查页面内容
    const pageContent = await page.textContent('body');
    console.log('页面包含"学生学习中心":', pageContent?.includes('学生学习中心'));
    console.log('页面包含"我的作业":', pageContent?.includes('我的作业'));

    // 验证登录成功 - 应该不再在登录页面
    const isStillOnLoginPage = currentUrl.includes('/login');
    if (isStillOnLoginPage) {
      // 检查是否有错误消息
      const errorElement = await page.locator('text=/invalid|错误|失败|error/i').first().textContent().catch(() => null);
      if (errorElement) {
        console.log('发现错误消息:', errorElement);
      }
    }

    expect(isStillOnLoginPage).toBe(false);
  });
});
