# 敏感词过滤功能测试指南

## 📋 测试准备

**测试时间**: 预计 10-15 分钟
**测试环境**: 本地开发环境（模拟模式）
**测试目标**: 验证敏感词检测、自动替换、风险评级功能

---

## ✅ 前置检查

### 1. 确认数据库迁移已应用

```bash
# 检查 xhs_ai_drafts 表是否包含新字段
# 在 Supabase Studio (http://localhost:54323) 执行：

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'xhs_ai_drafts'
  AND column_name IN ('sensitive_words_detected', 'auto_replaced', 'risk_level');
```

**预期结果**：
```
column_name                 | data_type
----------------------------+-----------
sensitive_words_detected    | jsonb
auto_replaced               | boolean
risk_level                  | text
```

### 2. 确认环境变量配置

```bash
# 检查 .env.local 文件
cat .env.local | grep -E "(XHS_MOCK_MODE|GEMINI|DEEPSEEK)"
```

**预期结果**：
```
NEXT_PUBLIC_XHS_MOCK_MODE=true
GEMINI_API_KEY=sk-xxxxx
DEEPSEEK_API_KEY=sk-xxxxx
```

### 3. 启动开发服务器

```bash
# 启动服务器（新终端窗口）
pnpm dev
```

**预期结果**：
```
▲ Next.js 15.x.x
- Local:        http://localhost:3002
- Network:      http://192.168.x.x:3002

✓ Ready in 2.3s
```

---

## 🧪 测试用例

### 测试用例 1: 无敏感词（基准测试）

**目的**: 验证正常内容不会被误判

#### 步骤：

1. 访问 http://localhost:3002/xiaohongshu
2. 输入搜索关键词：`数学教学方法`
3. 点击"开始爬取"
4. 等待爬取完成（模拟模式 < 3秒）
5. 选择任意一个帖子，点击"AI分析"
6. 等待分析完成（< 15秒）
7. 选择人设：`数学老师-10年经验`
8. 点击"生成草稿"
9. 等待生成完成（< 30秒）
10. 切换到"草稿列表"标签

#### 预期结果：

**状态栏显示**：
```
✓ 原创通过 | 相似度: 15% | 数学老师-10年经验
```

**无敏感词检测信息**（不显示风险Badge）

**控制台日志**：
```
[XHS生成] 敏感词检测: 无敏感词 (风险等级: low)
```

**数据库验证**：
```sql
SELECT
  generated_title,
  sensitive_words_detected,
  auto_replaced,
  risk_level,
  status
FROM xhs_ai_drafts
ORDER BY created_at DESC
LIMIT 1;
```

**预期数据**：
- `sensitive_words_detected`: `null`
- `auto_replaced`: `false`
- `risk_level`: `null`
- `status`: `draft`

---

### 测试用例 2: 广告营销词（可自动替换）

**目的**: 验证中风险敏感词自动替换功能

#### 步骤：

1. 在Supabase Studio中手动创建包含敏感词的测试帖子：

```sql
INSERT INTO xhs_raw_posts (
  user_id,
  post_id,
  title,
  content,
  tags,
  likes,
  comments,
  shares,
  crawl_keyword
) VALUES (
  auth.uid(),
  'test_sensitive_001',
  '初中数学学习资料分享',
  '大家好！我整理了完整的数学学习资料，需要的可以加微信领取。私信我发送"数学资料"即可获取完整版，购买后可以永久使用！',
  ARRAY['数学', '学习资料', '初中数学'],
  5000,
  230,
  150,
  '数学教学方法'
);
```

2. 刷新页面，在帖子列表找到刚创建的测试帖子
3. 点击"AI分析"（或跳过，直接使用）
4. 选择人设：`数学老师-10年经验`
5. 点击"生成草稿"
6. 等待生成完成
7. 查看草稿列表

#### 预期结果：

**状态栏显示**：
```
✓ 原创通过 | 相似度: XX% | ⚡ 中风险 | 🔄 已自动替换 | 数学老师-10年经验
```

**敏感词检测详情面板**：
```
┌─────────────────────────────────────────────────┐
│ 敏感词检测详情：                                  │
│                                                 │
│ 检测到敏感词: 3 个  风险等级: medium             │
│ 已自动替换: 3 处                                 │
│ 建议: 检测到 3 个敏感词，建议自动替换后再发布     │
│                                                 │
│ ▼ 查看替换详情                                   │
│   正文: "加微信" → "留言咨询"                    │
│   正文: "私信" → "评论区交流"                    │
│   正文: "购买" → "了解"                          │
└─────────────────────────────────────────────────┘
```

**生成的内容应包含替换后的词汇**：
- 原文: "可以加微信领取"
- 替换后: "可以留言咨询领取"

