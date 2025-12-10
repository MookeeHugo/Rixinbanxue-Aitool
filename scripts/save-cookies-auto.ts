#!/usr/bin/env tsx

/**
 * 自动保存小红书Cookies（改进版）
 *
 * 使用说明：
 * 1. 运行此脚本
 * 2. 在打开的浏览器中登录小红书
 * 3. 浏览器会保持打开60秒
 * 4. 60秒后自动保存cookies并关闭
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              自动保存小红书Cookies                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const COOKIES_FILE = 'test-reports/xiaohongshu-cookies.json';

async function saveCookiesAuto() {
  let browser = null;

  try {
    console.log('📋 启动浏览器...\n');

    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
    });

    const page = await context.newPage();
    await injectAntiDetection(page);

    console.log('✅ 浏览器已启动\n');

    // 访问小红书
    console.log('📋 正在访问小红书...\n');
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log('═'.repeat(70));
    console.log('  请在浏览器中完成以下操作：');
    console.log('  1. 如果看到验证码，请完成验证');
    console.log('  2. 点击登录按钮');
    console.log('  3. 使用手机扫码或其他方式登录');
    console.log('  ');
    console.log('  浏览器将在 60 秒后自动保存cookies并关闭');
    console.log('═'.repeat(70) + '\n');

    // 倒计时
    for (let i = 60; i > 0; i -= 10) {
      console.log(`⏰ 剩余 ${i} 秒...`);
      await page.waitForTimeout(10000);
    }

    console.log('\n📋 正在保存cookies...\n');

    // 获取cookies
    const cookies = await context.cookies();

    // 保存cookies
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2), 'utf-8');

    console.log(`✅ Cookies已保存到: ${COOKIES_FILE}`);
    console.log(`   共保存 ${cookies.length} 个cookies\n`);

    // 验证登录状态
    console.log('📋 验证登录状态...\n');

    const currentUrl = page.url();

    // 尝试访问explore页面
    if (!currentUrl.includes('/explore')) {
      await page.goto('https://www.xiaohongshu.com/explore', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
    }

    const url = page.url();
    const title = await page.title();

    console.log(`   当前页面: ${title}`);
    console.log(`   URL: ${url}\n`);

    if (url.includes('captcha') || url.includes('login')) {
      console.log('⚠️  可能未登录成功，或需要重新验证\n');
    } else {
      console.log('🎉 登录状态验证成功！\n');

      // 检查页面元素
      const noteCards = await page.locator('[class*="note"], [class*="card"]').count();
      console.log(`   找到 ${noteCards} 个笔记卡片\n`);
    }

    await page.screenshot({ path: 'test-reports/cookies-verification.png' });
    console.log('✅ 验证截图已保存\n');

    await browser.close();

    console.log('═'.repeat(70));
    console.log('✅ 完成！现在可以运行：');
    console.log('   pnpm exec tsx scripts/test-with-cookies.ts');
    console.log('═'.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

saveCookiesAuto();
