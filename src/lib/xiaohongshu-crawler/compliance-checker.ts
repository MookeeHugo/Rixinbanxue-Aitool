/**
 * 合规检查器
 *
 * 功能：
 * 1. 检查robots.txt规则
 * 2. 遵守Crawl-delay指令
 * 3. 记录爬取活动
 * 4. 确保合法合规爬取
 */

// ============================================================================
// Robots.txt解析
// ============================================================================

export interface RobotsTxtRules {
  allowed: boolean;
  crawlDelay: number; // 秒
  disallowedPaths: string[];
  userAgent: string;
}

export interface CrawlLog {
  url: string;
  keyword?: string;
  postsFound: number;
  durationMs: number;
  status: 'success' | 'failed' | 'blocked';
  errorMessage?: string;
  timestamp: Date;
}

/**
 * 合规检查器类
 */
export class ComplianceChecker {
  private robotsCache: Map<string, { rules: RobotsTxtRules; cachedAt: Date }> = new Map();
  private crawlLogs: CrawlLog[] = [];
  private lastCrawlTime: Map<string, number> = new Map(); // domain -> timestamp

  /**
   * 检查robots.txt规则
   *
   * @param url 要爬取的URL
   * @param userAgent 使用的User-Agent
   * @returns robots.txt规则
   */
  async checkRobotsTxt(
    url: string,
    userAgent: string = '*'
  ): Promise<RobotsTxtRules> {
    try {
      const urlObj = new URL(url);
      const domain = `${urlObj.protocol}//${urlObj.host}`;
      const robotsUrl = `${domain}/robots.txt`;

      console.log(`[ComplianceChecker] 检查 robots.txt: ${robotsUrl}`);

      // 检查缓存（缓存1小时）
      const cached = this.robotsCache.get(domain);
      if (cached && Date.now() - cached.cachedAt.getTime() < 3600000) {
        console.log('[ComplianceChecker] 使用缓存的robots.txt规则');
        return cached.rules;
      }

      // 获取robots.txt
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': userAgent,
        },
      });

      if (!response.ok) {
        console.log(`[ComplianceChecker] robots.txt不存在或无法访问，假定允许爬取`);
        const defaultRules: RobotsTxtRules = {
          allowed: true,
          crawlDelay: 1, // 默认1秒延迟
          disallowedPaths: [],
          userAgent: '*',
        };

        this.robotsCache.set(domain, { rules: defaultRules, cachedAt: new Date() });
        return defaultRules;
      }

      const robotsTxt = await response.text();
      console.log('[ComplianceChecker] robots.txt 内容:');
      console.log(robotsTxt.substring(0, 500) + '...'); // 只显示前500字符

      // 解析robots.txt
      const rules = this._parseRobotsTxt(robotsTxt, urlObj.pathname, userAgent);

      // 缓存结果
      this.robotsCache.set(domain, { rules, cachedAt: new Date() });

      console.log('[ComplianceChecker] 解析结果:', {
        allowed: rules.allowed,
        crawlDelay: rules.crawlDelay,
        disallowedPathsCount: rules.disallowedPaths.length,
      });

      return rules;
    } catch (error) {
      console.error('[ComplianceChecker] 检查robots.txt失败:', error);

      // 出错时采用保守策略
      return {
        allowed: true,
        crawlDelay: 2, // 失败时使用更长延迟
        disallowedPaths: [],
        userAgent: '*',
      };
    }
  }

  /**
   * 检查是否应该遵守Crawl-delay
   *
   * @param domain 域名
   * @param crawlDelay 延迟时间（秒）
   * @returns 应该等待的时间（毫秒），如果不需要等待则返回0
   */
  shouldWaitForCrawlDelay(domain: string, crawlDelay: number): number {
    const lastCrawl = this.lastCrawlTime.get(domain);

    if (!lastCrawl) {
      // 首次爬取，不需要等待
      return 0;
    }

    const timeSinceLastCrawl = Date.now() - lastCrawl;
    const requiredDelay = crawlDelay * 1000; // 转换为毫秒

    if (timeSinceLastCrawl < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastCrawl;
      console.log(`[ComplianceChecker] 需要等待 ${(waitTime / 1000).toFixed(1)} 秒以遵守Crawl-delay`);
      return waitTime;
    }

    return 0;
  }

  /**
   * 记录爬取完成
   */
  recordCrawl(domain: string): void {
    this.lastCrawlTime.set(domain, Date.now());
  }

  /**
   * 记录爬取活动
   */
  async logCrawlActivity(log: CrawlLog): Promise<void> {
    this.crawlLogs.push(log);

    console.log('[ComplianceChecker] 爬取活动记录:', {
      url: log.url,
      status: log.status,
      postsFound: log.postsFound,
      durationMs: log.durationMs,
      timestamp: log.timestamp.toISOString(),
    });

    // 保持最近100条记录
    if (this.crawlLogs.length > 100) {
      this.crawlLogs.shift();
    }

    // TODO: 可选 - 保存到数据库
    // await this._saveCrawlLogToDatabase(log);
  }

  /**
   * 获取爬取日志
   */
  getCrawlLogs(limit: number = 20): CrawlLog[] {
    return this.crawlLogs.slice(-limit);
  }

  /**
   * 获取爬取统计
   */
  getCrawlStatistics(): {
    totalCrawls: number;
    successfulCrawls: number;
    failedCrawls: number;
    blockedCrawls: number;
    averageDuration: number;
  } {
    const total = this.crawlLogs.length;
    const successful = this.crawlLogs.filter((l) => l.status === 'success').length;
    const failed = this.crawlLogs.filter((l) => l.status === 'failed').length;
    const blocked = this.crawlLogs.filter((l) => l.status === 'blocked').length;

    const totalDuration = this.crawlLogs.reduce((sum, l) => sum + l.durationMs, 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    return {
      totalCrawls: total,
      successfulCrawls: successful,
      failedCrawls: failed,
      blockedCrawls: blocked,
      averageDuration: Math.round(avgDuration),
    };
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  /**
   * 解析robots.txt文件
   */
  private _parseRobotsTxt(
    content: string,
    path: string,
    userAgent: string
  ): RobotsTxtRules {
    const lines = content.split('\n');
    const disallowedPaths: string[] = [];
    let crawlDelay = 1; // 默认1秒
    let currentUserAgent = '';
    let matchesUserAgent = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过注释和空行
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }

      // 解析User-agent
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        currentUserAgent = trimmed.substring(11).trim();

        // 检查是否匹配我们的User-Agent
        matchesUserAgent =
          currentUserAgent === '*' ||
          currentUserAgent.toLowerCase() === userAgent.toLowerCase();

        continue;
      }

      // 只处理匹配的User-Agent规则
      if (!matchesUserAgent) {
        continue;
      }

      // 解析Disallow
      if (trimmed.toLowerCase().startsWith('disallow:')) {
        const disallowPath = trimmed.substring(9).trim();

        if (disallowPath) {
          disallowedPaths.push(disallowPath);
        }
      }

      // 解析Crawl-delay
      if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
        const delay = parseFloat(trimmed.substring(12).trim());

        if (!isNaN(delay)) {
          crawlDelay = delay;
        }
      }
    }

    // 检查当前路径是否被禁止
    const allowed = !disallowedPaths.some((disallowedPath) => {
      // 简单的路径匹配（不支持通配符）
      if (disallowedPath === '/') {
        return true; // 禁止所有路径
      }

      return path.startsWith(disallowedPath);
    });

    return {
      allowed,
      crawlDelay,
      disallowedPaths,
      userAgent: currentUserAgent || '*',
    };
  }

  /**
   * 保存爬取日志到数据库（可选实现）
   */
  private async _saveCrawlLogToDatabase(log: CrawlLog): Promise<void> {
    // TODO: 如果需要持久化日志，可以在这里实现
    // 例如：保存到xhs_crawl_logs表
    /*
    const supabase = createServiceSupabaseClient();
    await supabase.from('xhs_crawl_logs').insert({
      url: log.url,
      keyword: log.keyword,
      posts_found: log.postsFound,
      duration_ms: log.durationMs,
      status: log.status,
      error_message: log.errorMessage,
      created_at: log.timestamp.toISOString(),
    });
    */
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const globalComplianceChecker = new ComplianceChecker();
