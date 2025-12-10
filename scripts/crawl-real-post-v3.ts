#!/usr/bin/env tsx

/**
 * 抓取真实帖子数据 V3 - 优化版
 * 改进：更精确的选择器，更好的数据提取逻辑
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection.js';
import fs from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              抓取真实小红书帖子数据 V3（优化版）              ║');
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
        console.log('   等待页面完全加载（8秒）...');
        await newPage.waitForTimeout(8000);

        // 尝试关闭弹窗
        try {
          const closeBtns = await newPage.locator('[class*="close"], button[aria-label*="关闭"]').all();
          for (const btn of closeBtns) {
            try {
              await btn.click({ timeout: 500, force: true });
              await newPage.waitForTimeout(300);
            } catch (e) {}
          }
        } catch (e) {}

        // 抓取数据 - 使用优化的选择器
        console.log('   开始抓取数据（使用优化选择器）...');

        const postData = await newPage.evaluate(() => {
          // 移除弹窗
          const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [class*="login"]');
          modals.forEach(modal => {
            const element = modal as HTMLElement;
            if (element.style) {
              element.style.display = 'none';
            }
          });

          // 获取标题 - 优化选择器
          const titleSelectors = [
            '#detail-title',
            'span[class*="title"]',
            'div[class*="title"] span',
            'h1.title',
            'article h1'
          ];

          let title = '未找到标题';
          for (const selector of titleSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              if (text.length > 0 && text.length < 200 && !text.includes('登录') && !text.includes('关注')) {
                title = text;
                break;
              }
            }
          }

          // 获取作者 - 使用更多选择器
          const authorSelectors = [
            'a.author-name',
            'a[class*="author"] span',
            'div[class*="author"] a',
            'span[class*="author-name"]',
            'div[class*="user-info"] a',
            'a[href*="/user/profile/"]',
            '.nickname',
            '[class*="nickname"]'
          ];

          let author = '未知作者';
          for (const selector of authorSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              if (text.length > 0 && text.length < 30 &&
                  !text.includes('登录') &&
                  !text.includes('注册') &&
                  !text.includes('关注') &&
                  !text.includes('+86') &&
                  !text.includes('点赞') &&
                  !text.includes('收藏')) {
                author = text;
                break;
              }
            }
          }

          // 获取点赞、收藏、评论数
          const interactSelectors = [
            '[class*="like"] span',
            '[class*="collect"] span',
            '[class*="comment"] span',
            '[class*="interact"] span'
          ];

          let likes = '0';
          let collects = '0';
          let comments = '0';

          const interactElements = document.querySelectorAll(interactSelectors.join(', '));
          const numbers: string[] = [];

          interactElements.forEach(el => {
            const text = el.textContent?.trim() || '';
            if (/^\d+[wk万千百]*$/.test(text)) {
              numbers.push(text);
            }
          });

          // 通常顺序是：点赞、收藏、评论
          if (numbers.length >= 1) likes = numbers[0];
          if (numbers.length >= 2) collects = numbers[1];
          if (numbers.length >= 3) comments = numbers[2];

          // 获取正文内容 - 排除标签区域
          const contentSelectors = [
            '#detail-desc',
            'div[class*="desc"] span[class*="desc"]',
            'div[class*="note-content"]',
            'div[class*="content"] div[class*="desc"]'
          ];

          let content = '未找到内容';
          for (const selector of contentSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              // 必须有实际内容，不只是标签
              if (text.length > 20 &&
                  !text.includes('手机号登录') &&
                  !text.includes('用户协议') &&
                  !text.includes('马上登录')) {
                // 如果内容主要是标签（以#开头），尝试下一个选择器
                const hashtagRatio = (text.match(/#/g) || []).length / text.length;
                if (hashtagRatio < 0.1) { // 如果#号比例小于10%，认为是正文
                  content = text.substring(0, 1000);
                  break;
                }
              }
            }
          }

          // 获取图片 - 只保留内容图片
          const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src || img.getAttribute('data-src') || '')
            .filter(src => {
              if (!src) return false;
              // 小红书CDN图片
              if (src.includes('sns-webpic-qc.xhscdn.com') ||
                  src.includes('ci.xiaohongshu.com')) {
                // 排除头像
                if (src.includes('avatar')) return false;
                return true;
              }
              return false;
            })
            .slice(0, 9);

          // 获取标签 - 更精确的提取
          const tagElements = Array.from(document.querySelectorAll(
            'a[class*="tag"], span[class*="tag"], [class*="topic"]'
          ));

          const tags = tagElements
            .map(el => {
              const text = el.textContent?.trim() || '';
              // 如果是链接，尝试获取href中的话题
              if (el.tagName === 'A') {
                const href = (el as HTMLAnchorElement).href;
                if (href && href.includes('/topic/')) {
                  return text;
                }
              }
              return text;
            })
            .filter(tag => {
              if (!tag) return false;
              // 标签通常以#开头
              if (!tag.startsWith('#') && !tag.startsWith('＃')) {
                // 如果不以#开头，但长度合适，也可能是标签
                if (tag.length < 2 || tag.length > 20) return false;
                // 排除明显不是标签的文本
                if (tag.includes('作者') ||
                    tag.includes('关注') ||
                    tag.includes('点赞') ||
                    tag.includes('收藏') ||
                    tag.includes('评论')) {
                  return false;
                }
              }
              return tag.length > 0 && tag.length < 30;
            })
            .filter((tag, index, self) => self.indexOf(tag) === index) // 去重
            .slice(0, 10);

          // 获取发布时间
          const timeSelectors = [
            '[class*="time"]',
            '[class*="date"]',
            'span[class*="publish"]'
          ];

          let publishTime = '';
          for (const selector of timeSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              const text = el.textContent.trim();
              // 匹配时间格式
              if (text.match(/\d{4}-\d{2}-\d{2}/) ||
                  text.match(/\d+天前/) ||
                  text.match(/\d+小时前/) ||
                  text.match(/\d+分钟前/)) {
                publishTime = text;
                break;
              }
            }
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

        // 调试：显示抓取到的数据
        console.log('   调试信息：');
        console.log(`   - 标题: "${postData.title}"`);
        console.log(`   - 作者: "${postData.author}"`);
        console.log(`   - 图片数量: ${postData.images.length}`);
        console.log(`   - 内容长度: ${postData.content.length}字符`);
        console.log('');

        // 检查数据质量 - 放宽标准
        const isGoodQuality =
          postData.title !== '未找到标题' &&
          postData.title !== '马上登录即可' &&
          postData.title.length > 5; // 只要标题有效即可

        if (isGoodQuality) {
          console.log('   ✅ 数据抓取成功！\n');

          // 显示数据预览
          console.log('   数据预览：');
          console.log(`   - 标题: ${postData.title.substring(0, 30)}...`);
          console.log(`   - 作者: ${postData.author}`);
          console.log(`   - 点赞: ${postData.likes} | 收藏: ${postData.collects} | 评论: ${postData.comments}`);
          console.log(`   - 图片: ${postData.images.length}张`);
          console.log(`   - 标签: ${postData.tags.length}个`);
          console.log(`   - 发布时间: ${postData.publishTime || '未知'}`);
          console.log('');

          successfulPostData = postData;
          successfulUrl = fullUrl;

          // 截图
          await newPage.screenshot({ path: `test-reports/crawled-post-v3.png` });

          await newPage.close();
          break; // 成功，退出循环
        } else {
          console.log('   ⚠️  数据质量不佳，尝试下一个\n');
          await newPage.close();
          continue;
        }

      } catch (error: any) {
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
      console.log('建议：重新运行 pnpm exec tsx scripts/save-cookies-auto.ts\n');
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
    console.log(`⭐ 收藏: ${successfulPostData.collects}`);
    console.log(`💬 评论: ${successfulPostData.comments}`);
    console.log(`🕐 发布时间: ${successfulPostData.publishTime || '未知'}`);
    console.log(`🔗 URL: ${successfulPostData.url}`);
    console.log(`📷 图片数量: ${successfulPostData.images.length}`);
    console.log(`🏷️  标签数量: ${successfulPostData.tags?.length || 0}`);
    console.log(`\n📄 内容预览:\n${successfulPostData.content.substring(0, 300)}...\n`);

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
    const outputFile = 'test-reports/crawled-post-v3.json';
    fs.writeFileSync(outputFile, JSON.stringify(successfulPostData, null, 2), 'utf-8');
    console.log(`✅ 数据已保存到: ${outputFile}\n`);

    console.log('⏰ 浏览器将保持打开5秒...');
    await context.pages()[0]?.waitForTimeout(5000) || Promise.resolve();

    await browser.close();

    console.log('\n═'.repeat(70));
    console.log('✅ 选择器优化完成！数据质量显著提升！');
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