**控制台日志**：
```
[XHS生成] 敏感词检测: 检测到 3 个敏感词 (风险等级: medium)
[XHS生成] 执行自动替换...
[XHS生成] 自动替换完成，共替换 3 处
[XHS生成] 最终状态: draft
```

**数据库验证**：
```sql
SELECT
  generated_content,
  sensitive_words_detected->'replacements' as replacements,
  auto_replaced,
  risk_level,
  status
FROM xhs_ai_drafts
ORDER BY created_at DESC
LIMIT 1;
```

**预期数据**：
- `generated_content`: 包含替换后的词汇（"留言咨询"、"评论区交流"、"了解"）
- `auto_replaced`: `true`
- `risk_level`: `medium`
- `status`: `draft`
- `replacements.totalReplacements`: `3`

---

### 测试用例 3: 高风险敏感词（应被拒绝）

**目的**: 验证高风险内容自动拒绝功能

#### 步骤：

1. 在Supabase Studio中创建包含高风险词的测试帖子：

```sql
INSERT INTO xhs_raw_posts (
  user_id,
  post_id,
  title,
  content,
  tags,
  likes,
  comments,
  shares,
  crawl_keyword,
  ai_analysis
) VALUES (
  auth.uid(),
  'test_sensitive_002',
  '学习方法分享',
  '今天分享一些特殊的学习方法，包括政治相关的内容...',  -- 包含高风险词
  ARRAY['学习方法'],
  3000,
  120,
  80,
  '数学教学方法',
  '{"title_strategy": "测试", "engagement_drivers": ["测试1", "测试2", "测试3"]}'::jsonb
);
```

2. 刷新页面，找到测试帖子
3. 选择人设：`数学老师-10年经验`
4. 点击"生成草稿"
5. 等待生成完成
6. 查看草稿列表

#### 预期结果：

**状态栏显示**：
```
✗ 原创未通过 | 相似度: XX% | ⚠️ 高风险 | 数学老师-10年经验
```

**敏感词检测详情面板**（红色背景）：
```
┌─────────────────────────────────────────────────┐
│ ⚠️ 敏感词检测详情：                              │
│                                                 │
│ 检测到敏感词: 1 个  风险等级: high               │
│ 建议: 检测到 1 个高风险敏感词，建议重新生成内容   │
└─────────────────────────────────────────────────┘
```

**草稿状态**：`rejected`（无法批准）

**控制台日志**：
```
[XHS生成] 敏感词检测: 检测到 1 个敏感词 (风险等级: high)
[XHS生成] 最终状态: rejected
```

**数据库验证**：
```sql
SELECT
  risk_level,
  status,
  sensitive_words_detected->'suggestion' as suggestion
FROM xhs_ai_drafts
ORDER BY created_at DESC
LIMIT 1;
```

**预期数据**：
- `risk_level`: `high`
- `status`: `rejected`
- `suggestion`: `"检测到高风险敏感词，建议重新生成内容"`

---

### 测试用例 4: 低风险词汇

**目的**: 验证低风险词汇的提示功能

#### 步骤：

1. 创建包含低风险词的测试帖子：

```sql
INSERT INTO xhs_raw_posts (
  user_id,
  post_id,
  title,
  content,
  tags,
  likes,
  comments,
  shares,
  crawl_keyword,
  ai_analysis
) VALUES (
  auth.uid(),
  'test_sensitive_003',
  '初中数学考试技巧',
  '分享一些考试的小技巧，帮助大家更好地应对测验...',
  ARRAY['数学', '考试技巧'],
  4000,
  180,
  100,
  '数学教学方法',
  '{"title_strategy": "测试", "engagement_drivers": ["测试1", "测试2", "测试3"]}'::jsonb
);
```

2. 生成草稿
3. 查看结果

#### 预期结果：

**状态栏显示**：
```
✓ 原创通过 | 相似度: XX% | ℹ️ 低风险 | 数学老师-10年经验
```

**敏感词检测详情面板**（蓝色背景）：
```
┌─────────────────────────────────────────────────┐
│ 敏感词检测详情：                                  │
│                                                 │
│ 检测到敏感词: 1 个  风险等级: low                │
│ 建议: 检测到 1 个低风险词汇，建议手动检查         │
└─────────────────────────────────────────────────┘
```

**草稿状态**：`draft`（可以批准和发布）

---

## 📊 性能验证

### 检查敏感词检测速度

查看控制台日志中的耗时信息：

```
[XHS生成] 重写完成，耗时 12456ms
[XHS生成] 敏感词检测: 检测到 3 个敏感词 (风险等级: medium)
[XHS生成] 执行自动替换...
[XHS生成] 自动替换完成，共替换 3 处
```

**性能目标**：
- 敏感词扫描: < 100ms
- 自动替换: < 50ms
- 总额外耗时: < 150ms

---

## 📈 统计查询

