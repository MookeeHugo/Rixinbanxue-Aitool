/**
 * 小红书爬虫类型定义
 */

// ============================================================================
// 爬虫配置
// ============================================================================

export interface CrawlConfig {
  keyword: string;         // 搜索关键词
  minLikes: number;        // 最低点赞数
  maxResults: number;      // 最多结果数
  useProxy: boolean;       // 是否使用代理
}

export interface ProxyConfig {
  server: string;          // 代理服务器地址 (例如: http://proxy.example.com:8080)
  username?: string;       // 代理用户名（可选）
  password?: string;       // 代理密码（可选）
}

// ============================================================================
// 小红书帖子数据结构
// ============================================================================

export interface XHSPost {
  post_id: string;         // 帖子ID
  title: string;           // 标题
  content: string;         // 正文
  images: string[];        // 图片URL数组
  likes: number;           // 点赞数
  comments: number;        // 评论数
  shares: number;          // 分享数
  collects?: number;       // 收藏数（新增）
  author_id: string;       // 作者ID（不暴露给前端）
  author_name: string;     // 作者昵称
  tags: string[];          // 标签数组
  category?: string;       // 分类
  publish_time?: string;   // 发布时间（新增）
}

// ============================================================================
// 爬虫元数据
// ============================================================================

export interface CrawlMetadata {
  startTime: number;       // 开始时间戳
  endTime?: number;        // 结束时间戳
  duration?: number;       // 耗时（毫秒）
  totalPosts: number;      // 爬取到的帖子总数
  errors: string[];        // 错误信息列表
  retryCount: number;      // 重试次数
}

// ============================================================================
// 爬虫结果
// ============================================================================

export interface CrawlResult {
  success: boolean;
  posts: XHSPost[];
  metadata: CrawlMetadata;
  error?: string;
}

// ============================================================================
// 行为模拟配置
// ============================================================================

export interface BehaviorSimulationConfig {
  scrollCount: number;     // 滚动次数
  minScrollDistance: number; // 最小滚动距离（像素）
  maxScrollDistance: number; // 最大滚动距离（像素）
  minWaitTime: number;     // 最小等待时间（毫秒）
  maxWaitTime: number;     // 最大等待时间（毫秒）
}
