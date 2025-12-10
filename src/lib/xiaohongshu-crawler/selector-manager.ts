/**
 * 选择器管理器
 *
 * 功能：
 * 1. 管理多个备选选择器
 * 2. 自动健康检查和切换
 * 3. 追踪选择器成功率
 * 4. 失败时自动fallback
 */

import type { Page } from 'playwright';

// ============================================================================
// 选择器池配置
// ============================================================================

/**
 * 选择器类型
 */
export interface SelectorConfig {
  id: string;
  selector: string;
  description: string;
  priority: number; // 优先级，数字越小优先级越高
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  successCount: number;
  failureCount: number;
  successRate: number; // 成功率（0-100）
}

/**
 * 小红书帖子列表选择器池
 */
const XHS_NOTE_SELECTORS: SelectorConfig[] = [
  // 优先级1：最常见的选择器
  {
    id: 'note-item-1',
    selector: '.note-item',
    description: '标准note-item类',
    priority: 1,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },
  {
    id: 'note-item-2',
    selector: '[class*="note-item"]',
    description: 'note-item属性包含',
    priority: 2,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },

  // 优先级2：备用选择器
  {
    id: 'feed-card',
    selector: '.feed-card',
    description: 'feed-card类',
    priority: 3,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },
  {
    id: 'explore-card',
    selector: '[class*="explore"]',
    description: 'explore相关类',
    priority: 4,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },

  // 优先级3：通用备选
  {
    id: 'section-note',
    selector: 'section[class*="note"]',
    description: 'section标签包含note',
    priority: 5,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },
  {
    id: 'link-explore',
    selector: 'a[href*="/explore/"]',
    description: '链接包含explore',
    priority: 6,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },

  // 优先级4：最后备选
  {
    id: 'data-v-attr',
    selector: '[data-v-*]',
    description: 'Vue data-v属性',
    priority: 7,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },
  {
    id: 'article-card',
    selector: 'article',
    description: 'article标签',
    priority: 8,
    successCount: 0,
    failureCount: 0,
    successRate: 100,
  },
];

// ============================================================================
// 选择器管理器类
// ============================================================================

export class SelectorManager {
  private selectorPool: SelectorConfig[];
  private currentSelectorId: string | null = null;

  constructor(initialPool: SelectorConfig[] = XHS_NOTE_SELECTORS) {
    this.selectorPool = [...initialPool].sort((a, b) => a.priority - b.priority);
    console.log(`[SelectorManager] 初始化选择器池，共 ${this.selectorPool.length} 个选择器`);
  }

  /**
   * 查找可用的选择器
   *
   * @param page Playwright页面对象
   * @param timeout 每个选择器的超时时间（ms）
   * @returns 找到的选择器配置，如果都失败则返回null
   */
  async findWorkingSelector(
    page: Page,
    timeout: number = 5000
  ): Promise<SelectorConfig | null> {
    console.log('[SelectorManager] 开始查找可用选择器...');

    // 按优先级和成功率排序
    const sortedSelectors = this._getSortedSelectors();

    for (const config of sortedSelectors) {
      console.log(
        `[SelectorManager] 尝试选择器 [${config.id}]: ${config.selector} (优先级: ${config.priority}, 成功率: ${config.successRate.toFixed(1)}%)`
      );

      try {
        // 尝试等待元素出现
        await page.waitForSelector(config.selector, { timeout, state: 'visible' });

        // 检查是否真的找到了元素
        const count = await page.locator(config.selector).count();

        if (count > 0) {
          console.log(`[SelectorManager] ✓ 找到 ${count} 个匹配元素`);

          // 更新成功统计
          this._recordSuccess(config.id);
          this.currentSelectorId = config.id;

          return config;
        } else {
          console.log(`[SelectorManager] ✗ 选择器匹配但无元素`);
          this._recordFailure(config.id);
        }
      } catch (error) {
        console.log(`[SelectorManager] ✗ 选择器超时或失败`);
        this._recordFailure(config.id);
      }
    }

    console.error('[SelectorManager] ❌ 所有选择器都失败了！');
    return null;
  }

