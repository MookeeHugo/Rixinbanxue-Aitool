#!/usr/bin/env tsx

/**
 * 最基础的Playwright测试
 * 目的：验证Playwright是否能正常工作
 */

import { chromium } from 'playwright';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              Playwright基础测试                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function testBasic() {
  let browser = null;

  try {
    // 步骤1：启动浏览器
    console.log('📋 步骤1：启动Chromium浏览器');
    console.log('─'.repeat(70));

    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    console.log('✅ 浏览器启动成功\n');

    // 步骤2：创建页面
    console.log('📋 步骤2：创建新页面');
    console.log('─'.repeat(70));

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    });

    const page = await context.newPage();

    console.log('✅ 页面创建成功\n');

    // 步骤3：访问百度（简单测试）
    console.log('📋 步骤3：访问百度（测试网络连接）');
    console.log('─'.repeat(70));

    await page.goto('https://www.baidu.com', { waitUntil: 'domcontentloaded', timeout: 10000 });

    const title = await page.title();
    console.log(`✅ 成功访问: ${title}\n`);

    // 步骤4：截图
    console.log('📋 步骤4：保存截图');
    console.log('─'.repeat(70));

    await page.screenshot({ path: 'test-reports/baidu-screenshot.png' });
    console.log('✅ 截图已保存: test-reports/baidu-screenshot.png\n');

    // 步骤5：尝试访问小红书
    console.log('📋 步骤5：尝试访问小红书');
    console.log('─'.repeat(70));

    try {
      await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 15000 });

      const xhsTitle = await page.title();
      const xhsUrl = page.url();

      console.log(`✅ 成功访问小红书`);
      console.log(`   标题: ${xhsTitle}`);
      console.log(`   URL: ${xhsUrl}\n`);

      // 截图
      await page.screenshot({ path: 'test-reports/xiaohongshu-screenshot.png' });
      console.log('✅ 小红书截图已保存: test-reports/xiaohongshu-screenshot.png\n');

      // 检查页面内容
      const pageContent = await page.content();
      console.log(`   页面HTML长度: ${pageContent.length} 字符`);

      // 检查是否有搜索框或常见元素
      const hasSearchBox = await page.locator('input[type="search"]').count();
      const hasLinks = await page.locator('a').count();

      console.log(`   搜索框: ${hasSearchBox} 个`);
      console.log(`   链接: ${hasLinks} 个\n`);

      if (hasLinks < 5) {
        console.log('⚠️  警告：页面元素很少，可能被反爬虫检测\n');
      }
    } catch (error) {
      console.error('❌ 访问小红书失败:', error.message);
      console.log('💡 可能原因：');
      console.log('   1. 网络连接问题');
      console.log('   2. 小红书服务器拒绝访问');
      console.log('   3. 反爬虫检测\n');
    }

    // 关闭浏览器
    await browser.close();
    console.log('✅ 浏览器已关闭\n');

    // 总结
    console.log('═'.repeat(70));
    console.log('✅ Playwright基础测试完成！');
    console.log('═'.repeat(70) + '\n');

    console.log('测试结果：');
    console.log('   - Playwright安装：✅');
    console.log('   - 浏览器启动：✅');
    console.log('   - 网络连接：✅（百度可访问）');
    console.log('   - 小红书访问：请查看上面的输出\n');

    console.log('📋 下一步：');
    console.log('   1. 查看截图文件了解实际情况');
    console.log('   2. 如果小红书可访问，继续测试选择器');
    console.log('   3. 如果小红书被阻止，需要改进反检测策略\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);

    console.log('\n💡 排查建议：');
    console.log('   1. 运行: pnpm exec playwright install chromium');
    console.log('   2. 检查网络连接');
    console.log('   3. 查看完整错误信息\n');

    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // 忽略关闭错误
      }
    }
  }
}

// 运行测试
testBasic();
