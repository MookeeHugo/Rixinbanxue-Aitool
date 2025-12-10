#!/usr/bin/env tsx

/**
 * 使用Cookies的测试
 *
 * 使用说明：
 * 1. 首先手动访问小红书并登录
 * 2. 将cookies保存到 test-reports/xiaohongshu-cookies.json
 * 3. 运行此脚本测试
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';
import path from 'path';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           使用Cookies的小红书测试                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const COOKIES_FILE = 'test-reports/xiaohongshu-cookies.json';

async function testWithCookies() {
  let browser = null;

  try {
    // 检查cookies文件
    console.log('📋 步骤1：检查cookies文件');
    console.log('─'.repeat(70));

    const cookiesExist = fs.existsSync(COOKIES_FILE);

    if (!cookiesExist) {
      console.log('❌ cookies文件不存在\n');
      console.log('请先手动登录小红书并保存cookies：\n');
      console.log('方法1：使用此脚本保存cookies');
      console.log('   1. 运行: pnpm exec tsx scripts/save-cookies.ts');
      console.log('   2. 在打开的浏览器中登录小红书');
      console.log('   3. 登录后按Enter，cookies将自动保存\n');
      console.log('方法2：手动保存cookies');
      console.log('   1. 浏览器打开 https://www.xiaohongshu.com');
      console.log('   2. F12打开开发者工具');
      console.log('   3. Console执行: copy(await cookieStore.getAll())');
      console.log('   4. 粘贴到 test-reports/xiaohongshu-cookies.json\n');

      process.exit(1);
    }

    console.log(`✅ 找到cookies文件: ${COOKIES_FILE}\n`);

    // 读取cookies
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    console.log(`已读取 ${cookies.length} 个cookies\n`);

    // 启动浏览器
    console.log('📋 步骤2：启动浏览器并注入反检测');
    console.log('─'.repeat(70));

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

    // 添加cookies
    await context.addCookies(cookies);
    console.log('✅ Cookies已添加\n');

    const page = await context.newPage();
    await injectAntiDetection(page);

    console.log('✅ 反检测脚本已注入\n');

    // 访问小红书
    console.log('📋 步骤3：使用cookies访问小红书');
    console.log('─'.repeat(70));

    await page.goto('https://www.xiaohongshu.com/explore', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    const title = await page.title();
    const url = page.url();

    console.log(`   标题: ${title}`);
    console.log(`   URL: ${url}\n`);

    if (url.includes('captcha') || url.includes('login')) {
      console.log('❌ 仍然被重定向到验证页面');
      console.log('   可能原因：');
      console.log('   1. Cookies已过期');
      console.log('   2. 需要重新登录\n');
    } else {
      console.log('🎉 成功访问！使用cookies绕过了检测\n');

      // 检查页面元素
      await page.waitForTimeout(2000);

      const hasLinks = await page.locator('a').count();
      const hasImages = await page.locator('img').count();
      const noteCards = await page.locator('[class*="note"], [class*="card"]').count();

      console.log(`   链接: ${hasLinks} 个`);
      console.log(`   图片: ${hasImages} 个`);
      console.log(`   笔记卡片: ${noteCards} 个\n`);

      if (noteCards > 0) {
        console.log(`✅ 成功！找到 ${noteCards} 个笔记卡片\n`);
      }
    }

    await page.screenshot({ path: 'test-reports/xiaohongshu-with-cookies.png' });
    console.log('✅ 截图已保存\n');

    console.log('⏰ 浏览器将保持打开30秒...');
    await page.waitForTimeout(30000);

    await browser.close();

    console.log('\n═'.repeat(70));
    console.log('测试完成！');
    console.log('═'.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

testWithCookies();
