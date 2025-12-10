/**
 * 行为模拟器
 *
 * 模拟真人浏览行为，避免被检测为机器人
 * 功能：
 * - 随机滚动
 * - 随机悬停
 * - 随机点击
 * - 随机停留
 */

import { Page } from 'playwright';
import { CRAWLER_CONFIG, getRandomWaitTime } from './config';

// ============================================================================
// 行为模拟器类
// ============================================================================

export class BehaviorSimulator {
  /**
   * 执行随机滚动
   * 模拟用户浏览页面的滚动行为
   */
  async randomScroll(page: Page): Promise<void> {
    const { min, max } = CRAWLER_CONFIG.scrollCount;
    const scrollCount = Math.floor(Math.random() * (max - min + 1)) + min;

    console.log(`[BehaviorSimulator] 开始随机滚动 ${scrollCount} 次`);

    for (let i = 0; i < scrollCount; i++) {
      // 随机滚动距离
      const { min: minDist, max: maxDist } = CRAWLER_CONFIG.scrollDistance;
      const scrollDistance = Math.floor(Math.random() * (maxDist - minDist + 1)) + minDist;

      // 执行滚动
      await page.evaluate((distance) => {
        window.scrollBy({
          top: distance,
          behavior: 'smooth',  // 平滑滚动更像真人
        });
      }, scrollDistance);

      // 随机停留时间
      const { min: minWait, max: maxWait } = CRAWLER_CONFIG.waitTime;
      const waitTime = getRandomWaitTime(minWait, maxWait);
      await page.waitForTimeout(waitTime);

      console.log(`[BehaviorSimulator] 滚动 ${scrollDistance}px，停留 ${waitTime}ms`);
    }
  }

  /**
   * 执行随机悬停
   * 模拟用户鼠标悬停在元素上
   */
  async randomHover(page: Page, selector: string): Promise<void> {
    try {
      const elements = await page.$$(selector);
      if (elements.length === 0) {
        console.log(`[BehaviorSimulator] 未找到悬停元素: ${selector}`);
        return;
      }

      // 随机选择一个元素
      const randomIndex = Math.floor(Math.random() * Math.min(elements.length, 5)); // 最多悬停5个
      const element = elements[randomIndex];

      // 执行悬停
      await element.hover();

      // 随机悬停时间
      const { min, max } = CRAWLER_CONFIG.hoverTime;
      const hoverTime = getRandomWaitTime(min, max);
      await page.waitForTimeout(hoverTime);

      console.log(`[BehaviorSimulator] 悬停在元素 ${selector}[${randomIndex}]，停留 ${hoverTime}ms`);
    } catch (error) {
      console.warn(`[BehaviorSimulator] 悬停失败:`, error);
    }
  }

  /**
   * 滚动到元素可见区域
   * 确保元素在视口内
   */
  async scrollIntoView(page: Page, selector: string): Promise<void> {
    try {
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, selector);

      // 等待滚动完成
      await page.waitForTimeout(500);

      console.log(`[BehaviorSimulator] 滚动到元素: ${selector}`);
    } catch (error) {
      console.warn(`[BehaviorSimulator] 滚动到元素失败:`, error);
    }
  }

  /**
   * 执行随机移动鼠标
   * 模拟用户鼠标在页面上的随机移动
   */
  async randomMouseMove(page: Page, count: number = 3): Promise<void> {
    console.log(`[BehaviorSimulator] 开始随机移动鼠标 ${count} 次`);

    for (let i = 0; i < count; i++) {
      // 获取视口尺寸
      const viewport = page.viewportSize();
      if (!viewport) continue;

      // 随机坐标
      const x = Math.floor(Math.random() * viewport.width);
      const y = Math.floor(Math.random() * viewport.height);

      // 移动鼠标
      await page.mouse.move(x, y);

      // 随机停留
      const waitTime = getRandomWaitTime(100, 500);
      await page.waitForTimeout(waitTime);
    }
  }

  /**
   * 执行点击并展开全文
   * 点击"展开全文"按钮
   */
  async clickExpandButtons(page: Page, selector: string): Promise<void> {
    try {
      const buttons = await page.$$(selector);
      if (buttons.length === 0) {
        console.log(`[BehaviorSimulator] 未找到展开按钮: ${selector}`);
        return;
      }

      console.log(`[BehaviorSimulator] 找到 ${buttons.length} 个展开按钮`);

      // 点击所有展开按钮
      for (const button of buttons) {
        try {
          await button.scrollIntoViewIfNeeded();
          await button.click();
          await page.waitForTimeout(getRandomWaitTime(300, 600));
        } catch (error) {
          console.warn(`[BehaviorSimulator] 点击展开按钮失败:`, error);
        }
      }
    } catch (error) {
      console.warn(`[BehaviorSimulator] 展开全文失败:`, error);
    }
  }

  /**
   * 模拟阅读停留
   * 根据内容长度模拟阅读时间
   */
  async simulateReading(page: Page, contentLength: number = 1000): Promise<void> {
    // 假设阅读速度：每秒300字
    const readingSpeed = 300; // 字/秒
    const readingTime = Math.min(
      (contentLength / readingSpeed) * 1000,
      5000 // 最长停留5秒
    );

    // 添加随机波动（±30%）
    const jitter = readingTime * 0.3 * (Math.random() - 0.5);
    const finalTime = Math.floor(readingTime + jitter);

    console.log(`[BehaviorSimulator] 模拟阅读 ${contentLength} 字，停留 ${finalTime}ms`);

    await page.waitForTimeout(finalTime);
  }

  /**
   * 执行完整的浏览行为序列
   * 包含滚动、悬停、停留等
   */
  async performBrowsingSequence(page: Page, options?: {
    scrollCount?: number;
    enableHover?: boolean;
    enableMouseMove?: boolean;
  }): Promise<void> {
    console.log(`[BehaviorSimulator] 开始执行浏览行为序列`);

    // 1. 初始停留
    await page.waitForTimeout(getRandomWaitTime(1000, 2000));

    // 2. 随机滚动
    const scrollCount = options?.scrollCount || Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < scrollCount; i++) {
      await this.randomScroll(page);
    }

    // 3. 随机悬停（可选）
    if (options?.enableHover !== false) {
      await this.randomHover(page, '.note-item');
    }

    // 4. 随机移动鼠标（可选）
    if (options?.enableMouseMove !== false) {
      await this.randomMouseMove(page, 2);
    }

    // 5. 最终停留
    await page.waitForTimeout(getRandomWaitTime(500, 1500));

    console.log(`[BehaviorSimulator] 浏览行为序列完成`);
  }

  /**
   * 执行智能等待
   * 根据页面状态动态调整等待时间
   */
  async smartWait(page: Page, options?: {
    minTime?: number;
    maxTime?: number;
    waitForNetworkIdle?: boolean;
  }): Promise<void> {
    const minTime = options?.minTime || 1000;
    const maxTime = options?.maxTime || 3000;

    // 基础等待
    const baseWaitTime = getRandomWaitTime(minTime, maxTime);
    await page.waitForTimeout(baseWaitTime);

    // 等待网络空闲（可选）
    if (options?.waitForNetworkIdle) {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (error) {
        console.warn(`[BehaviorSimulator] 等待网络空闲超时`);
      }
    }
  }
}
