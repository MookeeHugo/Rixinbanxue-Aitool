/**
 * Playwright爬虫客户端
 *
 * 核心功能：
 * - Playwright浏览器自动化
 * - 反检测策略集成
 * - 重试机制和软封禁检测
 * - 行为模拟
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { injectAntiDetection } from './anti-detection';
import { BehaviorSimulator } from './behavior-simulator';
import { SelectorManager } from './selector-manager';
import { ComplianceChecker } from './compliance-checker';
import {
  CrawlConfig,
  CrawlResult,
  CrawlMetadata,
  XHSPost,
  ProxyConfig,
} from './types';
import {
  CRAWLER_CONFIG,
  XHS_SELECTORS,
  XHS_URLS,
  getRandomUserAgent,
  getRandomViewport,
  getExponentialBackoffDelay,
} from './config';

// ============================================================================
// Playwright爬虫客户端类
// ============================================================================

export class PlaywrightCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private behaviorSimulator: BehaviorSimulator;
  private selectorManager: SelectorManager;
  private complianceChecker: ComplianceChecker;

  constructor() {
    this.behaviorSimulator = new BehaviorSimulator();
    this.selectorManager = new SelectorManager();
    this.complianceChecker = new ComplianceChecker();
  }

  // ==========================================================================
  // 初始化和清理
  // ==========================================================================

  /**
   * 初始化浏览器
   */
  async init(options?: {
    useProxy?: boolean;
    proxyConfig?: ProxyConfig;
    headless?: boolean;
  }): Promise<void> {
    try {
      console.log('[PlaywrightCrawler] 正在初始化浏览器...');

      // 随机User-Agent和视口
      const userAgent = getRandomUserAgent();
      const viewport = getRandomViewport();

      // 浏览器启动选项
      const launchOptions: any = {
        headless: options?.headless !== false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      };

      // 代理配置（如果启用）
      if (options?.useProxy && options?.proxyConfig) {
        launchOptions.proxy = {
          server: options.proxyConfig.server,
          username: options.proxyConfig.username,
          password: options.proxyConfig.password,
        };
        console.log('[PlaywrightCrawler] 使用代理:', options.proxyConfig.server);
      }

      // 启动浏览器
      this.browser = await chromium.launch(launchOptions);

      // 创建上下文
      this.context = await this.browser.newContext({
        userAgent,
        viewport,
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        permissions: [],
        extraHTTPHeaders: {
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      });

      // 创建页面
      this.page = await this.context.newPage();

      // 注入反检测脚本
      await injectAntiDetection(this.page);

      console.log('[PlaywrightCrawler] 浏览器初始化完成');
      console.log(`[PlaywrightCrawler] User-Agent: ${userAgent.substring(0, 50)}...`);
      console.log(`[PlaywrightCrawler] Viewport: ${viewport.width}x${viewport.height}`);
    } catch (error) {
      console.error('[PlaywrightCrawler] 初始化失败:', error);
      throw new Error(`浏览器初始化失败: ${error}`);
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      console.log('[PlaywrightCrawler] 浏览器已关闭');
    } catch (error) {
      console.error('[PlaywrightCrawler] 关闭浏览器失败:', error);
    }
  }

  // ==========================================================================
  // 核心爬取功能
  // ==========================================================================

  /**
   * 搜索并爬取帖子（带重试和软封禁检测）
   */
  async searchAndCrawl(config: CrawlConfig): Promise<CrawlResult> {
    const metadata: CrawlMetadata = {
      startTime: Date.now(),
      totalPosts: 0,
      errors: [],
      retryCount: 0,
    };

    // Codex建议：重试机制
    for (let attempt = 0; attempt < CRAWLER_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`[PlaywrightCrawler] 尝试爬取 (${attempt + 1}/${CRAWLER_CONFIG.maxRetries})`);

        const posts = await this._crawlWithoutRetry(config, metadata);

        // 成功
        metadata.endTime = Date.now();
        metadata.duration = metadata.endTime - metadata.startTime;
        metadata.totalPosts = posts.length;

        return {
          success: true,
          posts,
          metadata,
        };
      } catch (error: any) {
        metadata.retryCount = attempt + 1;
        metadata.errors.push(error.message || String(error));

        // 检测软封禁
        if (error.message?.includes('SOFT_BAN_DETECTED')) {
          console.error('[PlaywrightCrawler] 检测到软封禁，停止重试');
          metadata.endTime = Date.now();
          metadata.duration = metadata.endTime - metadata.startTime;
          return {
            success: false,
            posts: [],
            metadata,
            error: '检测到软封禁，请稍后再试',
          };
        }

        // 最后一次尝试
        if (attempt === CRAWLER_CONFIG.maxRetries - 1) {
          console.error('[PlaywrightCrawler] 所有重试均失败');
          metadata.endTime = Date.now();
          metadata.duration = metadata.endTime - metadata.startTime;
          return {
            success: false,
            posts: [],
            metadata,
            error: `爬取失败: ${error.message}`,
          };
        }

        // 指数退避
        const backoffDelay = getExponentialBackoffDelay(attempt);
        console.log(`[PlaywrightCrawler] 等待 ${backoffDelay}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    // 不应该到达这里
    metadata.endTime = Date.now();
    metadata.duration = metadata.endTime - metadata.startTime;
    return {
      success: false,
      posts: [],
      metadata,
      error: '未知错误',
    };
  }

  /**
   * 内部爬取方法（不带重试）
   */
  private async _crawlWithoutRetry(
    config: CrawlConfig,
    metadata: CrawlMetadata
  ): Promise<XHSPost[]> {
    if (!this.page) {
      throw new Error('浏览器未初始化');
    }

    const posts: XHSPost[] = [];
    const startTime = Date.now();

    // 1. 合规检查：检查robots.txt
    const searchUrl = XHS_URLS.search(config.keyword);
    console.log('[PlaywrightCrawler] 正在检查robots.txt合规性...');

    const robotsRules = await this.complianceChecker.checkRobotsTxt(searchUrl);

    if (!robotsRules.allowed) {
      const errorMsg = `robots.txt禁止爬取此路径: ${new URL(searchUrl).pathname}`;
      console.error(`[PlaywrightCrawler] ${errorMsg}`);

      // 记录被阻止的爬取
      await this.complianceChecker.logCrawlActivity({
        url: searchUrl,
        keyword: config.keyword,
        postsFound: 0,
        durationMs: Date.now() - startTime,
        status: 'blocked',
        errorMessage: errorMsg,
        timestamp: new Date(),
      });

      throw new Error(errorMsg);
    }

    // 2. 遵守Crawl-delay
    const domain = new URL(searchUrl).host;
    const waitTime = this.complianceChecker.shouldWaitForCrawlDelay(
      domain,
      robotsRules.crawlDelay
    );

    if (waitTime > 0) {
      console.log(`[PlaywrightCrawler] 遵守Crawl-delay，等待 ${(waitTime / 1000).toFixed(1)} 秒...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // 3. 导航到搜索页
    console.log('[PlaywrightCrawler] 正在导航到:', searchUrl);

    await this.page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CRAWLER_CONFIG.navigationTimeout,
    });

    // 记录爬取时间（用于Crawl-delay计算）
    this.complianceChecker.recordCrawl(domain);

    // 2. 执行行为模拟（避免被检测为机器人）
    await this.behaviorSimulator.smartWait(this.page, {
      minTime: 3000,
      maxTime: 5000,
      waitForNetworkIdle: true,
    });

    // 3. 使用选择器管理器查找可用选择器
    console.log('[PlaywrightCrawler] 使用选择器管理器查找可用选择器...');
    const selectorConfig = await this.selectorManager.findWorkingSelector(this.page, 5000);

    if (!selectorConfig) {
      // 调试：截图保存
      await this.screenshot('debug-xiaohongshu-error.png');
      console.log('[PlaywrightCrawler] 已保存调试截图: debug-xiaohongshu-error.png');

      // 输出选择器健康报告
      const healthReport = this.selectorManager.getHealthReport();
      console.error('[PlaywrightCrawler] 选择器健康报告:', {
        total: healthReport.total,
        healthy: healthReport.healthy,
        degraded: healthReport.degraded,
        failed: healthReport.failed,
      });

      throw new Error('未找到帖子列表，所有选择器都失败了。可能是网页结构变化或被封禁');
    }

    const foundSelector = selectorConfig.selector;
    console.log(`[PlaywrightCrawler] ✓ 使用选择器 [${selectorConfig.id}]: ${foundSelector}`);

    // 4. 软封禁检测（Codex建议）
    const itemCount = await this.page.$$eval(
      foundSelector,
      (items) => items.length
    );

    if (itemCount <= CRAWLER_CONFIG.emptyListThreshold) {
      throw new Error('SOFT_BAN_DETECTED: 未检测到任何帖子');
    }

    console.log(`[PlaywrightCrawler] 检测到 ${itemCount} 个元素`);

    // 5. 执行滚动加载更多内容
    await this.behaviorSimulator.performBrowsingSequence(this.page, {
      scrollCount: 2,
      enableHover: true,
      enableMouseMove: true,
    });

    // 6. 提取帖子链接（使用更智能的方式）
    const postLinks = await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/explore/"]'));
      return links
        .map((link) => (link as HTMLAnchorElement).href)
        .filter((href, index, self) => self.indexOf(href) === index); // 去重
    });

    console.log(`[PlaywrightCrawler] 找到 ${postLinks.length} 个帖子链接`);

    // 7. 限制爬取数量（Codex建议：提前短路）
    const maxResults = Math.min(
      config.maxResults,
      CRAWLER_CONFIG.maxPostsPerCrawl
    );
    const linksToProcess = postLinks.slice(0, maxResults);

    console.log(`[PlaywrightCrawler] 将爬取 ${linksToProcess.length} 个帖子`);

    // 8. 逐个访问帖子详情页
    for (let i = 0; i < linksToProcess.length; i++) {
      try {
        const postUrl = linksToProcess[i];
        console.log(`[PlaywrightCrawler] 正在爬取帖子 ${i + 1}/${linksToProcess.length}`);

        const post = await this._crawlPostDetail(postUrl);

        // 过滤低点赞数的帖子
        if (post && post.likes >= config.minLikes) {
          posts.push(post);
          console.log(`[PlaywrightCrawler] ✓ 帖子已添加: ${post.title} (点赞: ${post.likes})`);
        } else if (post) {
          console.log(`[PlaywrightCrawler] ✗ 点赞数不足: ${post.likes} < ${config.minLikes}`);
        }

        // 行为模拟：随机停留
        await this.behaviorSimulator.smartWait(this.page, {
          minTime: 1000,
          maxTime: 2000,
        });
      } catch (error) {
        console.error(`[PlaywrightCrawler] 爬取帖子 ${i + 1} 失败:`, error);
        metadata.errors.push(`帖子${i + 1}爬取失败: ${error}`);
        continue; // 继续爬取下一个
      }
    }

    return posts;
  }

  /**
   * 爬取帖子详情
   */
  private async _crawlPostDetail(postUrl: string): Promise<XHSPost | null> {
    if (!this.page) {
      throw new Error('浏览器未初始化');
    }

    try {
      // 导航到帖子详情页
      await this.page.goto(postUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CRAWLER_CONFIG.navigationTimeout,
      });

      // 等待内容加载
      await this.behaviorSimulator.smartWait(this.page, {
        minTime: 1500,
        maxTime: 2500,
        waitForNetworkIdle: true,
      });

      // 点击展开全文按钮（如果存在）
      await this.behaviorSimulator.clickExpandButtons(this.page, XHS_SELECTORS.expandBtn);

      // 提取帖子ID
      const postId = this._extractPostId(postUrl);

      // 提取数据（使用容错选择器）
      const postData = await this.page.evaluate(() => {
        // 辅助函数：安全提取文本
        const safeText = (selector: string): string => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        // 辅助函数：安全提取数字
        const safeNumber = (selector: string): number => {
          const text = safeText(selector);
          const match = text.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };

        // 提取图片URL
        const images = Array.from(document.querySelectorAll('img'))
          .map((img) => img.src)
          .filter((src) => src.includes('xiaohongshu') && !src.includes('avatar'));

        return {
          title: safeText('.note-title, .title, h1') || '无标题',
          content: safeText('.note-content, .content, .desc') || '',
          likes: safeNumber('.like-count, .like-wrapper, [class*="like"]'),
          comments: safeNumber('.comment-count, .comment-wrapper, [class*="comment"]'),
          shares: safeNumber('.share-count, .share-wrapper, [class*="share"]'),
          authorName: safeText('.author-name, .username, [class*="author"]') || '未知作者',
          authorId: document.querySelector('[data-author-id]')?.getAttribute('data-author-id') || 'unknown',
          tags: Array.from(document.querySelectorAll('.tag-item, .tag, [class*="tag"]'))
            .map((tag) => tag.textContent?.trim() || '')
            .filter(Boolean),
          images: images.slice(0, 9), // 最多9张图
        };
      });

      // 组装帖子对象
      const post: XHSPost = {
        post_id: postId,
        title: postData.title,
        content: postData.content,
        images: postData.images,
        likes: postData.likes,
        comments: postData.comments,
        shares: postData.shares,
        author_id: postData.authorId,
        author_name: postData.authorName,
        tags: postData.tags,
      };

      return post;
    } catch (error) {
      console.error('[PlaywrightCrawler] 提取帖子详情失败:', error);
      return null;
    }
  }

  /**
   * 从URL提取帖子ID
   */
  private _extractPostId(url: string): string {
    const match = url.match(/\/explore\/([a-zA-Z0-9]+)/);
    return match ? match[1] : `temp_${Date.now()}`;
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  /**
   * 截图（用于调试）
   */
  async screenshot(path: string): Promise<void> {
    if (this.page) {
      await this.page.screenshot({ path, fullPage: true });
      console.log(`[PlaywrightCrawler] 截图已保存: ${path}`);
    }
  }

  /**
   * 获取页面HTML（用于调试）
   */
  async getPageHTML(): Promise<string> {
    if (this.page) {
      return await this.page.content();
    }
    return '';
  }
}
