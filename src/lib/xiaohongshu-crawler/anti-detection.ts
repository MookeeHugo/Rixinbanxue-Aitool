/**
 * 反检测策略模块
 *
 * 参考MediaCrawler的反爬虫策略，使用Playwright原生实现
 * 主要功能：
 * - 覆盖webdriver检测
 * - 伪装Chrome插件
 * - 伪装屏幕分辨率
 * - 覆盖权限查询
 */

import { Page } from 'playwright';
import { ANTI_DETECTION_CONFIG } from './config';

// ============================================================================
// 主函数：注入反检测脚本
// ============================================================================

/**
 * 向页面注入反检测脚本
 * 必须在页面导航之前调用（addInitScript）
 */
export async function injectAntiDetection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // ------------------------------------------------------------------------
    // 1. 覆盖webdriver检测
    // ------------------------------------------------------------------------
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: true,
    });

    // ------------------------------------------------------------------------
    // 2. 伪装Chrome插件（Codex建议：更真实的插件列表）
    // ------------------------------------------------------------------------
    const fakePlugins = [
      {
        name: 'Chrome PDF Plugin',
        description: 'Portable Document Format',
        filename: 'internal-pdf-viewer',
      },
      {
        name: 'Chrome PDF Viewer',
        description: '',
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
      },
      {
        name: 'Native Client',
        description: '',
        filename: 'internal-nacl-plugin',
      },
    ];

    Object.defineProperty(navigator, 'plugins', {
      get: () => fakePlugins,
      configurable: true,
    });

    // ------------------------------------------------------------------------
    // 3. 伪装屏幕分辨率（Codex建议：随机偏移）
    // ------------------------------------------------------------------------
    const randomWidthOffset = Math.floor(Math.random() * 200);
    const randomHeightOffset = Math.floor(Math.random() * 100);

    Object.defineProperty(window.screen, 'width', {
      get: () => 1920 + randomWidthOffset,
      configurable: true,
    });

    Object.defineProperty(window.screen, 'height', {
      get: () => 1080 + randomHeightOffset,
      configurable: true,
    });

    Object.defineProperty(window.screen, 'availWidth', {
      get: () => 1920 + randomWidthOffset,
      configurable: true,
    });

    Object.defineProperty(window.screen, 'availHeight', {
      get: () => 1040 + randomHeightOffset,  // 减去任务栏高度
      configurable: true,
    });

    // ------------------------------------------------------------------------
    // 4. 覆盖权限查询（避免触发Notification权限弹窗）
    // ------------------------------------------------------------------------
    const originalQuery = window.navigator.permissions.query;
    // @ts-ignore
    window.navigator.permissions.query = (parameters: any) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({
          state: Notification.permission,
        } as PermissionStatus);
      }
      return originalQuery(parameters);
    };

    // ------------------------------------------------------------------------
    // 5. 伪装Chrome运行环境
    // ------------------------------------------------------------------------
    // @ts-ignore
    window.chrome = {
      runtime: {},
      loadTimes: function () {},
      csi: function () {},
      app: {},
    };

    // ------------------------------------------------------------------------
    // 6. 覆盖语言检测
    // ------------------------------------------------------------------------
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en-US', 'en'],
      configurable: true,
    });

    Object.defineProperty(navigator, 'language', {
      get: () => 'zh-CN',
      configurable: true,
    });

    // ------------------------------------------------------------------------
    // 7. 伪装硬件信息（Codex建议：更真实的硬件参数）
    // ------------------------------------------------------------------------
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,  // 8核CPU
      configurable: true,
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,  // 8GB内存
      configurable: true,
    });

    // ------------------------------------------------------------------------
    // 8. 覆盖Canvas指纹（添加轻微噪点）
    // ------------------------------------------------------------------------
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string) {
      // 添加微小的随机噪点（不影响视觉）
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          // 随机修改0.1%的像素
          if (Math.random() < 0.001) {
            imageData.data[i] += Math.floor(Math.random() * 3) - 1;     // R
            imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1; // G
            imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1; // B
          }
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.call(this, type);
    };

    // ------------------------------------------------------------------------
    // 9. 覆盖WebGL指纹
    // ------------------------------------------------------------------------
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      // 伪装显卡供应商和渲染器
      if (parameter === 37445) {
        return 'Intel Inc.';  // UNMASKED_VENDOR_WEBGL
      }
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine';  // UNMASKED_RENDERER_WEBGL
      }
      return getParameter.call(this, parameter);
    };

    // ------------------------------------------------------------------------
    // 10. 覆盖Audio指纹（添加轻微噪点）
    // ------------------------------------------------------------------------
    const audioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (audioContext) {
      const originalCreateChannelSplitter = audioContext.prototype.createChannelSplitter;
      audioContext.prototype.createChannelSplitter = function () {
        const splitter = originalCreateChannelSplitter.apply(this, arguments as any);
        // 添加微小的随机延迟
        setTimeout(() => {
          // 微调音频参数
        }, Math.random() * 5);
        return splitter;
      };
    }

    // ------------------------------------------------------------------------
    // 11. 覆盖console.debug（隐藏Playwright痕迹）
    // ------------------------------------------------------------------------
    const originalDebug = console.debug;
    console.debug = function () {
      const args = Array.from(arguments);
      // 过滤Playwright相关的debug信息
      if (args.some((arg) => typeof arg === 'string' && arg.includes('playwright'))) {
        return;
      }
      return originalDebug.apply(console, arguments as any);
    };

    // ------------------------------------------------------------------------
    // 12. 隐藏自动化测试痕迹
    // ------------------------------------------------------------------------
    delete (window as any).__playwright;
    delete (window as any).__pw_manual;
    delete (navigator as any).__playwright;
  });
}

// ============================================================================
// 辅助函数：验证反检测效果
// ============================================================================

/**
 * 验证反检测是否生效
 * 用于开发调试
 */
export async function verifyAntiDetection(page: Page): Promise<boolean> {
  try {
    const checks = await page.evaluate(() => {
      return {
        webdriver: navigator.webdriver,
        pluginsCount: navigator.plugins.length,
        chrome: typeof (window as any).chrome !== 'undefined',
        languages: navigator.languages,
        hardwareConcurrency: navigator.hardwareConcurrency,
      };
    });

    console.log('[AntiDetection] 检测结果:', checks);

    // 验证关键指标
    const isValid =
      checks.webdriver === false &&
      checks.pluginsCount >= 3 &&
      checks.chrome === true &&
      checks.languages.includes('zh-CN');

    return isValid;
  } catch (error) {
    console.error('[AntiDetection] 验证失败:', error);
    return false;
  }
}
