# 小红书AI运营系统 - Phase 2 路线图

## 📅 开发计划

**当前版本**：MVP v1.0（已完成）
**Phase 2 目标**：生产就绪 + 高级功能
**预计工期**：2-3周
**优先级**：P0（必须） > P1（重要） > P2（可选）

---

## ✅ Phase 1 (MVP) 完成情况

### 已实现功能
- ✅ Playwright无头浏览器爬虫
- ✅ 12层反检测策略
- ✅ Gemini 2.5 Flash爆款分析
- ✅ DeepSeek智能重写（4种教师人设）
- ✅ 双重原创性检测（<20%通过率）
- ✅ 三层配额管理（日/时/生成）
- ✅ 对比视图 + 分段复制
- ✅ 测试模式（模拟数据）

### 当前限制
- ⚠️ 真实爬虫选择器需要维护
- ⚠️ 仅支持手动复制粘贴发布
- ⚠️ 无敏感词过滤
- ⚠️ 无代理IP支持
- ⚠️ 无图片下载功能

---

## 🚀 Phase 2 功能清单

### P0：生产就绪优化（必须完成）

#### 1. 爬虫选择器自动更新机制
**问题**：小红书网页结构频繁变化，选择器容易失效

**解决方案**：
- 实现选择器健康检查
- 自动截图 + OCR识别帖子区域
- 多选择器池（5-10个候选）
- 失败时自动切换备用选择器

**文件改动**：
```typescript
// src/lib/xiaohongshu-crawler/selector-manager.ts (新建)
export class SelectorManager {
  private selectorPool: string[];
  private currentIndex: number;

  async findWorkingSelector(page: Page): Promise<string | null>
  async updateSelectorPool(): Promise<void>
  async reportFailure(selector: string): Promise<void>
}
```

**成功标准**：
- 选择器失效时自动切换成功率 > 90%
- 每周自动检测选择器健康度

---

#### 2. 敏感词过滤系统
**问题**：生成的内容可能包含敏感词，导致发布失败或封号

**解决方案**：
- 内置敏感词库（政治、色情、暴力等）
- 生成后自动扫描
- 检测到敏感词自动替换或重新生成

**文件改动**：
```typescript
// src/lib/xiaohongshu/sensitive-word-filter.ts (新建)
export class SensitiveWordFilter {
  private wordList: Set<string>;

  async scanContent(content: string): Promise<{
    hasSensitiveWords: boolean;
    matches: Array<{ word: string; position: number }>;
    suggestion: string;
  }>

  async replaceSensitiveWords(content: string): Promise<string>
}
```

**数据库改动**：
```sql
-- 在 xhs_ai_drafts 表添加字段
ALTER TABLE xhs_ai_drafts ADD COLUMN sensitive_words_detected JSONB;
ALTER TABLE xhs_ai_drafts ADD COLUMN auto_replaced BOOLEAN DEFAULT false;
```

**成功标准**：
- 检测准确率 > 95%
- 误报率 < 5%
- 处理时间 < 500ms

---

#### 3. robots.txt 合规检查
**问题**：需要确保爬虫行为合法合规

**解决方案**：
- 启动前检查 xiaohongshu.com/robots.txt
- 遵守 Crawl-delay 指令
- 记录爬取日志（时间、URL、结果）

**文件改动**：
```typescript
// src/lib/xiaohongshu-crawler/compliance-checker.ts (新建)
export class ComplianceChecker {
  async checkRobotsTxt(url: string): Promise<{
    allowed: boolean;
    crawlDelay: number;
    disallowedPaths: string[];
  }>

  async logCrawlActivity(activity: CrawlLog): Promise<void>
}
```

