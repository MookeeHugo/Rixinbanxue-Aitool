#!/usr/bin/env tsx

/**
 * 检查Cookies有效性
 * 验证当前保存的cookies是否仍然可以正常访问小红书
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              检查小红书Cookies有效性                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const COOKIES_FILE = 'test-reports/xiaohongshu-cookies.json';

async function checkCookiesValidity() {
  let browser = null;

  try {
    // 检查cookies文件
    console.log('📋 步骤1：检查cookies文件');
    console.log('─'.repeat(70));

    if (!fs.existsSync(COOKIES_FILE)) {
      console.log('❌ cookies文件不存在\n');
      console.log('请运行: pnpm exec tsx scripts/save-cookies-auto.ts\n');
      process.exit(1);
    }

    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    console.log(`✅ 找到cookies文件，共 ${cookies.length} 个cookies\n`);

    // 显示cookies信息
    console.log('Cookies详情:');
    cookies.forEach((cookie, i) => {
      const expires = cookie.expires ? new Date(cookie.expires * 1000).toLocaleString('zh-CN') : '会话cookie';
      console.log(`   ${i + 1}. ${cookie.name}: ${expires}`);
    });
    console.log('');

    // 启动浏览器
    console.log('📋 步骤2：启动浏览器测试cookies');
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

    await context.addCookies(cookies);

    const page = await context.newPage();
    await injectAntiDetection(page);

    console.log('✅ 浏览器已启动\n');

    // 测试1：访问explore页面
    console.log('📋 测试1：访问explore页面');
    console.log('─'.repeat(70));

    await page.goto('https://www.xiaohongshu.com/explore', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    const exploreUrl = page.url();
    const exploreTitle = await page.title();

    console.log(`   URL: ${exploreUrl}`);
    console.log(`   标题: ${exploreTitle}`);

    // 检查是否被重定向到登录页
    if (exploreUrl.includes('login') || exploreUrl.includes('captcha')) {
      console.log('\n❌ 测试1失败：被重定向到登录/验证页面');
      console.log('   结论：Cookies已过期或无效\n');
      console.log('请重新运行: pnpm exec tsx scripts/save-cookies-auto.ts\n');
      await browser.close();
      process.exit(1);
    }

    // 检查是否有登录弹窗
    const loginModal = await page.locator('[class*="login"], [class*="modal"]').count();
    console.log(`   登录弹窗: ${loginModal} 个`);

    // 检查笔记卡片
    const noteCards = await page.locator('a[href*="/explore/"]').count();
    console.log(`   笔记链接: ${noteCards} 个`);

    if (noteCards > 0) {
      console.log('\n✅ 测试1通过：可以正常访问explore页面\n');
    } else {
      console.log('\n⚠️  测试1警告：未找到笔记链接\n');
    }

    // 测试2：访问具体帖子详情页
    console.log('📋 测试2：访问具体帖子详情页');
    console.log('─'.repeat(70));

    // 获取第一个帖子链接
    const firstNoteLink = await page.locator('a[href*="/explore/"]').first().getAttribute('href');

    if (!firstNoteLink) {
      console.log('❌ 测试2失败：未找到帖子链接\n');
      await browser.close();
      process.exit(1);
    }

    const detailUrl = firstNoteLink.startsWith('http')
      ? firstNoteLink
      : `https://www.xiaohongshu.com${firstNoteLink}`;

    console.log(`   尝试访问: ${detailUrl}`);

    await page.goto(detailUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(5000);

    const finalUrl = page.url();
    const finalTitle = await page.title();

    console.log(`   最终URL: ${finalUrl}`);
    console.log(`   最终标题: ${finalTitle}`);

    // 检查是否成功进入详情页
    if (finalUrl.includes('/explore/') && finalUrl !== exploreUrl) {
      console.log('\n✅ 测试2通过：成功进入帖子详情页\n');
    } else if (finalUrl === exploreUrl || finalUrl.includes('xiaohongshu.com/explore?')) {
      console.log('\n❌ 测试2失败：被重定向回explore页面');
      console.log('   可能原因：');
      console.log('   1. Cookies已过期，需要重新登录');
      console.log('   2. 帖子链接无效或需要登录才能查看');
      console.log('   3. 被反爬虫机制检测\n');
    } else if (finalUrl.includes('login') || finalUrl.includes('captcha')) {
      console.log('\n❌ 测试2失败：被重定向到登录/验证页面');
      console.log('   结论：Cookies已过期\n');
    }

    // 截图保存
    await page.screenshot({ path: 'test-reports/cookies-validity-check.png' });
    console.log('✅ 截图已保存: test-reports/cookies-validity-check.png\n');

    // 保持浏览器打开15秒供查看
    console.log('⏰ 浏览器将保持打开15秒，请查看页面状态...\n');
    await page.waitForTimeout(15000);

    await browser.close();

    console.log('═'.repeat(70));
    console.log('检查完成！');
    console.log('═'.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    console.error(error);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    process.exit(1);
  }
}

checkCookiesValidity();
