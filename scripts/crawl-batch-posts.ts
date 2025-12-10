#!/usr/bin/env tsx

/**
 * 批量抓取小红书帖子数据
 * 功能：从explore页面批量抓取多个帖子的完整信息
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';
import path from 'path';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              批量抓取小红书帖子数据                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const COOKIES_FILE = 'test-reports/xiaohongshu-cookies.json';
const TARGET_COUNT = 10; // 目标抓取数量
const MAX_ATTEMPTS = 30; // 最多尝试的链接数

interface PostData {
  title: string;
  author: string;
  likes: string;
  collects: string;
  comments: string;
  content: string;
  images: string[];
  tags: string[];
  publishTime: string;
  url: string;
  crawledAt: string; // 抓取时间
}

async function crawlBatchPosts() {
  let browser: Browser | null = null;
  const successfulPosts: PostData[] = [];
  let attemptCount = 0;

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

    // 模拟用户行为
    console.log('📋 步骤4：模拟真实用户行为');
    console.log('─'.repeat(70));

    await page.mouse.move(500, 300);
    await page.waitForTimeout(300);
    await page.mouse.move(800, 500);
    await page.waitForTimeout(300);

    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(1000);

    console.log('✅ 用户行为模拟完成\n');

    // 获取笔记链接列表
    console.log('📋 步骤5：获取笔记链接列表');
    console.log('─'.repeat(70));

    const noteLinks = await page.locator('a[href*="/explore/"]').all();
    console.log(`✅ 找到 ${noteLinks.length} 个笔记链接\n`);

    if (noteLinks.length === 0) {
      console.log('❌ 未找到任何笔记链接\n');
      await browser.close();
      process.exit(1);
    }

    // 开始批量抓取
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log(`║  开始批量抓取 - 目标: ${TARGET_COUNT}个帖子                          `);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    for (let i = 0; i < Math.min(MAX_ATTEMPTS, noteLinks.length); i++) {
      if (successfulPosts.length >= TARGET_COUNT) {
        console.log(`\n✅ 已达到目标数量 ${TARGET_COUNT}，停止抓取\n`);
        break;
      }

      attemptCount++;
      console.log(`\n[${ successfulPosts.length + 1}/${TARGET_COUNT}] 尝试第 ${attemptCount} 个链接`);
      console.log('─'.repeat(70));

      const noteUrl = await noteLinks[i].getAttribute('href');
      if (!noteUrl || !noteUrl.includes('/explore/')) {
        console.log('跳过：无效链接\n');
        continue;
      }

      const fullUrl = noteUrl.startsWith('http')
        ? noteUrl
        : `https://www.xiaohongshu.com${noteUrl}`;

      console.log(`URL: ${fullUrl.substring(0, 80)}...`);

      // 在新标签页打开
      const newPage = await context.newPage();
      await injectAntiDetection(newPage);

      try {
        await newPage.goto(fullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        await newPage.waitForTimeout(2000);

        const currentUrl = newPage.url();

        // 检查重定向
        if (currentUrl.includes('/404') ||
            currentUrl.includes('error') ||
            currentUrl.includes('/explore?') ||
            currentUrl === 'https://www.xiaohongshu.com/explore') {
          console.log('❌ 被重定向，跳过');
          await newPage.close();
          continue;
        }

        console.log('✅ 进入详情页');

        // 等待加载
        await newPage.waitForTimeout(6000);

        // 关闭弹窗
        try {
          const closeBtns = await newPage.locator('[class*="close"]').all();
          for (const btn of closeBtns) {
            try {
              await btn.click({ timeout: 500, force: true });
              await newPage.waitForTimeout(200);
            } catch (e) {}
          }
        } catch (e) {}

        // 抓取数据
        const postData = await newPage.evaluate(() => {
          // 移除弹窗
          const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
          modals.forEach(modal => {
            (modal as HTMLElement).style.display = 'none';
          });

          // 标题
          const titleSelectors = ['#detail-title', 'span[class*="title"]', 'div[class*="title"] span'];
          let title = '未找到标题';
          for (const selector of titleSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              if (text.length > 0 && text.length < 200 && !text.includes('登录')) {
                title = text;
                break;
              }
            }
          }

          // 作者
          const authorSelectors = [
            'a.author-name',
            'a[class*="author"] span',
            'span[class*="author-name"]',
            '[class*="nickname"]'
          ];
          let author = '未知作者';
          for (const selector of authorSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              if (text.length > 0 && text.length < 30 &&
                  !text.includes('登录') && !text.includes('关注')) {
                author = text;
                break;
              }
            }
          }

          // 互动数据
          const interactElements = document.querySelectorAll('[class*="interact"] span, [class*="like"] span');
          const numbers: string[] = [];
          interactElements.forEach(el => {
            const text = el.textContent?.trim() || '';
            if (/^\d+[wk万千百]*$/.test(text)) {
              numbers.push(text);
            }
          });

          const likes = numbers[0] || '0';
          const collects = numbers[1] || '0';
          const comments = numbers[2] || '0';

          // 内容
          const contentSelectors = ['#detail-desc', 'div[class*="desc"] span'];
          let content = '';
          for (const selector of contentSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              if (text.length > 10 && !text.includes('手机号登录')) {
                content = text.substring(0, 1000);
                break;
              }
            }
          }

          // 图片
          const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src || '')
            .filter(src => src && src.includes('xhscdn.com') && !src.includes('avatar'))
            .slice(0, 9);

          // 标签
          const tagElements = Array.from(document.querySelectorAll('a[class*="tag"], [class*="topic"]'));
          const tags = tagElements
            .map(el => el.textContent?.trim() || '')
            .filter(tag => tag.length > 0 && tag.length < 30 && !tag.includes('作者'))
            .filter((tag, index, self) => self.indexOf(tag) === index)
            .slice(0, 10);

          // 时间
          let publishTime = '';
          const timeEl = document.querySelector('[class*="time"]');
          if (timeEl?.textContent) {
            publishTime = timeEl.textContent.trim();
          }

          return {
            title,
            author,
            likes,
            collects,
            comments,
            content,
            images,
            tags,
            publishTime,
            url: window.location.href,
          };
        });

        // 检查质量
        if (postData.title !== '未找到标题' &&
            postData.title !== '马上登录即可' &&
            postData.title.length > 5) {

          // 添加抓取时间
          const finalPostData: PostData = {
            ...postData,
            crawledAt: new Date().toISOString()
          };

          successfulPosts.push(finalPostData);

          console.log(`✅ 成功抓取！(${successfulPosts.length}/${TARGET_COUNT})`);
          console.log(`   标题: ${postData.title.substring(0, 40)}...`);
          console.log(`   作者: ${postData.author}`);
          console.log(`   互动: ❤️${postData.likes} ⭐${postData.collects} 💬${postData.comments}`);
          console.log(`   图片: ${postData.images.length}张 | 标签: ${postData.tags.length}个`);

          // 保存截图
          const screenshotPath = `test-reports/batch/post-${successfulPosts.length}.png`;
          fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
          await newPage.screenshot({ path: screenshotPath });

        } else {
          console.log('⚠️  质量不佳，跳过');
        }

        await newPage.close();

        // 随机延迟，模拟真实用户行为
        const delay = 2000 + Math.random() * 3000; // 2-5秒
        console.log(`⏰ 等待 ${Math.round(delay / 1000)}秒...`);
        await page.waitForTimeout(delay);

      } catch (error: any) {
        console.log(`❌ 错误: ${error.message}`);
        try {
          await newPage.close();
        } catch (e) {}
        continue;
      }
    }

    // 关闭浏览器
    await browser.close();

    // 输出结果
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  批量抓取完成                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 抓取统计：`);
    console.log(`   ✅ 成功: ${successfulPosts.length}个帖子`);
    console.log(`   📝 尝试: ${attemptCount}个链接`);
    console.log(`   📈 成功率: ${Math.round((successfulPosts.length / attemptCount) * 100)}%\n`);

    if (successfulPosts.length === 0) {
      console.log('❌ 未抓取到任何有效数据\n');
      process.exit(1);
    }

    // 保存数据
    const outputFile = 'test-reports/batch-posts.json';
    fs.writeFileSync(outputFile, JSON.stringify(successfulPosts, null, 2), 'utf-8');
    console.log(`✅ 数据已保存到: ${outputFile}\n`);

    // 生成统计报告
    console.log('📊 数据统计：');
    const totalImages = successfulPosts.reduce((sum, post) => sum + post.images.length, 0);
    const totalTags = successfulPosts.reduce((sum, post) => sum + post.tags.length, 0);
    const avgImages = (totalImages / successfulPosts.length).toFixed(1);
    const avgTags = (totalTags / successfulPosts.length).toFixed(1);

    console.log(`   📷 总图片数: ${totalImages}张 (平均${avgImages}张/帖)`);
    console.log(`   🏷️  总标签数: ${totalTags}个 (平均${avgTags}个/帖)`);

    // 显示前3个帖子预览
    console.log('\n📋 帖子预览（前3个）：');
    console.log('─'.repeat(70));
    successfulPosts.slice(0, 3).forEach((post, i) => {
      console.log(`\n${i + 1}. ${post.title.substring(0, 50)}...`);
      console.log(`   作者: ${post.author} | 点赞: ${post.likes}`);
      console.log(`   URL: ${post.url.substring(0, 80)}...`);
    });

    console.log('\n═'.repeat(70));
    console.log('🎉 批量抓取功能验证成功！');
    console.log('═'.repeat(70) + '\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ 批量抓取失败:', error.message);
    console.error(error);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    process.exit(1);
  }
}

crawlBatchPosts();
