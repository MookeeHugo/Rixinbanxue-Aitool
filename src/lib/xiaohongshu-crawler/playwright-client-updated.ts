/**
 * PlaywrightCrawler - searchAndCrawl 方法更新版本
 *
 * 集成真实爬虫功能，替换原有的搜索爬取逻辑
 */

import { CrawlConfig, CrawlResult, CrawlMetadata, XHSPost } from './types';
import { loadCookies, crawlExplorePage, crawlPostDetail, batchCrawlPosts } from './real-crawler-integration';
import { CRAWLER_CONFIG } from './config';

/**
 * 搜索并爬取帖子（使用真实爬虫）
 *
 * 这个方法应该替换 PlaywrightCrawler 类中的 searchAndCrawl 方法
 */
export async function searchAndCrawlReal(
  this: any, // PlaywrightCrawler 实例
  config: CrawlConfig
): Promise<CrawlResult> {
  const metadata: CrawlMetadata = {
    startTime: Date.now(),
    totalPosts: 0,
    errors: [],
    retryCount: 0,
  };

  try {
    console.log(`[PlaywrightCrawler] 使用真实爬虫模式`);

    if (!this.page || !this.context) {
      throw new Error('浏览器未初始化');
    }

    // 1. 加载Cookies（如果存在）
    const cookiesFile = process.env.XHS_COOKIES_FILE || 'test-reports/xiaohongshu-cookies.json';
    await loadCookies(this.context, cookiesFile);

    // 2. 执行批量爬取
    console.log(`[PlaywrightCrawler] 目标: ${config.maxResults}个帖子，最低点赞: ${config.minLikes}`);

    const posts = await batchCrawlPosts(this.context, this.page, {
      maxResults: Math.min(config.maxResults, 10), // 最多10个
      minLikes: config.minLikes,
      randomDelay: true,
    });

    // 3. 完成统计
    metadata.endTime = Date.now();
    metadata.duration = metadata.endTime - metadata.startTime;
    metadata.totalPosts = posts.length;

    console.log(`[PlaywrightCrawler] 完成: 爬取${posts.length}个帖子，耗时${(metadata.duration / 1000).toFixed(1)}秒`);

    return {
      success: true,
      posts,
      metadata,
    };
  } catch (error: any) {
    metadata.endTime = Date.now();
    metadata.duration = metadata.endTime - metadata.startTime;
    metadata.errors.push(error.message || String(error));

    console.error('[PlaywrightCrawler] 爬取失败:', error);

    return {
      success: false,
      posts: [],
      metadata,
      error: error.message || '爬取失败',
    };
  }
}

/**
 * 使用说明：
 *
 * 在 playwright-client.ts 中，将 searchAndCrawl 方法替换为：
 *
 * ```typescript
 * import { searchAndCrawlReal } from './playwright-client-updated';
 *
 * export class PlaywrightCrawler {
 *   // ...其他代码...
 *
 *   async searchAndCrawl(config: CrawlConfig): Promise<CrawlResult> {
 *     return searchAndCrawlReal.call(this, config);
 *   }
 * }
 * ```
 *
 * 或者直接复制 searchAndCrawlReal 的内容到 searchAndCrawl 方法中
 */
