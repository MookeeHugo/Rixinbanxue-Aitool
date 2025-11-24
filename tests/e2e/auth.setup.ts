import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_DIR = path.join(process.cwd(), 'playwright/.auth');

interface Account {
  name: string;
  email: string;
  password: string;
  statePath: string;
}

/**
 * 等待 dev 服务器就绪
 */
async function waitForDevServer(baseURL: string, maxRetries = 30): Promise<void> {
  console.log(`⏳ 等待 dev 服务器就绪 (${baseURL})...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseURL);
      if (response.ok || response.status === 404) {
        // 404 也算正常，因为首页可能有重定向
        console.log(`✅ Dev 服务器已就绪 (${i + 1}/${maxRetries})`);
        return;
      }
    } catch (error) {
      // 连接失败，继续等待
      if (i % 5 === 0) {
        console.log(`⏳ 等待中... (${i + 1}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`❌ Dev 服务器在 ${maxRetries} 秒后仍未就绪，请确保运行了 'npm run dev'`);
}

/**
 * 检查 auth state 是否有效
 */
function isAuthStateValid(statePath: string): boolean {
  if (!fs.existsSync(statePath)) {
    return false;
  }

  try {
    const authState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const origins = authState.origins || [];
    const localStorage = origins[0]?.localStorage || [];

    // 查找 session item
    const sessionItem = localStorage.find((item: any) =>
      item.name.includes('auth-token') || item.name === 'sb-auth'
    );

    if (!sessionItem) {
      console.log(`⚠️ Auth state 中未找到 session`);
      return false;
    }

    // 解析 session 检查有效期
    const session = JSON.parse(sessionItem.value);
    const expiresAt = session.expires_at * 1000; // 转为毫秒
    const now = Date.now();
    const timeLeft = expiresAt - now;

    // 如果还有超过 5 分钟有效期，认为是有效的
    if (timeLeft > 5 * 60 * 1000) {
      const minutesLeft = Math.floor(timeLeft / 60000);
      console.log(`✅ Auth state 有效，剩余 ${minutesLeft} 分钟`);
      return true;
    }

    console.log(`⚠️ Auth state 已过期或即将过期`);
    return false;
  } catch (error) {
    console.log(`⚠️ 解析 auth state 失败:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 创建或更新 auth state
 */
async function ensureAuthState(baseURL: string, account: Account): Promise<void> {
  // 检查是否已有有效的 auth state
  if (isAuthStateValid(account.statePath)) {
    console.log(`✅ 使用已有的 auth state: ${account.name}`);
    return;
  }

  console.log(`🔐 创建新的 auth state: ${account.name}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 访问登录页面
    console.log(`  → 访问登录页: ${baseURL}/login`);
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待登录表单加载
    console.log(`  → 等待登录表单加载...`);
    await page.waitForSelector('#email', { state: 'visible', timeout: 30000 });

    // 填写登录表单 - 使用 type 而不是 fill 以触发 React onChange
    console.log(`  → 填写登录信息: ${account.email}`);

    // 清空并输入 email
    await page.click('#email', { clickCount: 3 }); // 选中所有文本
    await page.keyboard.press('Backspace');
    await page.type('#email', account.email, { delay: 50 });

    // 清空并输入 password
    await page.click('#password', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#password', account.password, { delay: 50 });

    // 等待输入完成
    await page.waitForTimeout(300);

    // 验证表单已填写
    const emailValue = await page.inputValue('#email');
    const passwordValue = await page.inputValue('#password');
    if (!emailValue || !passwordValue) {
      throw new Error(`表单未正确填写: email="${emailValue}", password="${passwordValue ? '***' : 'empty'}"`);
    }

    // 点击登录按钮
    console.log(`  → 点击登录按钮`);
    await page.getByRole('button', { name: /登录/ }).click();

    // 等待登录完成 - 使用 Promise.race 来提供更好的错误信息
    console.log(`  → 等待登录完成...`);

    const result = await Promise.race([
      // 成功: URL 变化
      page.waitForURL(
        url => !url.pathname.includes('/login'),
        { waitUntil: 'domcontentloaded', timeout: 20000 }
      ).then(() => 'success'),

      // 失败: 错误消息出现
      page.waitForSelector('[class*="red"], [class*="error"]', { timeout: 20000 })
        .then(async (el) => {
          const errorText = await el.textContent();
          throw new Error(`登录失败，页面显示错误: ${errorText}`);
        })
    ]);

    if (result !== 'success') {
      throw new Error('登录超时或失败');
    }

    // 等待 localStorage 写入
    await page.waitForTimeout(500);

    // 验证登录成功
    const currentURL = page.url();
    if (currentURL.includes('/login')) {
      throw new Error('登录后仍停留在登录页面，登录可能失败');
    }

    console.log(`  ✅ 登录成功，当前页面: ${currentURL}`);

    // 保存 auth state
    await fs.promises.mkdir(path.dirname(account.statePath), { recursive: true });
    await context.storageState({ path: account.statePath });

    console.log(`  ✅ Auth state 已保存: ${account.statePath}`);
  } catch (error) {
    console.error(`  ❌ 创建 auth state 失败 (${account.name}):`, error instanceof Error ? error.message : error);

    // 截图以便调试
    const screenshotPath = path.join(AUTH_DIR, `${account.name}-error.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`  📸 错误截图已保存: ${screenshotPath}`);

    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Playwright 全局 setup
 */
const globalSetup = async (config: FullConfig) => {
  console.log('\n🚀 Playwright 全局 setup 开始\n');

  const baseURL = config.projects[0]?.use?.baseURL as string | undefined;

  if (!baseURL) {
    throw new Error('❌ Playwright baseURL 未配置，无法执行登录步骤');
  }

  console.log(`📍 Base URL: ${baseURL}\n`);

  // 1. 等待 dev 服务器就绪
  await waitForDevServer(baseURL);
  console.log('');

  // 2. 准备测试账号
  const accounts: Account[] = [
    {
      name: 'teacher',
      email: process.env.PLAYWRIGHT_TEACHER_EMAIL || 'playwright-teacher@test.com',
      password: process.env.PLAYWRIGHT_TEACHER_PASSWORD || 'Playwright123!',
      statePath: path.join(AUTH_DIR, 'teacher.json'),
    },
    {
      name: 'student',
      email: process.env.PLAYWRIGHT_STUDENT_EMAIL || 'playwright-student@test.com',
      password: process.env.PLAYWRIGHT_STUDENT_PASSWORD || 'Playwright123!',
      statePath: path.join(AUTH_DIR, 'student.json'),
    },
  ];

  // 3. 为每个账号创建/验证 auth state
  for (const account of accounts) {
    await ensureAuthState(baseURL, account);
    console.log('');
  }

  console.log('✅ Playwright 全局 setup 完成\n');
};

export default globalSetup;
