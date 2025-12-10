#!/usr/bin/env tsx

/**
 * 抓取真实帖子数据 V2
 * 改进：尝试多个笔记链接，处理404错误
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              抓取真实小红书帖子数据 V2                        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const COOKIES_FILE = 'test-reports/xiaohongshu-cookies.json';
const MAX_RETRIES = 5; // 最多尝试5个不同的笔记

async function crawlRealPost() {
  let browser = null;

  try {
    // 读取cookies
    console.log('📋 步骤1：加载cookies');
    console.log('─'.repeat(70));

    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    console.log(`✅ 已加载 ${cookies.length} 个cookies\n`);

    // 启动浏览器
    console.log('📋 步骤2：启动浏览器');
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

    // 访问探索页面
    console.log('📋 步骤3：访问探索页面');
    console.log('─'.repeat(70));

    await page.goto('https://www.xiaohongshu.com/explore', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log('✅ 已访问探索页面\n');

    // 模拟真实用户行为
    console.log('📋 步骤4：模拟真实用户行为');
    console.log('─'.repeat(70));

    console.log('   模拟鼠标移动...');
    await page.mouse.move(500, 300);
    await page.waitForTimeout(500);
    await page.mouse.move(800, 500);
    await page.waitForTimeout(500);

    console.log('   模拟页面滚动...');
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await page.waitForTimeout(1000);

    console.log('   等待3秒...');
    await page.waitForTimeout(3000);

    console.log('✅ 用户行为模拟完成\n');

    // 查找多个帖子链接
    console.log('📋 步骤5：查找笔记卡片');
    console.log('─'.repeat(70));

    const noteLinks = await page.locator('a[href*="/explore/"]').all();
    console.log(`✅ 找到 ${noteLinks.length} 个笔记链接\n`);

    if (noteLinks.length === 0) {
      console.log('❌ 未找到任何笔记链接\n');
      process.exit(1);
    }

    // 尝试多个笔记链接
    let successfulPostData = null;
    let successfulUrl = '';

    for (let i = 0; i < Math.min(MAX_RETRIES, noteLinks.length); i++) {
      console.log(`📋 尝试第 ${i + 1}/${Math.min(MAX_RETRIES, noteLinks.length)} 个笔记`);
      console.log('─'.repeat(70));

      const noteUrl = await noteLinks[i].getAttribute('href');
      if (!noteUrl || !noteUrl.includes('/explore/')) {
        console.log('   跳过：无效链接\n');
        continue;
      }

      const fullUrl = noteUrl.startsWith('http')
        ? noteUrl
        : `https://www.xiaohongshu.com${noteUrl}`;

      console.log(`   URL: ${fullUrl}`);

      // 在新标签页打开
      const newPage = await context.newPage();
      await injectAntiDetection(newPage);

      try {
        await newPage.goto(fullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        await newPage.waitForTimeout(3000);

        const currentUrl = newPage.url();
        console.log(`   当前URL: ${currentUrl}`);

        // 检查是否被重定向到404或explore
        if (currentUrl.includes('/404') || currentUrl.includes('error')) {
          console.log('   ❌ 被重定向到404页面，尝试下一个\n');
          await newPage.close();
          continue;
        }

        if (currentUrl.includes('/explore?') || currentUrl === 'https://www.xiaohongshu.com/explore') {
          console.log('   ❌ 被重定向回explore页面，尝试下一个\n');
          await newPage.close();
          continue;
        }

        // 成功进入详情页
        console.log('   ✅ 成功进入详情页！\n');

        // 等待页面加载
        console.log('   等待页面完全加载...');
        await newPage.waitForTimeout(5000);

        // 尝试关闭弹窗
        try {
          const closeBtns = await newPage.locator('[class*="close"], button[aria-label*="关闭"]').all();
          for (const btn of closeBtns) {
            try {
              await btn.click({ timeout: 500, force: true });
            } catch (e) {}
          }
        } catch (e) {}

        // 抓取数据
        console.log('   开始抓取数据...');

        const postData = await newPage.evaluate(() => {
          // 移除弹窗
          const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
          modals.forEach(modal => {
            (modal as HTMLElement).style.display = 'none';
          });

          // 获取标题
          const titleSelectors = [
            '#detail-title',
            '[class*="note-title"]',
            'h1.title',
            'article h1'
          ];

          let title = '未找到标题';
          for (const selector of titleSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 200) {
              const text = el.textContent.trim();
              if (!text.includes('登录') && !text.includes('马上登录')) {
                title = text;
                break;
              }
            }
          }

          // 获取作者
          const authorSelectors = [
            '[class*="author-name"]',
            '[class*="user-name"]',
            'a[class*="author"]'
          ];

          let author = '未知作者';
          for (const selector of authorSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              if (text.length > 0 && text.length < 50 && !text.includes('登录') && !text.includes('+86')) {
                author = text;
                break;
              }
            }
          }

          // 获取点赞数
          let likes = '0';
          const likeElements = document.querySelectorAll('[class*="like"], [class*="count"]');
          for (const el of Array.from(likeElements)) {
            const text = el.textContent?.trim() || '';
            if (/^\d+[wk万千]*$/.test(text) && !text.includes('+86')) {
              likes = text;
              break;
            }
          }

          // 获取内容
          const contentSelectors = [
            '#detail-desc',
            '[class*="note-content"]',
            '[class*="desc"]',
            'article'
          ];

          let content = '未找到内容';
          for (const selector of contentSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent && el.textContent.trim().length > 20) {
              const text = el.textContent.trim();
              if (!text.includes('手机号登录') && !text.includes('用户协议')) {
                content = text.substring(0, 500);
                break;
              }
            }
          }

          // 获取图片
          const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src || img.getAttribute('data-src') || '')
            .filter(src => {
              if (!src) return false;
              if (src.includes('xhscdn.com') && !src.includes('avatar')) return true;
              return false;
            })
            .slice(0, 9);

          // 获取标签
          const tags = Array.from(document.querySelectorAll('[class*="tag"]'))
            .map(el => el.textContent?.trim())
            .filter(tag => tag && tag.length > 0 && tag.length < 20)
            .slice(0, 10);

          return {
            title,
            author,
            likes,
            content,
            images,
            tags,
            url: window.location.href,
          };
        });

        // 检查数据质量
        if (postData.title !== '未找到标题' && postData.title !== '马上登录即可') {
          console.log('   ✅ 数据抓取成功！\n');
          successfulPostData = postData;
          successfulUrl = fullUrl;

          // 截图
          await newPage.screenshot({ path: `test-reports/crawled-post-success.png` });

          await newPage.close();
          break; // 成功，退出循环
        } else {
          console.log('   ⚠️  数据质量不佳，尝试下一个\n');
          await newPage.close();
          continue;
        }

      } catch (error) {
        console.log(`   ❌ 错误: ${error.message}\n`);
        try {
          await newPage.close();
        } catch (e) {}
        continue;
      }
    }

    // 关闭探索页面
    await page.close();

    if (!successfulPostData) {
      console.log('\n❌ 尝试了多个笔记但都失败了\n');
      console.log('可能原因：');
      console.log('1. Cookies可能已过期，需要重新登录');
      console.log('2. 所有尝试的笔记都被设为私密或删除');
      console.log('3. 小红书反爬虫机制检测到自动化访问\n');
      console.log('建议：');
      console.log('1. 重新运行: pnpm exec tsx scripts/save-cookies-auto.ts');
      console.log('2. 或者在浏览器中手动访问一个帖子，确认链接有效\n');
      await browser.close();
      process.exit(1);
    }

    // 输出成功抓取的数据
    console.log('\n═'.repeat(70));
    console.log('🎉 成功抓取到真实帖子数据！');
    console.log('═'.repeat(70));
    console.log(`\n📝 标题: ${successfulPostData.title}`);
    console.log(`👤 作者: ${successfulPostData.author}`);
    console.log(`❤️  点赞: ${successfulPostData.likes}`);
    console.log(`🔗 URL: ${successfulPostData.url}`);
    console.log(`📷 图片数量: ${successfulPostData.images.length}`);
    console.log(`🏷️  标签数量: ${successfulPostData.tags?.length || 0}`);
    console.log(`\n📄 内容预览:\n${successfulPostData.content.substring(0, 200)}...\n`);

    if (successfulPostData.tags && successfulPostData.tags.length > 0) {
      console.log('标签:');
      successfulPostData.tags.forEach((tag: string, i: number) => {
        console.log(`   ${i + 1}. ${tag}`);
      });
      console.log('');
    }

    if (successfulPostData.images.length > 0) {
      console.log('图片URL:');
      successfulPostData.images.forEach((img: string, i: number) => {
        console.log(`   ${i + 1}. ${img.substring(0, 80)}...`);
      });
      console.log('');
    }

    // 保存数据
    const outputFile = 'test-reports/crawled-post-v2.json';
    fs.writeFileSync(outputFile, JSON.stringify(successfulPostData, null, 2), 'utf-8');
    console.log(`✅ 数据已保存到: ${outputFile}\n`);

    console.log('⏰ 浏览器将保持打开10秒...');
    await context.pages()[0]?.waitForTimeout(5000) || Promise.resolve();

    await browser.close();

    console.log('\n═'.repeat(70));
    console.log('✅ 爬虫功能验证成功！');
    console.log('═'.repeat(70) + '\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 抓取失败:', error.message);
    console.error(error);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    process.exit(1);
  }
}

crawlRealPost();
