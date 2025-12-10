# 小红书AI运营系统 - 完整测试指南

## 📋 测试概述

本文档提供完整的测试流程，确保系统在生产环境中稳定运行。

---

## 🧪 测试环境准备

### 1. 环境变量检查

确保 `.env.local` 包含以下配置：

```bash
# Gemini配置（用于AI分析）
GEMINI_API_KEY=your-key-here
GEMINI_BASE_URL=https://api.ikuncode.cc  # 或官方URL
GEMINI_MODEL=gemini-2.5-flash
GEMINI_REQUEST_TIMEOUT=120000

# DeepSeek配置（用于内容重写）
DEEPSEEK_API_KEY=your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com  # 可选

# 测试模式（可选）
NEXT_PUBLIC_XHS_MOCK_MODE=true  # true=模拟数据，false=真实爬虫
```

### 2. 数据库状态检查

```bash
# 检查数据库运行状态
pnpm db:status

# 如果未运行，启动数据库
pnpm db:start

# 打开数据库管理界面
pnpm db:studio
```

### 3. 验证表结构

在Supabase Studio中，确认以下表存在：
- ✅ `xhs_raw_posts` - 原始帖子表
- ✅ `xhs_ai_drafts` - AI草稿表
- ✅ `xhs_crawl_quotas` - 配额管理表

---

## ✅ 功能测试清单

### 测试1：配额系统测试

**目的**：验证配额限制和自动重置功能

**步骤**：
1. 登录系统（teacher@test.com / test123456）
2. 访问 `http://localhost:3002/xiaohongshu`
3. 查看页面顶部的配额显示：
   - 每日爬取配额：X/50
   - 每小时配额：X/10
   - 每日生成配额：X/20

**预期结果**：
- ✅ 配额数字正确显示
- ✅ 进度条颜色正确（绿色 < 70%，黄色 70-90%，红色 > 90%）

**验证SQL**：
```sql
-- 在Supabase Studio的SQL Editor中执行
SELECT * FROM xhs_crawl_quotas
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;
```

---

### 测试2：爬虫功能测试（模拟模式）

**目的**：验证爬虫接口和数据保存

**步骤**：
1. 设置 `NEXT_PUBLIC_XHS_MOCK_MODE=true`
2. 重启开发服务器：`pnpm dev`
3. 输入关键词：`数学教学`
4. 设置最低点赞数：`1000`
5. 点击"开始爬取"

**预期结果**：
- ✅ 2-3秒内返回结果
- ✅ 显示2个模拟帖子
- ✅ 配额减少1次
- ✅ 数据保存到数据库

**验证SQL**：
```sql
SELECT
  post_id,
  title,
  likes,
  comments,
  crawl_keyword,
  created_at
FROM xhs_raw_posts
WHERE crawl_keyword = '数学教学'
ORDER BY created_at DESC;
```

---

### 测试3：AI分析功能测试

**目的**：验证Gemini分析器工作正常

**步骤**：
1. 在帖子列表中找到任意帖子
2. 点击"AI分析"按钮
3. 等待10-15秒

**预期结果**：
- ✅ 按钮变为"分析中..."
- ✅ 10-15秒后按钮变为"✓ 已分析"
- ✅ 控制台显示token使用和成本
- ✅ 数据库字段更新

**验证SQL**：
```sql
SELECT
  post_id,
  title,
  ai_analysis->>'title_strategy' as title_strategy,
  ai_analysis->>'emotional_appeal' as emotional_appeal,
  analysis_cost_usd,
  analysis_tokens_used,
  analyzed_at
FROM xhs_raw_posts
WHERE ai_analysis IS NOT NULL
ORDER BY analyzed_at DESC
LIMIT 1;
```

**控制台日志示例**：
```
[GeminiAnalyzer] 尝试分析 (1/3)
[GeminiAnalyzer] 分析完成，耗时 8234ms，成本 $0.000523
[GeminiAnalyzer] Token使用: input=456, output=892
```

---

### 测试4：内容生成功能测试

**目的**：验证DeepSeek重写器和原创性检测

**步骤**：
1. 选择已分析的帖子
2. 选择人设：`数学老师-10年经验`
3. 点击"生成草稿"
4. 等待15-25秒

**预期结果**：
- ✅ 按钮变为"生成中..."
- ✅ 15-25秒后跳转到草稿列表
- ✅ 显示原文 vs AI生成的对比
- ✅ 相似度 < 20%（原创通过）
- ✅ 配额减少1次

