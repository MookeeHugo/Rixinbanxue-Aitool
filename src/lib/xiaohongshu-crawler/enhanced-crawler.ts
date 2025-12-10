/**
 * 增强版爬虫 - 对抗重定向
 *
 * 策略：
 * 1. 从搜索页面直接点击链接进入（而不是goto）
 * 2. 增加更真实的用户行为模拟
 * 3. 添加referer头
 * 4. 随机等待更长时间
 */

import { Page, BrowserContext } from 'playwright';
import { injectAntiDetection } from './anti-detection';
import type { XHSPost } from './types';

/**
 * 从搜索页面直接点击进入帖子（模拟真实用户）
 */
export async function crawlFromSearchPage(
  context: BrowserContext,
  searchPage: Page,
  keyword: string,
  maxResults: number,
  minLikes: number = 0
): Promise<XHSPost[]> {
  const posts: XHSPost[] = [];

  try {
    // 1. 访问搜索页面
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;
    console.log(`[EnhancedCrawler] 搜索: "${keyword}"`);

    await searchPage.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await searchPage.waitForTimeout(3000);

    // 2. 模拟真实浏览行为
    console.log('[EnhancedCrawler] 模拟浏览行为...');

    // 鼠标移动到页面中央
    await searchPage.mouse.move(
      Math.random() * 800 + 200,
      Math.random() * 400 + 200
    );
    await searchPage.waitForTimeout(500 + Math.random() * 1000);

    // 慢速滚动（模拟阅读）
    for (let i = 0; i < 3; i++) {
      await searchPage.mouse.wheel(0, 150 + Math.random() * 100);
      await searchPage.waitForTimeout(800 + Math.random() * 1200);
    }

    // 3. 获取所有可见的笔记卡片
    const noteCards = await searchPage.locator('a[href*="/explore/"]').all();
    console.log(`[EnhancedCrawler] 找到 ${noteCards.length} 个笔记`);

    if (noteCards.length === 0) {
      console.log('[EnhancedCrawler] ⚠️  未找到任何笔记');
      return posts;
    }

    // 4. 逐个点击进入帖子详情
    let successCount = 0;
    const maxAttempts = Math.min(noteCards.length, maxResults * 3);

    for (let i = 0; i < maxAttempts && successCount < maxResults; i++) {
      try {
        console.log(`[EnhancedCrawler] [${successCount + 1}/${maxResults}] 尝试第 ${i + 1} 个笔记`);

        // 获取当前笔记的链接（用于日志）
        const noteUrl = await noteCards[i].getAttribute('href');
        console.log(`[EnhancedCrawler] 链接: ${noteUrl}`);

        // 模拟鼠标悬停
        await noteCards[i].hover();
        await searchPage.waitForTimeout(300 + Math.random() * 500);

        // 在新标签页中打开（监听新页面）
        const [detailPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 10000 }),
          noteCards[i].click({ button: 'middle' }) // 中键点击打开新标签
            .catch(() => noteCards[i].click()) // 失败则普通点击
        ]);

        // 注入反检测
        await injectAntiDetection(detailPage);

        // 等待新页面加载
        await detailPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
        await detailPage.waitForTimeout(3000 + Math.random() * 2000);

        // 检查是否被重定向
        const currentUrl = detailPage.url();
        if (currentUrl.includes('/404') ||
            currentUrl.includes('/explore?') ||
            currentUrl === 'https://www.xiaohongshu.com/explore') {
          console.log('[EnhancedCrawler] ⚠️  被重定向，跳过');
          await detailPage.close();
          await searchPage.waitForTimeout(2000 + Math.random() * 2000);
          continue;
        }

        // 提取帖子数据
        const post = await extractPostData(detailPage, currentUrl);

        if (post && post.likes >= minLikes) {
          posts.push(post);
          successCount++;
          console.log(`[EnhancedCrawler] ✓ 成功 (${successCount}/${maxResults}): ${post.title.substring(0, 30)}...`);
        } else {
          console.log('[EnhancedCrawler] ⚠️  数据质量不佳或点赞数不足');
        }

        // 关闭详情页
        await detailPage.close();

        // 回到搜索页面，随机等待
        await searchPage.bringToFront();
        await searchPage.waitForTimeout(3000 + Math.random() * 3000);

      } catch (error: any) {
        console.error(`[EnhancedCrawler] 处理第 ${i + 1} 个笔记失败:`, error.message);
        await searchPage.waitForTimeout(2000);
        continue;
      }
    }

    console.log(`[EnhancedCrawler] 完成: ${posts.length}/${successCount} 个帖子`);
    return posts;

  } catch (error) {
    console.error('[EnhancedCrawler] 批量爬取失败:', error);
    return posts;
  }
}

