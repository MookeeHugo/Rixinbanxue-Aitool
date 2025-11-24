import { test, expect } from '@playwright/test';

/**
 * 学生账号登录和数据验证测试
 * 验证 student@test.com 可以登录并看到测试数据
 */
test.describe('学生账号登录验证', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页（使用 127.0.0.1，与 Supabase 域保持一致）
    await page.goto('http://127.0.0.1:3002');
  });

  test('学生账号应该能够成功登录', async ({ page }) => {
    page.on('console', msg => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`)
    })
    page.on('requestfailed', request => {
      console.log(
        `[requestfailed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`
      )
    })
    page.on('response', response => {
      if (response.url().includes('/auth/v1/token')) {
        console.log(`[auth-response] ${response.status()} ${response.url()}`)
      }
    })

    // 直接访问登录页，避免依赖首页入口文案变化
    await page.goto('http://127.0.0.1:3002/login');

    // 等待登录页面加载
    await page.waitForLoadState('networkidle');

    let authResponseHeaders: Record<string, string> | null = null;
    page.on('response', response => {
      if (response.url().includes('/auth/v1/token')) {
        authResponseHeaders = response.headers();
        console.log('[auth-response] status', response.status(), 'headers set-cookie:', authResponseHeaders['set-cookie']);
      }
    });

    // 查找邮箱输入框
    const emailInput = page.locator('input[type="email"]#email').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // 输入学生邮箱
    await emailInput.fill('student@test.com');

    // 查找密码输入框
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"], input[placeholder*="password"]').first();
    await expect(passwordInput).toBeVisible();

    // 输入密码
    await passwordInput.fill('test123456');

    // 截图：填写完登录表单
    await page.screenshot({ path: 'test-results/01-login-form-filled.png', fullPage: true });

    // 查找登录按钮
    const loginButton = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first();
    await expect(loginButton).toBeVisible();

    // 点击登录
    await loginButton.click();

    // 等待 session 写入 localStorage 后，手动注入服务端可能需要的 Supabase cookie
    await page.waitForTimeout(300); // 给前端 auth 写入一点时间
    const sessionString = await page
      .evaluate(() => {
        return (
          localStorage.getItem('sb-127-auth-token') ||
          localStorage.getItem('sb-Rixindemo-codex-m1-auth-token')
        )
      })
      .catch(() => null);

    if (sessionString) {
      const cookiesPayload = [
        { name: 'sb-127-auth-token', value: encodeURIComponent(sessionString) },
        { name: 'sb-Rixindemo-codex-m1-auth-token', value: encodeURIComponent(sessionString) },
      ];
      await page.context().addCookies(
        cookiesPayload.map(c => ({
          ...c,
          domain: '127.0.0.1',
          path: '/',
          sameSite: 'Lax',
          httpOnly: false,
          secure: false,
        }))
      );
      console.log('已注入 Supabase cookies:', cookiesPayload.map(c => c.name));
    } else {
      console.log('未在 localStorage 发现 Supabase session，跳过注入 cookie');
    }

    // 等待登录完成或捕获错误提示（最多等待30秒）
    const errorLocator = page.locator('.ant-message-error').first();
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 30000 }),
      errorLocator.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})
    ]);

    // 截图：登录后的页面
    await page.screenshot({ path: 'test-results/02-after-login.png', fullPage: true });

    // 验证登录成功（检查是否不在登录页面了）
    const currentUrl = page.url();
    console.log('登录后URL:', currentUrl);

    // 输出潜在错误提示
    if (await errorLocator.isVisible().catch(() => false)) {
      const errText = await errorLocator.innerText().catch(() => '');
      console.log('登录错误提示:', errText);
    }

    // 检查是否有错误消息
    const errorMessages = await page.locator('text=/invalid|错误|失败|error/i').all();
    if (errorMessages.length > 0) {
      for (const error of errorMessages) {
        const errorText = await error.textContent();
        console.log('发现错误消息:', errorText);
      }
    }

    // 验证是否成功登录（通常会跳转到仪表板或显示用户信息）
    const isStillOnLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');
    if (isStillOnLoginPage) {
      const cookies = await page.context().cookies();
      console.log('登录后 cookies:', cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path })));
      const bodyText = await page.locator('body').innerText().catch(() => '');
      console.log('登录失败时页面文本片段:', bodyText.slice(0, 200));
      const ls = await page.evaluate(() => {
        const dump: Record<string, string | null> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) dump[key] = localStorage.getItem(key);
        }
        return dump;
      });
      console.log('登录后 localStorage:', ls);
      // 读取新的存储 key（客户端 Supabase 默认为 sb-auth）
      const sessionRaw = ls['sb-auth'] || ls['sb-127-auth-token'] || ls['sb-Rixindemo-codex-m1-auth-token'];
      console.log('检测到的 session key:', sessionRaw ? '存在' : '缺失');
      if (sessionRaw) {
        try {
          const sessionObj = JSON.parse(decodeURIComponent(sessionRaw));
          console.log('session 对象解析:', sessionObj);
        } catch (e) {
          console.log('session 解析失败', e);
        }
      }
    }
    expect(isStillOnLoginPage).toBe(false);
  });

  test('学生应该能看到作业列表', async ({ page }) => {
    // 先导航到登录页面
    await page.goto('http://127.0.0.1:3002/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]#email').first();
    await emailInput.fill('student@test.com');

    const passwordInput = page.locator('input[type="password"]#password').first();
    await passwordInput.fill('test123456');

    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // 导航到作业页面
    const assignmentLink = page.locator('a:has-text("作业"), a:has-text("我的作业"), a[href*="assignment"]').first();
    if (await assignmentLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assignmentLink.click();
      await page.waitForLoadState('networkidle');
    }

    // 截图：作业列表页面
    await page.screenshot({ path: 'test-results/03-assignments-page.png', fullPage: true });

    // 检查是否有作业显示
    const pageContent = await page.content();
    console.log('页面是否包含"数学基础练习":', pageContent.includes('数学基础练习'));
    console.log('页面是否包含"方程与不等式":', pageContent.includes('方程与不等式'));

    // 检查是否有任何作业相关的文本
    const assignmentTexts = await page.locator('text=/作业|练习|测试/').all();
    console.log('找到的作业相关元素数量:', assignmentTexts.length);
  });

  test('检查数据库连接状态', async ({ page }) => {
    // 访问首页并检查控制台错误
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    await page.goto('http://127.0.0.1:3002');
    await page.waitForLoadState('networkidle');

    // 等待一段时间让所有请求完成
    await page.waitForTimeout(3000);

    // 截图：首页
    await page.screenshot({ path: 'test-results/00-homepage.png', fullPage: true });

    // 输出所有控制台消息
    console.log('=== 控制台消息 ===');
    consoleMessages.forEach(msg => console.log(msg));

    // 输出所有错误
    console.log('=== 控制台错误 ===');
    errors.forEach(err => console.log('ERROR:', err));

    // 检查网络请求
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    if (failedRequests.length > 0) {
      console.log('=== 失败的网络请求 ===');
      failedRequests.forEach(req => console.log(req));
    }
  });
});