  /**
   * 获取当前使用的选择器
   */
  getCurrentSelector(): SelectorConfig | null {
    if (!this.currentSelectorId) return null;

    return this.selectorPool.find((s) => s.id === this.currentSelectorId) || null;
  }

  /**
   * 报告选择器失败（外部调用）
   * 用于在爬取过程中发现选择器失效时记录
   */
  reportFailure(selectorId: string): void {
    this._recordFailure(selectorId);
    console.log(`[SelectorManager] 选择器 [${selectorId}] 被报告为失败`);
  }

  /**
   * 获取选择器健康报告
   */
  getHealthReport(): {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
    selectors: SelectorConfig[];
  } {
    const healthy = this.selectorPool.filter((s) => s.successRate >= 80).length;
    const degraded = this.selectorPool.filter(
      (s) => s.successRate >= 50 && s.successRate < 80
    ).length;
    const failed = this.selectorPool.filter((s) => s.successRate < 50).length;

    return {
      total: this.selectorPool.length,
      healthy,
      degraded,
      failed,
      selectors: this.selectorPool,
    };
  }

  /**
   * 重置选择器统计（用于测试或重新校准）
   */
  resetStatistics(): void {
    for (const config of this.selectorPool) {
      config.successCount = 0;
      config.failureCount = 0;
      config.successRate = 100;
      config.lastSuccessAt = undefined;
      config.lastFailureAt = undefined;
    }

    console.log('[SelectorManager] 统计数据已重置');
  }

  /**
   * 添加自定义选择器
   */
  addCustomSelector(selector: SelectorConfig): void {
    // 检查是否已存在
    const exists = this.selectorPool.some((s) => s.id === selector.id);

    if (exists) {
      console.warn(`[SelectorManager] 选择器 [${selector.id}] 已存在，跳过添加`);
      return;
    }

    this.selectorPool.push(selector);
    this.selectorPool.sort((a, b) => a.priority - b.priority);

    console.log(`[SelectorManager] 已添加自定义选择器 [${selector.id}]`);
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  /**
   * 按优先级和成功率排序选择器
   */
  private _getSortedSelectors(): SelectorConfig[] {
    return [...this.selectorPool].sort((a, b) => {
      // 首先按成功率排序（降序）
      const rateA = a.successRate;
      const rateB = b.successRate;

      if (Math.abs(rateA - rateB) > 10) {
        // 成功率差距 > 10% 时，优先使用成功率高的
        return rateB - rateA;
      }

      // 成功率相近时，按优先级排序（升序）
      return a.priority - b.priority;
    });
  }

  /**
   * 记录成功
   */
  private _recordSuccess(selectorId: string): void {
    const config = this.selectorPool.find((s) => s.id === selectorId);

    if (!config) return;

    config.successCount++;
    config.lastSuccessAt = new Date();
    config.successRate = this._calculateSuccessRate(config);

    console.log(
      `[SelectorManager] 选择器 [${selectorId}] 成功率: ${config.successRate.toFixed(1)}% (${config.successCount}/${config.successCount + config.failureCount})`
    );
  }

  /**
   * 记录失败
   */
  private _recordFailure(selectorId: string): void {
    const config = this.selectorPool.find((s) => s.id === selectorId);

    if (!config) return;

    config.failureCount++;
    config.lastFailureAt = new Date();
    config.successRate = this._calculateSuccessRate(config);

    console.log(
      `[SelectorManager] 选择器 [${selectorId}] 成功率: ${config.successRate.toFixed(1)}% (${config.successCount}/${config.successCount + config.failureCount})`
    );
  }

  /**
   * 计算成功率
   */
  private _calculateSuccessRate(config: SelectorConfig): number {
    const total = config.successCount + config.failureCount;

    if (total === 0) return 100; // 初始状态

    return (config.successCount / total) * 100;
  }
}

// ============================================================================
// 导出单例（全局共享）
// ============================================================================

export const globalSelectorManager = new SelectorManager();
