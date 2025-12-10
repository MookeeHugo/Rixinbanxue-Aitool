/**
 * 真实爬虫集成模块
 *
 * 基于经过验证的 crawl-batch-posts.ts 实现
 * 提供给 PlaywrightCrawler 使用的核心爬取逻辑
 */

import { Page, BrowserContext } from 'playwright';
import { injectAntiDetection } from './anti-detection';
import type { XHSPost } from './types';

// ============================================================================
// Cookie管理
// ============================================================================

/**
 * 加载Cookies
 */
export async function loadCookies(
  context: BrowserContext,
  cookiesFile: string = 'test-reports/xiaohongshu-cookies.json'
): Promise<boolean> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const cookiesPath = path.resolve(process.cwd(), cookiesFile);

    if (!fs.existsSync(cookiesPath)) {
      console.warn(`[RealCrawler] ⚠️  Cookies文件不存在: ${cookiesPath}`);
      return false;
    }

    const cookiesData = fs.readFileSync(cookiesPath, 'utf-8');
    const cookies = JSON.parse(cookiesData);

    await context.addCookies(cookies);
    console.log(`[RealCrawler] ✓ 已加载 ${cookies.length} 个cookies`);

    return true;
  } catch (error) {
    console.error('[RealCrawler] 加载cookies失败:', error);
    return false;
  }
}

// ============================================================================
// 爬取搜索页面
// ============================================================================

/**
 * 爬取搜索页面获取帖子链接（根据关键词）
 */
export async function crawlSearchPage(
  page: Page,
  keyword: string,
  options?: {
    maxLinks?: number;
    scrollCount?: number;
  }
): Promise<string[]> {
  const maxLinks = options?.maxLinks || 30;
  const scrollCount = options?.scrollCount || 2;

  try {
    console.log(`[RealCrawler] 搜索关键词: "${keyword}"...`);

    // 访问搜索页面
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    // 模拟真实用户行为
    console.log('[RealCrawler] 模拟用户行为...');
    await page.mouse.move(500, 300);
    await page.waitForTimeout(500);
    await page.mouse.move(800, 500);
    await page.waitForTimeout(500);

    // 页面滚动
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => window.scrollTo(0, 300 + Math.random() * 500));
      await page.waitForTimeout(1000);
    }

    // 获取笔记链接
    const noteLinks = await page.locator('a[href*="/explore/"]').all();
    console.log(`[RealCrawler] 找到 ${noteLinks.length} 个笔记链接`);

    if (noteLinks.length === 0) {
      return [];
    }

    // 提取href属性
    const links: string[] = [];
    for (let i = 0; i < Math.min(noteLinks.length, maxLinks); i++) {
      const href = await noteLinks[i].getAttribute('href');
      if (href && href.includes('/explore/')) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://www.xiaohongshu.com${href}`;
        links.push(fullUrl);
      }
    }

    // 去重
    return Array.from(new Set(links));
  } catch (error) {
    console.error('[RealCrawler] 爬取探索页面失败:', error);
    return [];
  }
}

// ============================================================================
// 爬取帖子详情
// ============================================================================

/**
 * 检测是否被重定向
 */
export function isRedirected(url: string): boolean {
  return (
    url.includes('/404') ||
    url.includes('error') ||
    url.includes('/explore?') ||
    url === 'https://www.xiaohongshu.com/explore'
  );
}

/**
 * 爬取单个帖子详情（使用经过验证的选择器）
 */