**数据库改动**：
```sql
-- 新建爬虫日志表
CREATE TABLE xhs_crawl_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  keyword TEXT,
  posts_found INTEGER,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'failed', 'blocked')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**成功标准**：
- 100% 遵守 robots.txt 规则
- 完整记录所有爬取活动

---

### P1：用户体验优化（重要）

#### 4. 批量操作功能
**功能**：
- 批量AI分析（选中多个帖子一次性分析）
- 批量生成草稿
- 批量导出

**UI改动**：
```tsx
// src/components/xiaohongshu/post-list.tsx
// 添加复选框 + 批量操作工具栏
<Checkbox onChange={handleSelectAll} />
<Button onClick={handleBatchAnalyze}>批量分析（3个）</Button>
```

**后端改动**：
```typescript
// src/app/actions/xiaohongshu.ts
export async function batchAnalyzePosts(postIds: string[]): Promise<ActionResult>
export async function batchGenerateDrafts(postIds: string[], persona: string): Promise<ActionResult>
```

**成功标准**：
- 支持一次处理最多10个帖子
- 显示批量进度条
- 失败时继续处理其他项

---

#### 5. 高级筛选和排序
**功能**：
- 按点赞数、评论数、分享数排序
- 按分析状态筛选（已分析/未分析/已生成）
- 按原创性筛选（通过/未通过）
- 搜索功能（标题、内容关键词）

**UI改动**：
```tsx
// src/components/xiaohongshu/filter-bar.tsx (新建)
<Select placeholder="排序">
  <option value="likes_desc">点赞数（高到低）</option>
  <option value="created_desc">时间（最新）</option>
</Select>

