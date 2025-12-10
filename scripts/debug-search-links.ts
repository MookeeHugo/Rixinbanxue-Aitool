/**
 * 调试搜索页面链接
 *
 * 查看搜索页面上找到的具体链接
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection';
import * as fs from 'fs';
import * as path from 'path';

async function debugSearchLinks() {
  console.log('======================================');
  console.log('🔍 调试搜索页面链接');
  console.log('======================================\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await injectAntiDetection(page);

  try {
    // 加载cookies
    const cookiesPath = path.resolve(process.cwd(), 'test-reports/xiaohongshu-cookies.json');
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await context.addCookies(cookies);
      console.log(`✓ 已加载 ${cookies.length} 个cookies\n`);
    }

    // 访问搜索页面
    const keyword = '初中数学';
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;

    console.log(`访问搜索页面: ${searchUrl}\n`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // 截图
    const screenshotPath = 'test-reports/debug-search-page.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ 截图已保存: ${screenshotPath}\n`);

    // 获取页面URL（检查是否被重定向）
    const currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);

    if (currentUrl.includes('/explore?') || currentUrl === 'https://www.xiaohongshu.com/explore') {
      console.log('⚠️  页面被重定向到探索页面！');
      console.log('可能原因: Cookies过期或需要登录\n');
    } else {
      console.log('✓ 成功访问搜索页面\n');
    }

    // 查找所有帖子链接
    console.log('查找帖子链接...');
    const links = await page.evaluate(() => {
      const linkElements = Array.from(document.querySelectorAll('a[href*="/explore/"]'));
      return linkElements.map((link) => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim().substring(0, 50) || '';
        return { href, text };
      });
    });

    console.log(`找到 ${links.length} 个链接\n`);

    if (links.length > 0) {
      console.log('前10个链接：');
      links.slice(0, 10).forEach((link, i) => {
        console.log(`${i + 1}. ${link.href}`);
        if (link.text) {
          console.log(`   文本: ${link.text}`);
        }
      });
    } else {
      console.log('⚠️  未找到任何帖子链接');
      console.log('可能原因：');
      console.log('1. 页面结构变化');
      console.log('2. 需要登录');
      console.log('3. 关键词无结果');
    }

    // 检查页面HTML
    console.log('\n检查页面关键元素...');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        hasLoginModal: !!document.querySelector('[class*="login"]'),
        hasNoteCards: !!document.querySelector('[class*="note-card"]'),
        hasSearchResults: !!document.querySelector('[class*="search-result"]'),
        bodyText: document.body.textContent?.substring(0, 200) || '',
      };
    });

    console.log('页面标题:', pageInfo.title);
    console.log('有登录弹窗:', pageInfo.hasLoginModal ? '✓ 是' : '✗ 否');
    console.log('有笔记卡片:', pageInfo.hasNoteCards ? '✓ 是' : '✗ 否');
    console.log('有搜索结果:', pageInfo.hasSearchResults ? '✓ 是' : '✗ 否');
    console.log('页面文本预览:', pageInfo.bodyText.substring(0, 100));

    console.log('\n======================================');
    console.log('调试信息已收集');
    console.log('======================================');
    console.log('请查看截图以了解详情');

    // 等待用户手动检查
    console.log('\n按Enter键关闭浏览器...');
    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });

    await browser.close();

  } catch (error: any) {
    console.error('❌ 调试失败:', error.message);
    await browser.close();
    process.exit(1);
  }
}

debugSearchLinks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