export async function crawlPostDetail(
  context: BrowserContext,
  postUrl: string
): Promise<XHSPost | null> {
  let detailPage: Page | null = null;

  try {
    // 在新标签页打开
    detailPage = await context.newPage();
    await injectAntiDetection(detailPage);

    // 访问帖子详情页
    await detailPage.goto(postUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await detailPage.waitForTimeout(3000);

    const currentUrl = detailPage.url();

    // 检测重定向
    if (isRedirected(currentUrl)) {
      console.log(`[RealCrawler] ⚠️  帖子被重定向: ${postUrl}`);
      await detailPage.close();
      return null;
    }

    // 等待页面完全加载
    await detailPage.waitForTimeout(6000);

    // 尝试关闭弹窗
    try {
      const closeBtns = await detailPage.locator('[class*="close"], button[aria-label*="关闭"]').all();
      for (const btn of closeBtns) {
        try {
          await btn.click({ timeout: 500, force: true });
          await detailPage.waitForTimeout(300);
        } catch (e) {}
      }
    } catch (e) {}

    // 提取帖子数据（使用经过验证的选择器）
    const postData = await detailPage.evaluate(() => {
      // 移除弹窗
      const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
      modals.forEach(modal => {
        (modal as HTMLElement).style.display = 'none';
      });

      // 标题选择器（100%准确）
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

      // 作者选择器
      const authorSelectors = [
        'a.author-name',
        'a[class*="author"] span',
        'div[class*="author"] a',
        'span[class*="author-name"]',
        '[class*="nickname"]'
      ];

      let author = '未知作者';
      for (const selector of authorSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          const text = el.textContent.trim();
          if (text.length > 0 && text.length < 30 &&
              !text.includes('登录') && !text.includes('注册') && !text.includes('关注') && !text.includes('+86')) {
            author = text;
            break;
          }
        }
      }

      // 互动数据选择器
      const interactElements = document.querySelectorAll('[class*="interact"] span, [class*="like"] span, [class*="collect"] span, [class*="comment"] span');
      const numbers: string[] = [];

      interactElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        if (/^\d+[wk万千百]*$/.test(text)) {
          numbers.push(text);
        }
      });

      // 通常顺序是：点赞、收藏、评论
      const likes = numbers[0] || '0';
      const collects = numbers[1] || '0';
      const comments = numbers[2] || '0';

      // 内容选择器
      const contentSelectors = [
        '#detail-desc',
        'div[class*="desc"] span[class*="desc"]',
        'div[class*="note-content"]',
        'div[class*="content"] div[class*="desc"]'
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          const text = el.textContent.trim();
          if (text.length > 10 && !text.includes('手机号登录') && !text.includes('马上登录')) {
            const hashtagRatio = (text.match(/#/g) || []).length / text.length;
            if (hashtagRatio < 0.1) {
              content = text.substring(0, 1000);
              break;
            }
          }
        }
      }

      // 图片选择器（只保留内容图片）
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

      // 标签选择器
      const tagElements = Array.from(document.querySelectorAll('a[class*="tag"], span[class*="tag"], [class*="topic"]'));

      const tags = tagElements
        .map(el => el.textContent?.trim() || '')
        .filter(tag => {
          if (!tag) return false;
          if (tag.length < 2 || tag.length > 30) return false;
          if (tag.includes('作者') || tag.includes('关注') || tag.includes('点赞') || tag.includes('收藏')) {
            return false;
          }
          return true;
        })
        .filter((tag, index, self) => self.indexOf(tag) === index)
        .slice(0, 10);

      // 发布时间
      let publishTime = '';
      const timeEl = document.querySelector('[class*="time"], [class*="date"]');
      if (timeEl?.textContent) {
        const text = timeEl.textContent.trim();
        if (text.match(/\d{4}-\d{2}-\d{2}/) || text.match(/\d+天前/) || text.match(/\d+小时前/)) {
          publishTime = text;
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

    // 检查数据质量
    if (postData.title === '未找到标题' || postData.title === '马上登录即可' || postData.title.length <= 5) {
      console.log(`[RealCrawler] ⚠️  数据质量不佳: ${postData.title}`);
      await detailPage.close();
      return null;
    }

    // 提取帖子ID
    const postId = extractPostId(postUrl);

    // 转换数字字符串为数字
    const parseNumber = (str: string): number => {
      if (!str || str === '0') return 0;
      // 处理"1w"、"2k"等格式
      if (str.includes('w') || str.includes('万')) {
        return parseInt(str) * 10000;
      }
      if (str.includes('k') || str.includes('千')) {
        return parseInt(str) * 1000;
      }
      return parseInt(str) || 0;
    };

    // 组装最终数据
    const post: XHSPost = {
      post_id: postId,
      title: postData.title,
      content: postData.content,
      images: postData.images,
      likes: parseNumber(postData.likes),
      comments: parseNumber(postData.comments),
      shares: 0, // 暂时无法获取分享数
      collects: parseNumber(postData.collects),
      author_id: 'unknown',
      author_name: postData.author,
      tags: postData.tags,
      publish_time: postData.publishTime,
    };

    await detailPage.close();

    console.log(`[RealCrawler] ✓ 成功抓取: ${post.title.substring(0, 30)}...`);

    return post;
  } catch (error) {
    console.error('[RealCrawler] 爬取帖子详情失败:', error);
    if (detailPage) {
      try {
        await detailPage.close();
      } catch (e) {}
    }
    return null;
  }
}

/**
 * 从URL提取帖子ID
 */
function extractPostId(url: string): string {
  const match = url.match(/\/explore\/([a-zA-Z0-9]+)/);
  return match ? match[1] : `temp_${Date.now()}`;
}

// ============================================================================
// 批量爬取
// ============================================================================

/**
 * 批量爬取帖子（根据关键词搜索）
 */
export async function batchCrawlPosts(
  context: BrowserContext,
  page: Page,
  options: {
    keyword: string;
    maxResults: number;
    minLikes?: number;
    randomDelay?: boolean;
  }
): Promise<XHSPost[]> {
  const { keyword, maxResults, minLikes = 0, randomDelay = true } = options;
  const posts: XHSPost[] = [];

  try {
    // 1. 搜索关键词，获取帖子链接
    const links = await crawlSearchPage(page, keyword, {
      maxLinks: maxResults * 3, // 多获取一些以应对失败
    });

    console.log(`[RealCrawler] 准备爬取 ${links.length} 个链接，目标 ${maxResults} 个帖子`);

    // 2. 逐个爬取帖子
    let attemptCount = 0;

    for (const link of links) {
      if (posts.length >= maxResults) {
        console.log(`[RealCrawler] 已达到目标数量 ${maxResults}`);
        break;
      }

      attemptCount++;
      console.log(`[RealCrawler] [${posts.length + 1}/${maxResults}] 尝试第 ${attemptCount} 个链接`);

      const post = await crawlPostDetail(context, link);

      if (post && post.likes >= minLikes) {
        posts.push(post);
        console.log(`[RealCrawler] ✓ 成功 (${posts.length}/${maxResults})`);
      }

      // 随机延迟（2-5秒）
      if (randomDelay) {
        const delay = 2000 + Math.random() * 3000;
        console.log(`[RealCrawler] 等待 ${Math.round(delay / 1000)}秒...`);
        await page.waitForTimeout(delay);
      }
    }

    console.log(`[RealCrawler] 批量爬取完成: ${posts.length}个帖子 / ${attemptCount}次尝试`);

    return posts;
  } catch (error) {
    console.error('[RealCrawler] 批量爬取失败:', error);
    return posts;
  }
}