**验证SQL**：
```sql
SELECT
  d.id,
  d.user_persona,
  d.originality_passed,
  d.similarity_score,
  d.similarity_details,
  d.cost_usd,
  d.tokens_used,
  p.title as original_title
FROM xhs_ai_drafts d
JOIN xhs_raw_posts p ON d.original_post_id = p.id
WHERE d.user_persona = '数学老师-10年经验'
ORDER BY d.created_at DESC
LIMIT 1;
```

**控制台日志示例**：
```
[DeepSeekRewriter] 开始重写...
[DeepSeekRewriter] 重写完成，耗时 12456ms，成本 $0.001234
[OriginalityChecker] 相似度: 15.6%，通过: true
```

---

### 测试5：草稿对比和复制功能测试

**目的**：验证前端UI功能

**步骤**：
1. 切换到"草稿列表"标签
2. 查看对比视图
3. 点击"复制"按钮（标题、正文、标签）
4. 点击"📋 一键复制全部"

**预期结果**：
- ✅ 左侧显示原文，右侧显示AI生成
- ✅ 原创性标签正确显示（绿色✓ 或 红色✗）
- ✅ 相似度百分比显示
- ✅ 复制按钮点击后变为"✓ 已复制"
- ✅ 内容成功复制到剪贴板

---

### 测试6：配额限制测试

**目的**：验证配额超限阻止功能

**步骤**：
1. 在数据库中手动设置配额为限制值：
```sql
UPDATE xhs_crawl_quotas
SET
  daily_crawl_used = 50,
  hourly_crawl_used = 10
WHERE user_id = auth.uid();
```
2. 尝试爬取新帖子

**预期结果**：
- ✅ 显示错误：`每日爬取配额已用完（50/50）`
- ✅ 或：`每小时配额已用完（10/10）`
- ✅ 爬取被阻止
- ✅ 配额数字不再增加

**恢复操作**：
```sql
-- 重置配额
UPDATE xhs_crawl_quotas
SET
  daily_crawl_used = 0,
  hourly_crawl_used = 0,
  daily_generate_used = 0
WHERE user_id = auth.uid();
```

---

### 测试7：错误处理测试

**目的**：验证各种错误场景的处理

#### 7.1 Gemini API错误

**模拟方法**：临时设置错误的API Key
```bash
GEMINI_API_KEY=invalid-key
```

**预期结果**：
- ✅ 显示错误：`AI分析失败: Gemini API返回错误`
- ✅ 配额自动回滚
- ✅ 数据库不保存错误数据

#### 7.2 DeepSeek API错误

**模拟方法**：临时设置错误的API Key
```bash
DEEPSEEK_API_KEY=invalid-key
```

**预期结果**：
- ✅ 显示错误：`生成失败: DeepSeek请求失败`
- ✅ 配额自动回滚

#### 7.3 原创性不通过

**模拟方法**：修改原创性检测阈值
```typescript
// 临时修改 src/lib/xiaohongshu/originality-checker.ts
const ORIGINALITY_THRESHOLD = 0.01; // 改为极低值
```

**预期结果**：
- ✅ 草稿状态为`rejected`
- ✅ 显示红色标签：`✗ 原创未通过`
- ✅ 相似度百分比 > 20%

---

## 🚀 性能基准测试

### 基准1：爬虫速度

**目标**：单次爬取 < 5分钟（真实模式）

**测试方法**：
```bash
# 在控制台查看耗时
[PlaywrightCrawler] 爬取完成，耗时: XXXXms
```

**预期值**：
- 模拟模式：< 3秒
- 真实模式：< 300秒（5分钟）

### 基准2：AI分析速度

**目标**：单次分析 < 15秒

**测试方法**：查看控制台日志
```
[GeminiAnalyzer] 分析完成，耗时 XXXXms
```

**预期值**：
- Gemini分析：< 15000ms（15秒）
- Token使用：400-800 tokens

### 基准3：内容生成速度

**目标**：单次生成 < 30秒

**测试方法**：查看控制台日志
```
[DeepSeekRewriter] 重写完成，耗时 XXXXms
```

**预期值**：
- DeepSeek重写：< 20000ms（20秒）
- 原创性检测：< 1000ms（1秒）
- 总计：< 30秒

### 基准4：原创性通过率

**目标**：> 80%的草稿通过原创性检测

**测试方法**：
```sql
SELECT
  COUNT(*) FILTER (WHERE originality_passed = true) * 100.0 / COUNT(*) as pass_rate
FROM xhs_ai_drafts
WHERE created_at > NOW() - INTERVAL '7 days';
```

**预期值**：
- 通过率：> 80%
- 平均相似度：< 18%

---

## 📊 数据质量验证

### 验证1：JSON结构完整性