<Input placeholder="搜索标题或内容..." />
```

**成功标准**：
- 排序实时生效（< 100ms）
- 搜索支持中文分词
- 筛选组合生效

---

#### 6. 数据导出功能
**功能**：
- 导出为Excel（原文 + AI生成 对比表）
- 导出为JSON（API数据格式）
- 导出为Markdown（便于查看）

**实现**：
```typescript
// src/lib/xiaohongshu/exporter.ts (新建)
export class DataExporter {
  async exportToExcel(drafts: Draft[]): Promise<Blob>
  async exportToJSON(drafts: Draft[]): Promise<string>
  async exportToMarkdown(drafts: Draft[]): Promise<string>
}
```

**依赖**：
```bash
pnpm add xlsx file-saver
```

**成功标准**：
- 导出100条记录 < 3秒
- Excel格式正确（支持中文）
- 文件大小合理（< 5MB）

---

### P2：高级功能（可选）

#### 7. 代理IP接口集成
**功能**：
- 支持HTTP/HTTPS代理
- 代理池轮换
- 自动检测代理健康度

**配置**：
```bash
# .env.local
PROXY_POOL_URL=https://api.proxy-provider.com/get
PROXY_ROTATION_ENABLED=true
PROXY_CHECK_INTERVAL=3600000  # 1小时检查一次
```

**实现**：
```typescript
// src/lib/xiaohongshu-crawler/proxy-manager.ts (新建)
export class ProxyManager {
  async getNextProxy(): Promise<{ host: string; port: number; auth?: string }>
  async markProxyFailed(proxy: string): Promise<void>
  async checkProxyHealth(proxy: string): Promise<boolean>
}
```

**成功标准**：
- 代理切换成功率 > 95%
- 检测到封禁自动切换 < 5秒

---

#### 8. 图片下载与管理
**功能**：
- 下载帖子封面图
- 保存到R2/Supabase Storage
- 显示图片预览
- 支持图片批量下载

**数据库改动**：
```sql
ALTER TABLE xhs_raw_posts ADD COLUMN cover_image_url TEXT;
ALTER TABLE xhs_raw_posts ADD COLUMN cover_image_r2_key TEXT;
```

**实现**：
```typescript
// src/lib/xiaohongshu/image-manager.ts (新建)
export class ImageManager {
  async downloadImage(url: string): Promise<Buffer>
  async uploadToR2(buffer: Buffer, filename: string): Promise<string>
  async getSignedUrl(r2Key: string): Promise<string>
}
```

**成功标准**：
- 下载成功率 > 90%
- 单张图片下载 < 3秒
- 图片质量无损

---

#### 9. 定时任务调度
**功能**：
- 每日自动爬取（固定关键词）
- 每周生成报告（爆款趋势分析）
- 配额自动重置

**实现方案**：使用Vercel Cron Jobs或Supabase Edge Functions

**配置**：
```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-crawl",
      "schedule": "0 9 * * *"  // 每天9点
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 10 * * 1"  // 每周一10点
    }
  ]
}
```

**成功标准**：
- 定时任务准时执行（误差 < 5分钟）
- 失败自动重试3次
- 发送邮件通知结果

---

#### 10. 自动发布功能（谨慎）
**风险**：可能违反小红书服务条款，导致封号

**实现方案**：
- 使用Playwright模拟登录
- 模拟人类行为（随机延迟、鼠标移动）
- 添加验证码识别（OCR/第三方服务）

**推荐做法**：
- ⚠️ 仅用于测试环境
- ⚠️ 生产环境建议手动发布
- ⚠️ 或使用官方API（如果存在）

**暂不实现**，除非用户明确要求

---

## 📊 性能优化目标

### 当前性能
- 爬虫速度：模拟<3s，真实<5分钟
- AI分析：<15秒
- 内容生成：<30秒
- 原创性通过率：预计80%+

### Phase 2 目标
- 爬虫速度：真实模式 <3分钟（提升40%）
- AI分析：<10秒（提升33%）
- JSON解析成功率：>97%
- 原创性通过率：>85%
- 系统可用性：>99.5%

---

## 💰 成本优化

### 当前成本（预估）
- Gemini分析：$0.0005/次
- DeepSeek重写：$0.0012/次
- 月均200次使用：~$0.34/月

### Phase 2 优化措施
1. **缓存分析结果**：相同帖子不重复分析
2. **批量请求**：减少API调用次数
3. **使用更便宜的模型**：
   - Gemini 2.0 Flash Exp（免费，限额内）
   - DeepSeek Chat（$0.14/$0.28）

**目标**：成本降低30%，控制在 ~$0.25/月

---

## 🛠️ 技术债务清理

### 代码优化
1. **类型安全**：所有any类型改为具体类型
2. **错误处理**：统一错误处理机制
3. **日志系统**：结构化日志（JSON格式）
4. **测试覆盖**：单元测试覆盖率 > 70%

### 文档完善
1. **API文档**：所有Server Actions的详细说明
2. **部署指南**：Vercel/Railway部署步骤
3. **故障排查手册**：常见问题 + 解决方案

---

## 📅 开发时间表

### 第1周：P0功能
- Day 1-2: 选择器自动更新机制
- Day 3-4: 敏感词过滤系统
- Day 5: robots.txt 合规检查
- Day 6-7: 测试 + 文档

### 第2周：P1功能
- Day 1-2: 批量操作功能
- Day 3-4: 高级筛选和排序
- Day 5: 数据导出功能
- Day 6-7: 测试 + 优化

### 第3周：P2功能（可选）
- Day 1-2: 代理IP集成
- Day 3-4: 图片下载管理
- Day 5: 定时任务
- Day 6-7: 完整测试 + 上线

---

## ✅ 完成标准

Phase 2 完成时，系统应达到：

**功能完整性**：
- ✅ 所有P0功能100%完成
- ✅ 至少3个P1功能完成
- ✅ 至少1个P2功能完成

**性能指标**：
- ✅ 爬虫成功率 > 95%
- ✅ AI分析速度 < 10秒
- ✅ 原创性通过率 > 85%
- ✅ 系统可用性 > 99.5%

**代码质量**：
- ✅ TypeScript无any类型
- ✅ 测试覆盖率 > 70%
- ✅ 所有功能有文档

**生产就绪**：
- ✅ 部署到生产环境
- ✅ 监控和告警配置
- ✅ 备份和恢复策略

---

## 🎯 下一步行动

1. **用户确认优先级**：
   - 哪些P0/P1/P2功能是必须的？
   - 是否有其他需求？

2. **技术选型确认**：
   - 代理服务商选择？
   - 图片存储方案（R2 vs Supabase Storage）？
   - 定时任务方案（Vercel Cron vs Supabase Edge）？

3. **开始开发**：
   - 创建新分支：`git checkout -b feature/phase2`
   - 按时间表逐个实现功能
   - 每个功能完成后提交 + 测试

---

**文档版本**：Phase 2 Roadmap v1.0
**创建时间**：2025-12-10
**负责人**：待定
**预计完成**：2025-12-31
