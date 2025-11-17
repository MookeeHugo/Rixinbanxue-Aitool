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

async function ensureAuthState(baseURL: string, account: Account) {
  if (fs.existsSync(account.statePath)) {
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

    await page.goto(`${baseURL}/login`);
    await page.fill('#email', account.email);
    await page.fill('#password', account.password);
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForURL('**/questions', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(async () => {
      // 如果跳不到 questions，退而求其次确认首页加载
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    });

  await fs.promises.mkdir(path.dirname(account.statePath), { recursive: true });
  await page.context().storageState({ path: account.statePath });

  await browser.close();
}

const globalSetup = async (config: FullConfig) => {
  const baseURL = config.projects[0]?.use?.baseURL as string | undefined;

  if (!baseURL) {
    throw new Error('Playwright baseURL 未配置，无法执行登录步骤');
  }

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

  for (const account of accounts) {
    await ensureAuthState(baseURL, account);
  }
};

export default globalSetup;
