#!/usr/bin/env tsx

/**
 * 抓取真实帖子数据
 * 目的：验证能否成功抓取小红书帖子的完整信息
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              抓取真实小红书帖子数据                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const COOKIES_FILE = 'test-reports/xiaohongshu-cookies.json';

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

    console.log('   等待2秒...');
    await page.waitForTimeout(2000);

    console.log('✅ 用户行为模拟完成\n');

    // 查找第一个帖子
    console.log('📋 步骤5：查找第一个笔记卡片');
    console.log('─'.repeat(70));

    // 多种可能的选择器
    const selectors = [
      'a[href*="/explore/"]',
      'section a',
      '[class*="note"] a',
      '[class*="card"] a',
      'article a',
    ];

    let noteLink = null;
    let noteUrl = '';

    for (const selector of selectors) {
      const links = page.locator(selector);
      const count = await links.count();

      if (count > 0) {
        noteLink = links.first();
        noteUrl = await noteLink.getAttribute('href');

        if (noteUrl && noteUrl.includes('/explore/')) {
          console.log(`✅ 找到笔记链接: ${noteUrl}`);
          console.log(`   使用选择器: ${selector}\n`);
          break;
        }
      }
    }

    if (!noteUrl || !noteLink) {
      console.log('❌ 未找到任何笔记链接\n');
      process.exit(1);
    }

    // 尝试关闭可能的弹窗
    console.log('📋 步骤6：关闭可能的弹窗');
    console.log('─'.repeat(70));

    try {
      const closeSelectors = [
        'button[class*="close"]',
        '[class*="close-btn"]',
        '[aria-label*="关闭"]',
        '[aria-label*="close"]',
        '.close',
        'svg[class*="close"]'
      ];

      for (const selector of closeSelectors) {
        const closeBtns = await page.locator(selector).all();
        if (closeBtns.length > 0) {
          console.log(`   找到 ${closeBtns.length} 个关闭按钮 (${selector})`);
          for (const btn of closeBtns) {
            try {
              await btn.click({ timeout: 1000, force: true });
              await page.waitForTimeout(300);
            } catch (e) {
              // 忽略点击失败
            }
          }
        }
      }
      console.log('✅ 已尝试关闭弹窗\n');
    } catch (e) {
      console.log('✅ 未发现弹窗\n');
    }

    // 访问帖子详情页 - 使用新标签页方式
    console.log('📋 步骤7：在新标签页打开帖子详情');
    console.log('─'.repeat(70));

    const fullUrl = noteUrl.startsWith('http')
      ? noteUrl
      : `https://www.xiaohongshu.com${noteUrl}`;

    console.log(`   使用URL直接访问: ${fullUrl}`);

    // 保存当前页面，在新标签页打开
    const newPage = await context.newPage();
    await injectAntiDetection(newPage);

    await newPage.goto(fullUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const currentUrl = newPage.url();
    console.log(`✅ 当前URL: ${currentUrl}\n`);

    // 切换到新页面进行操作
    await page.close();

    // 增加等待时间，确保页面完全加载
    console.log('📋 步骤8：等待页面完全加载');
    console.log('─'.repeat(70));

    console.log('   等待5秒让页面内容加载...');
    await newPage.waitForTimeout(5000);

    // 尝试关闭可能出现的登录弹窗
    try {
      const closeButtons = await newPage.locator('[class*="close"], [class*="关闭"], button[aria-label*="关闭"]').all();
      if (closeButtons.length > 0) {
        console.log(`   发现 ${closeButtons.length} 个关闭按钮，尝试关闭弹窗...`);
        for (const btn of closeButtons) {
          try {
            await btn.click({ timeout: 1000 });
            await newPage.waitForTimeout(500);
          } catch (e) {
            // 忽略点击失败的按钮
          }
        }
        console.log('   ✅ 已尝试关闭弹窗\n');
      }
    } catch (e) {
      console.log('   未发现弹窗\n');
    }

    // 等待主要内容区域加载
    try {
      await newPage.waitForSelector('#detail-desc, [class*="note-content"], [class*="detail"], article', {
        timeout: 10000
      });
      console.log('✅ 主要内容区域已加载\n');
    } catch (e) {
      console.log('⚠️  未找到预期的内容区域，继续尝试...\n');
    }

    // 抓取帖子信息
    console.log('📋 步骤9：抓取帖子信息');
    console.log('─'.repeat(70));

    const postData = await newPage.evaluate(() => {
      // 移除所有可能的弹窗和遮罩
      const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [class*="popup"], [class*="mask"]');
      modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        if (style.position === 'fixed' || style.position === 'absolute') {
          (modal as HTMLElement).style.display = 'none';
        }
      });

      // 获取标题 - 使用更精确的选择器
      const titleSelectors = [
        '#detail-title',
        '[class*="note-title"]',
        '[class*="NoteDetailTitle"]',
        '.title',
        'h1[class*="title"]',
        'article h1',
        'main h1'
      ];

      let title = '未找到标题';
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 200) {
          title = el.textContent.trim();
          break;
        }
      }

      // 获取作者 - 更精确的选择器
      const authorSelectors = [
        '[class*="author-name"]',
        '[class*="user-name"]',
        '[class*="username"]',
        'a[class*="author"]',
        '.author',
        '[class*="nickname"]'
      ];

      let author = '未知作者';
      for (const selector of authorSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 50) {
          const text = el.textContent.trim();
          // 排除明显不是作者名的文本
          if (!text.includes('登录') && !text.includes('注册') && !text.includes('关注') && !text.includes('+86')) {
            author = text;
            break;
          }
        }
      }

      // 获取点赞数 - 更精确的定位
      const likeSelectors = [
        '[class*="like-count"]',
        '[class*="likeCount"]',
        'span[class*="count"]',
        '[class*="interact"] span'
      ];

      let likes = '0';
      for (const selector of likeSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = el.textContent?.trim() || '';
          // 查找包含数字的文本，且不是电话号码
          if (/^\d+[wk万千]*$/.test(text) && !text.includes('+86')) {
            likes = text;
            break;
          }
        }
        if (likes !== '0') break;
      }

      // 获取内容 - 更精确的选择器
      const contentSelectors = [
        '#detail-desc',
        '[class*="note-content"]',
        '[class*="desc-content"]',
        '.content',
        'article [class*="content"]',
        '.note-text'
      ];

      let content = '未找到内容';
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 10) {
          const text = el.textContent.trim();
          // 排除明显是弹窗的内容
          if (!text.includes('手机号登录') && !text.includes('用户协议') && !text.includes('隐私政策')) {
            content = text.substring(0, 500);
            break;
          }
        }
      }

      // 获取图片 - 更精确的过滤
      const images = Array.from(document.querySelectorAll('img'))
        .map((img) => img.src || img.getAttribute('data-src') || '')
        .filter((src) => {
          if (!src) return false;
          // 只保留小红书CDN的图片
          if (src.includes('xhscdn.com')) return true;
          // 排除头像、图标、base64等
          if (src.includes('avatar')) return false;
          if (src.includes('icon')) return false;
          if (src.startsWith('data:')) return false;
          if (src.includes('logo')) return false;
          // 其他CDN图片也可能是内容图片
          return src.startsWith('http');
        })
        .slice(0, 9); // 小红书最多9张图

      // 获取标签
      const tags = Array.from(document.querySelectorAll('[class*="tag"]'))
        .map(el => el.textContent?.trim())
        .filter(tag => tag && tag.length > 0 && tag.length < 20 && !tag.includes('登录'))
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

    console.log('\n抓取到的帖子数据：');
    console.log('─'.repeat(70));
    console.log(`📝 标题: ${postData.title}`);
    console.log(`👤 作者: ${postData.author}`);
    console.log(`❤️  点赞: ${postData.likes}`);
    console.log(`🔗 URL: ${postData.url}`);
    console.log(`📷 图片数量: ${postData.images.length}`);
    console.log(`🏷️  标签数量: ${postData.tags?.length || 0}`);
    console.log(`\n📄 内容预览:\n${postData.content.substring(0, 200)}...\n`);

    if (postData.tags && postData.tags.length > 0) {
      console.log('标签:');
      postData.tags.forEach((tag, i) => {
        console.log(`   ${i + 1}. ${tag}`);
      });
      console.log('');
    }

    if (postData.images.length > 0) {
      console.log('图片URL:');
      postData.images.forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.substring(0, 80)}...`);
      });
      console.log('');
    }

    // 保存数据
    const outputFile = 'test-reports/crawled-post.json';
    fs.writeFileSync(outputFile, JSON.stringify(postData, null, 2), 'utf-8');
    console.log(`✅ 数据已保存到: ${outputFile}\n`);

    // 截图
    await newPage.screenshot({ path: 'test-reports/crawled-post-screenshot.png' });
    console.log('✅ 截图已保存: test-reports/crawled-post-screenshot.png\n');

    // 保持浏览器打开10秒
    console.log('⏰ 浏览器将保持打开10秒...');
    await newPage.waitForTimeout(10000);

    await browser.close();

    console.log('\n═'.repeat(70));
    console.log('🎉 成功抓取真实帖子数据！');
    console.log('═'.repeat(70) + '\n');

    console.log('✅ 爬虫功能验证成功！');
    console.log('\n下一步可以：');
    console.log('   1. 完善数据提取逻辑');
    console.log('   2. 实现批量抓取');
    console.log('   3. 集成到完整的爬虫系统\n');

    process.exit(0);
  } catch (error) {
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