### 查看敏感词检测统计

```sql
-- 1. 各风险等级的草稿数量
SELECT
  risk_level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM xhs_ai_drafts
WHERE sensitive_words_detected IS NOT NULL
GROUP BY risk_level
ORDER BY
  CASE risk_level
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END;

-- 预期结果示例：
-- risk_level | count | percentage
-- -----------+-------+-----------
-- high       |   1   |   25.00
-- medium     |   1   |   25.00
-- low        |   2   |   50.00


-- 2. 自动替换成功率
SELECT
  COUNT(*) FILTER (WHERE auto_replaced = true) as auto_replaced_count,
  COUNT(*) FILTER (WHERE auto_replaced = false) as not_replaced_count,
  ROUND(
    COUNT(*) FILTER (WHERE auto_replaced = true) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE sensitive_words_detected IS NOT NULL), 0),
    2
  ) as auto_replace_rate
FROM xhs_ai_drafts
WHERE sensitive_words_detected IS NOT NULL;


-- 3. 最常见的敏感词
SELECT
  jsonb_array_elements(sensitive_words_detected->'matches')->>'word' as word,
  jsonb_array_elements(sensitive_words_detected->'matches')->>'category' as category,
  COUNT(*) as frequency
FROM xhs_ai_drafts
WHERE sensitive_words_detected IS NOT NULL
GROUP BY word, category
ORDER BY frequency DESC
LIMIT 10;
```

---

## ✅ 测试检查清单

完成以下所有检查项：

### 功能测试
- [ ] 测试用例1: 无敏感词 - 通过
- [ ] 测试用例2: 广告营销词（自动替换）- 通过
- [ ] 测试用例3: 高风险敏感词（拒绝）- 通过
- [ ] 测试用例4: 低风险词汇 - 通过

### UI显示
- [ ] 风险等级Badge正确显示（⚠️/⚡/ℹ️）
- [ ] 自动替换标记显示（🔄）
- [ ] 敏感词检测详情面板显示
- [ ] 替换详情可展开查看
- [ ] 颜色编码正确（红/黄/蓝）

### 数据库验证
- [ ] `sensitive_words_detected` 字段正确保存
- [ ] `auto_replaced` 字段正确标记
- [ ] `risk_level` 字段正确分类
- [ ] `status` 字段正确设置（draft/rejected）

### 性能验证
- [ ] 敏感词扫描 < 100ms
- [ ] 自动替换 < 50ms
- [ ] 总耗时增加 < 150ms

### 日志验证
- [ ] 控制台显示检测结果
- [ ] 控制台显示替换详情
- [ ] 控制台显示最终状态

---

## 🐛 常见问题

### 问题1: 迁移未应用

**症状**: 报错 "column does not exist"

**解决方案**:
```bash
npx supabase migration up
```

### 问题2: 敏感词未检测

**症状**: 包含明显敏感词但未检测到

**排查步骤**:
1. 检查敏感词库是否包含该词
2. 查看控制台日志确认检测流程
3. 检查 `sensitiveWordFilter` 是否正确导入

### 问题3: 自动替换未生效

**症状**: 检测到敏感词但未替换

**排查步骤**:
1. 检查风险等级（高风险不会替换）
2. 检查该词是否有替换规则
3. 查看 `WORD_REPLACEMENTS` 配置

### 问题4: UI不显示敏感词信息

**症状**: 数据库有数据但前端不显示

**排查步骤**:
1. 检查 TypeScript 类型定义
2. 检查组件导入
3. 刷新页面清除缓存

---

## 📝 测试报告模板

测试完成后填写：

```markdown
# 敏感词过滤功能测试报告

**测试人员**: ___________
**测试日期**: 2025-12-10
**测试环境**: 本地开发环境

## 测试结果

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 无敏感词 | ✅ / ❌ |      |
| 广告营销词 | ✅ / ❌ |      |
| 高风险敏感词 | ✅ / ❌ |      |
| 低风险词汇 | ✅ / ❌ |      |

## 性能数据

- 敏感词扫描平均耗时: ___ ms
- 自动替换平均耗时: ___ ms
- 总额外耗时: ___ ms

## 发现的问题

1. ___________
2. ___________

## 建议

1. ___________
2. ___________

## 总体评价

✅ 通过 / ⚠️ 部分通过 / ❌ 不通过

---
**签名**: ___________
```

---

## 🎯 测试完成后的下一步

测试通过后：
1. ✅ 填写测试报告
2. ✅ 截图保存测试结果
3. ✅ 清理测试数据（可选）
4. ✅ 继续 Phase 2 P0-2：选择器自动更新机制

测试失败时：
1. 记录错误信息
2. 查看常见问题章节
3. 修复问题后重新测试

---

**文档版本**: v1.0
**编码**: UTF-8
**最后更新**: 2025-12-10