**SQL查询**：
```sql
-- 检查AI分析JSON是否完整
SELECT
  post_id,
  title,
  CASE
    WHEN ai_analysis ? 'title_strategy' THEN '✓' ELSE '✗'
  END as has_title_strategy,
  CASE
    WHEN ai_analysis ? 'engagement_drivers' THEN '✓' ELSE '✗'
  END as has_engagement,
  jsonb_array_length(ai_analysis->'engagement_drivers') as driver_count
FROM xhs_raw_posts
WHERE ai_analysis IS NOT NULL;
```

**预期结果**：
- ✅ 所有字段都有 ✓
- ✅ engagement_drivers >= 3

### 验证2：成本追踪准确性

**SQL查询**：
```sql
SELECT
  SUM(analysis_cost_usd) as total_analysis_cost,
  SUM(cost_usd) as total_generation_cost,
  COUNT(*) FILTER (WHERE ai_analysis IS NOT NULL) as analyzed_count,
  COUNT(*) as total_drafts
FROM xhs_raw_posts p
LEFT JOIN xhs_ai_drafts d ON p.id = d.original_post_id;
```

**预期结果**：
- ✅ 成本合理（分析 ~$0.0005/次，生成 ~$0.0012/次）
- ✅ 数字与实际API调用次数匹配

---

## 🐛 常见问题排查

### 问题1：爬取失败（真实模式）

**症状**：显示"未找到帖子列表"

**排查步骤**：
1. 查看调试截图：`debug-xiaohongshu-error.png`
2. 检查选择器是否过时：
   ```typescript
   // src/lib/xiaohongshu-crawler/config.ts
   export const XHS_SELECTORS = {
     noteItem: '.note-item',  // 可能需要更新
     // ...
   };
   ```
3. 访问 https://www.xiaohongshu.com，用F12查看实际DOM结构
4. 更新选择器配置

**临时解决方案**：使用模拟模式
```bash
NEXT_PUBLIC_XHS_MOCK_MODE=true
```

### 问题2：AI分析超时

**症状**：等待超过30秒无响应

**排查步骤**：
1. 检查API Key是否有效
2. 检查网络连接（是否需要代理）
3. 查看控制台错误日志
4. 检查Gemini配额（api.ikuncode.cc账户余额）

**解决方案**：
```bash
# 增加超时时间
GEMINI_REQUEST_TIMEOUT=180000  # 3分钟
```

### 问题3：原创性检测总是不通过

**症状**：相似度总是 > 20%

**排查步骤**：
1. 检查原文内容是否过短（< 100字）
2. 查看相似度详情：
   ```sql
   SELECT similarity_details FROM xhs_ai_drafts ORDER BY created_at DESC LIMIT 1;
   ```
3. 尝试更换人设（增加差异化）
4. 检查DeepSeek的temperature设置（应为0.8）

**解决方案**：
- 调整temperature为0.9（更高创意）
- 更换人设（如从"数学老师"换成"编程老师"）

---

## ✅ 完整测试检查表

在生产部署前，确保以下所有项通过：

**功能测试**：
- [ ] 配额系统显示正确
- [ ] 爬虫（模拟模式）正常工作
- [ ] 爬虫（真实模式）正常工作（可选）
- [ ] AI分析正常完成
- [ ] 内容生成正常完成
- [ ] 原创性检测正确判断
- [ ] 草稿对比界面正常显示
- [ ] 复制功能正常工作
- [ ] 配额限制正确阻止超额请求

**性能测试**：
- [ ] 爬虫速度 < 5分钟
- [ ] AI分析速度 < 15秒
- [ ] 内容生成速度 < 30秒
- [ ] 原创性通过率 > 80%

**数据质量**：
- [ ] JSON结构完整
- [ ] 成本追踪准确
- [ ] 配额自动重置
- [ ] RLS策略正确隔离用户数据

**错误处理**：
- [ ] API错误正确显示
- [ ] 配额超限正确阻止
- [ ] 原创性不通过正确标记
- [ ] 失败时配额自动回滚

---

## 📞 测试支持

如果测试中遇到问题：

1. **查看日志**：
   - 浏览器控制台（F12 → Console）
   - 终端输出（Next.js日志）
   - Supabase日志（`pnpm db:studio` → Logs）

2. **查看数据**：
   ```bash
   pnpm db:studio
   # 然后查看 xhs_* 表的数据
   ```

3. **重置测试环境**：
   ```sql
   -- 删除所有测试数据
   DELETE FROM xhs_ai_drafts;
   DELETE FROM xhs_raw_posts;
   UPDATE xhs_crawl_quotas SET
     daily_crawl_used = 0,
     hourly_crawl_used = 0,
     daily_generate_used = 0;
   ```

---

**测试版本**：MVP v1.0
**最后更新**：2025-12-10
**建议测试周期**：每次部署前 + 每周回归测试
