/**
 * 小红书爬虫配置
 */

// ============================================================================
// User-Agent池（Codex建议：多UA轮换）
// ============================================================================

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

// ============================================================================
// 视口尺寸池（Codex建议：多分辨率伪装）
// ============================================================================

export const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
];

// ============================================================================
// 爬虫限制配置
// ============================================================================

export const CRAWLER_CONFIG = {
  // 重试配置
  maxRetries: 3,                    // 最大重试次数
  retryBaseDelay: 1000,            // 重试基础延迟（毫秒）
  retryMaxDelay: 8000,             // 重试最大延迟（毫秒）

  // 超时配置
  navigationTimeout: 30000,        // 页面导航超时（30秒）
  selectorTimeout: 15000,          // 选择器等待超时（15秒）

  // 爬取限制
  maxPostsPerCrawl: 10,           // 每次爬取最多帖子数（Codex建议：提前短路）
  minPostLikes: 1000,             // 默认最低点赞数

  // 行为模拟配置
  scrollCount: { min: 2, max: 4 },              // 滚动次数范围
  scrollDistance: { min: 200, max: 700 },       // 滚动距离范围（像素）
  waitTime: { min: 1000, max: 3000 },           // 等待时间范围（毫秒）
  hoverTime: { min: 500, max: 1000 },           // 悬停时间范围（毫秒）

  // 软封禁检测
  emptyListThreshold: 0,          // 空列表阈值（检测到0个结果视为封禁）
} as const;

// ============================================================================
// 小红书选择器（可能需要定期更新）
// ============================================================================

export const XHS_SELECTORS = {
  // 搜索结果页
  noteItem: '.note-item',                    // 帖子卡片
  noteLink: 'a[href*="/explore/"]',         // 帖子链接

  // 帖子详情
  title: '.title',                           // 标题
  content: '.content',                       // 正文
  likeCount: '.like-count',                 // 点赞数
  commentCount: '.comment-count',           // 评论数
  shareCount: '.share-count',               // 分享数
  authorName: '.author-name',               // 作者昵称
  authorId: '[data-author-id]',             // 作者ID
  tags: '.tag-item',                        // 标签
  images: '.image-item img',                // 图片

  // 交互元素
  expandBtn: '.expand-btn',                 // 展开全文按钮
  loadMoreBtn: '.load-more',                // 加载更多按钮
} as const;

// ============================================================================
// 小红书URL配置
// ============================================================================

export const XHS_URLS = {
  base: 'https://www.xiaohongshu.com',
  search: (keyword: string) =>
    `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`,
  post: (postId: string) =>
    `https://www.xiaohongshu.com/explore/${postId}`,
} as const;

// ============================================================================
// 反爬虫策略配置
// ============================================================================

export const ANTI_DETECTION_CONFIG = {
  // Chrome插件伪装
  fakePlugins: [
    { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
    { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
    { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' },
  ],

  // 语言和时区
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',

  // 屏幕分辨率随机偏移
  screenWidthOffset: { min: 0, max: 200 },
  screenHeightOffset: { min: 0, max: 100 },
} as const;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取随机User-Agent
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 获取随机视口尺寸
 */
export function getRandomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

/**
 * 获取随机等待时间
 */
export function getRandomWaitTime(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 计算指数退避延迟
 */
export function getExponentialBackoffDelay(attempt: number): number {
  const delay = Math.min(
    CRAWLER_CONFIG.retryBaseDelay * Math.pow(2, attempt),
    CRAWLER_CONFIG.retryMaxDelay
  );
  // 添加随机抖动（±20%）
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.floor(delay + jitter);
}
