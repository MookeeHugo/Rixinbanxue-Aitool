#!/usr/bin/env tsx

/**
 * 使用反检测的Playwright测试
 * 目的：验证反检测策略能否绕过小红书的检测
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           使用反检测的小红书爬虫测试                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function testWithAntiDetection() {
  let browser = null;

  try {
    // 步骤1：启动浏览器
    console.log('📋 步骤1：启动Chromium浏览器（启用反检测）');
    console.log('─'.repeat(70));

    browser = await chromium.launch({
      headless: false, // MediaCrawler使用非headless模式
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    console.log('✅ 浏览器启动成功（非headless模式）\n');

    // 步骤2：创建页面并注入反检测
    console.log('📋 步骤2：创建页面并注入反检测脚本');
    console.log('─'.repeat(70));

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      permissions: [],
      extraHTTPHeaders: {
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    const page = await context.newPage();

    // 🔑 关键：注入反检测脚本
    await injectAntiDetection(page);
    console.log('✅ 反检测脚本已注入\n');

    // 步骤3：验证反检测效果
    console.log('📋 步骤3：验证反检测是否生效');
    console.log('─'.repeat(70));

    await page.goto('about:blank');
    const checks = await page.evaluate(() => {
      return {
        webdriver: (navigator as any).webdriver,
        chrome: typeof (window as any).chrome !== 'undefined',
        pluginsCount: navigator.plugins.length,
        languages: navigator.languages,
      };
    });

    console.log('反检测验证结果：');
    console.log(`   - navigator.webdriver: ${checks.webdriver} ${checks.webdriver === false ? '✅' : '❌'}`);
    console.log(`   - window.chrome: ${checks.chrome ? '✅' : '❌'}`);
    console.log(`   - plugins数量: ${checks.pluginsCount} ${checks.pluginsCount >= 3 ? '✅' : '❌'}`);
    console.log(`   - languages: ${checks.languages.join(', ')} ${checks.languages.includes('zh-CN') ? '✅' : '❌'}\n`);

    // 步骤4：访问小红书
    console.log('📋 步骤4：访问小红书首页');
    console.log('─'.repeat(70));

    try {
      await page.goto('https://www.xiaohongshu.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // 等待页面加载
      await page.waitForTimeout(3000);

      const title = await page.title();
      const url = page.url();

      console.log(`✅ 成功访问`);
      console.log(`   标题: ${title}`);
      console.log(`   URL: ${url}\n`);

      // 检查是否被重定向到验证页面
      if (url.includes('captcha') || url.includes('login')) {
        console.log('⚠️  仍然被重定向到验证/登录页面');
        console.log(`   重定向URL: ${url}\n`);
      } else {
        console.log('🎉 成功访问主页，未被检测！\n');
      }

      // 截图
      await page.screenshot({ path: 'test-reports/xiaohongshu-with-anti-detection.png' });
      console.log('✅ 截图已保存: test-reports/xiaohongshu-with-anti-detection.png\n');

      // 检查页面元素
      const pageContent = await page.content();
      console.log(`   页面HTML长度: ${pageContent.length} 字符`);

      // 等待一下，看看有没有更多元素加载
      await page.waitForTimeout(2000);

      const hasSearchBox = await page.locator('input[type="search"], input[placeholder*="搜索"]').count();
      const hasLinks = await page.locator('a').count();
      const hasImages = await page.locator('img').count();

      console.log(`   搜索框: ${hasSearchBox} 个`);
      console.log(`   链接: ${hasLinks} 个`);
      console.log(`   图片: ${hasImages} 个\n`);

      if (hasLinks >= 10 && hasImages >= 5) {
        console.log('✅ 页面元素充足，可能成功绕过检测！\n');
      } else if (hasLinks < 5) {
        console.log('⚠️  页面元素很少，可能仍被检测\n');
      }

      // 步骤5：尝试搜索（如果成功访问）
      if (!url.includes('captcha') && !url.includes('login')) {
        console.log('📋 步骤5：尝试搜索功能');
        console.log('─'.repeat(70));

        try {
          // 查找搜索框
          const searchBox = page.locator('input[type="search"], input[placeholder*="搜索"]').first();
          const searchBoxCount = await searchBox.count();

          if (searchBoxCount > 0) {
            console.log('找到搜索框，尝试搜索...');

            await searchBox.fill('数学教学');
            await page.waitForTimeout(1000);
            await searchBox.press('Enter');
            await page.waitForTimeout(5000);

            const searchUrl = page.url();
            console.log(`搜索后URL: ${searchUrl}`);

            await page.screenshot({ path: 'test-reports/xiaohongshu-search-result.png' });
            console.log('✅ 搜索结果截图已保存\n');

            // 检查搜索结果
            const resultCards = await page.locator('[class*="note"], [class*="card"], article').count();
            console.log(`找到 ${resultCards} 个笔记卡片\n`);

            if (resultCards > 0) {
              console.log('🎉 搜索功能正常工作！\n');
            }
          } else {
            console.log('⚠️  未找到搜索框\n');
          }
        } catch (searchError) {
          console.log(`⚠️  搜索测试失败: ${searchError.message}\n`);
        }
      }

      // 保持浏览器打开30秒，方便手动查看
      console.log('⏰ 浏览器将保持打开30秒，请手动查看页面...');
      await page.waitForTimeout(30000);
    } catch (error) {
      console.error('❌ 访问小红书失败:', error.message);

      await page.screenshot({ path: 'test-reports/xiaohongshu-error.png' });
      console.log('错误截图已保存\n');
    }

    await browser.close();
    console.log('✅ 浏览器已关闭\n');

    // 总结
    console.log('═'.repeat(70));
    console.log('📊 测试完成');
    console.log('═'.repeat(70) + '\n');

    console.log('请查看：');
    console.log('   1. test-reports/xiaohongshu-with-anti-detection.png');
    console.log('   2. test-reports/xiaohongshu-search-result.png（如果有）\n');

    console.log('📋 下一步：');
    console.log('   - 如果仍被检测，可能需要cookies或登录状态');
    console.log('   - 如果成功，可以继续测试完整的爬虫功能\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);

    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // 忽略
      }
    }
  }
}

// 运行测试
testWithAntiDetection();