/**
 * 提取帖子数据（使用经过验证的选择器）
 */
async function extractPostData(page: Page, url: string): Promise<XHSPost | null> {
  try {
    // 等待关键元素加载
    await page.waitForTimeout(2000);

    // 尝试关闭弹窗
    try {
      const closeBtns = await page.locator('[class*="close"], button[aria-label*="关闭"]').all();
      for (const btn of closeBtns) {
        try {
          await btn.click({ timeout: 500, force: true });
          await page.waitForTimeout(300);
        } catch (e) {}
      }
    } catch (e) {}

    // 提取数据
    const postData = await page.evaluate(() => {
      // 标题
      const titleSelectors = [
        '#detail-title',
        'span[class*="title"]',
        'div[class*="title"] span',
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

      // 互动数据
      const interactElements = document.querySelectorAll(
        '[class*="interact"] span, [class*="like"] span, [class*="collect"] span'
      );
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

      // 作者
      const authorSelectors = [
        'a.author-name',
        'a[class*="author"] span',
        'div[class*="author"] a',
      ];
      let author = '未知作者';
      for (const selector of authorSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          const text = el.textContent.trim();
          if (text.length > 0 && text.length < 30 && !text.includes('登录')) {
            author = text;
            break;
          }
        }
      }

      // 内容
      const contentSelectors = [
        '#detail-desc',
        'div[class*="desc"] span[class*="desc"]',
      ];
      let content = '';
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          const text = el.textContent.trim();
          if (text.length > 10) {
            content = text.substring(0, 1000);
            break;
          }
        }
      }

      // 图片
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src || img.getAttribute('data-src') || '')
        .filter(src => {
          if (!src) return false;
          if (src.includes('sns-webpic-qc.xhscdn.com') || src.includes('ci.xiaohongshu.com')) {
            if (src.includes('avatar')) return false;
            return true;
          }
          return false;
        })
        .slice(0, 9);

      // 标签
      const tagElements = Array.from(document.querySelectorAll('a[class*="tag"], span[class*="tag"]'));
      const tags = tagElements
        .map(el => el.textContent?.trim() || '')
        .filter(tag => tag && tag.length > 1 && tag.length < 30)
        .filter((tag, index, self) => self.indexOf(tag) === index)
        .slice(0, 10);

      return { title, author, likes, collects, comments, content, images, tags };
    });

    // 数据质量检查
    if (postData.title === '未找到标题' || postData.title.length <= 5) {
      return null;
    }

    // 提取帖子ID
    const match = url.match(/\/explore\/([a-zA-Z0-9]+)/);
    const postId = match ? match[1] : `temp_${Date.now()}`;

    // 转换数字
    const parseNumber = (str: string): number => {
      if (!str || str === '0') return 0;
      if (str.includes('w') || str.includes('万')) return parseInt(str) * 10000;
      if (str.includes('k') || str.includes('千')) return parseInt(str) * 1000;
      return parseInt(str) || 0;
    };

    const post: XHSPost = {
      post_id: postId,
      title: postData.title,
      content: postData.content,
      images: postData.images,
      likes: parseNumber(postData.likes),
      comments: parseNumber(postData.comments),
      shares: 0,
      collects: parseNumber(postData.collects),
      author_id: 'unknown',
      author_name: postData.author,
      tags: postData.tags,
    };

    return post;

  } catch (error) {
    console.error('[EnhancedCrawler] 提取数据失败:', error);
    return null;
  }
}
