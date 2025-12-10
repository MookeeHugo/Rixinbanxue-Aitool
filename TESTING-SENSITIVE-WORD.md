# 🧪 敏感词过滤功能 - 快速测试

## ✅ 准备工作已完成

1. ✅ 数据库迁移已应用（新增3个字段）
2. ✅ 敏感词过滤器已实现
3. ✅ 后端API已集成
4. ✅ 前端UI已更新

---

## 🚀 立即开始测试（3步）

### 步骤1: 启动开发服务器（新终端）

```bash
pnpm dev
```

等待显示：
```
✓ Ready in 2.3s
- Local: http://localhost:3002
```

---

### 步骤2: 访问测试页面

打开浏览器访问：**http://localhost:3002/xiaohongshu**

---

### 步骤3: 执行4个测试用例

#### 测试1: 正常内容（无敏感词）✅

1. 输入关键词：`数学教学`
2. 点击"开始爬取"
3. 点击任意帖子的"AI分析"
4. 点击"生成草稿"
5. 查看结果

**预期**: 无风险提示，状态为 `draft`

---

#### 测试2: 广告词（自动替换）🔄

在Supabase Studio执行SQL创建测试数据：

**访问**: http://localhost:54323 → SQL Editor

**执行SQL**:
```sql
INSERT INTO xhs_raw_posts (
  user_id,
  post_id,
  title,
  content,
  tags,
  likes,
  comments,
  crawl_keyword,
  ai_analysis
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'test_ad_' || floor(random() * 1000000),
  '数学学习资料分享',
  '大家好！完整资料可以加微信领取，也可以私信我。购买后永久使用！',
  ARRAY['数学', '资料'],
  5000,
  200,
  '数学教学',
  '{"title_strategy": "实用干货", "content_structure": "分步讲解", "engagement_drivers": ["实用性强", "步骤清晰", "免费资源"], "target_audience": "初中生", "emotional_appeal": "学习焦虑", "call_to_action": "关注收藏"}'::jsonb
);
```

回到小红书页面：
1. 刷新页面
2. 找到"数学学习资料分享"帖子
3. 点击"生成草稿"
4. 查看草稿列表

**预期结果**:
- ⚡ 中风险
- 🔄 已自动替换
- 显示替换详情：
  - "加微信" → "留言咨询"
  - "私信" → "评论区交流"
  - "购买" → "了解"

---

#### 测试3: 高风险词（拒绝）⚠️

在SQL Editor执行：

```sql
INSERT INTO xhs_raw_posts (
  user_id,
  post_id,
  title,
  content,
  tags,
  likes,
  comments,
  crawl_keyword,
  ai_analysis
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'test_high_' || floor(random() * 1000000),
  '特殊话题讨论',
  '今天讨论一些政治相关的内容和观点...',
  ARRAY['讨论'],
  3000,
  150,
  '数学教学',
  '{"title_strategy": "测试", "content_structure": "测试", "engagement_drivers": ["测试1", "测试2", "测试3"], "target_audience": "测试", "emotional_appeal": "测试", "call_to_action": "测试"}'::jsonb
);
```

回到小红书页面生成草稿。

**预期结果**:
- ⚠️ 高风险
- status = `rejected`
- 建议：重新生成内容

---

#### 测试4: 低风险词（提示）ℹ️

在SQL Editor执行：

```sql
INSERT INTO xhs_raw_posts (
  user_id,
  post_id,
  title,
  content,
  tags,
  likes,
  comments,
  crawl_keyword,
  ai_analysis
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'test_low_' || floor(random() * 1000000),
  '破解数学难题的方法',
  '今天分享如何破解数学难题的有效方法...',
  ARRAY['数学', '方法'],
  4000,
  180,
  '数学教学',
  '{"title_strategy": "实用技巧", "content_structure": "方法论", "engagement_drivers": ["实用性", "可操作", "效果好"], "target_audience": "中学生", "emotional_appeal": "成就感", "call_to_action": "尝试练习"}'::jsonb
);
```

回到小红书页面生成草稿。

**预期结果**:
- ℹ️ 低风险
- 自动替换：" 破解" → "解锁"
- status = `draft`

---

## 📊 查看测试结果

### 方法1: 前端UI

切换到"草稿列表"标签，查看：
- 风险等级Badge（⚠️/⚡/ℹ️）
- 自动替换标记（🔄）
- 敏感词检测详情面板

### 方法2: 数据库查询

在Supabase Studio → SQL Editor执行：

```sql
SELECT
  id,
  generated_title,
  risk_level,
  auto_replaced,
  status,
  sensitive_words_detected->'matches' as detected_words,
  sensitive_words_detected->'replacements'->'totalReplacements' as total_replaced
FROM xhs_ai_drafts
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 方法3: 控制台日志

打开浏览器开发者工具（F12），查看Console标签：

```
[XHS生成] 敏感词检测: 检测到 3 个敏感词 (风险等级: medium)
[XHS生成] 执行自动替换...
[XHS生成] 自动替换完成，共替换 3 处
```

---

## ✅ 测试检查清单

- [ ] 测试1: 无敏感词 - 通过
- [ ] 测试2: 广告词自动替换 - 通过
- [ ] 测试3: 高风险词拒绝 - 通过
- [ ] 测试4: 低风险词提示 - 通过
- [ ] UI显示正确
- [ ] 数据库字段正确
- [ ] 性能可接受（< 150ms额外耗时）

---

## 📝 性能基准

执行测试2（广告词替换），查看控制台：

```
[XHS生成] 重写完成，耗时 12456ms
[XHS生成] 敏感词检测: 检测到 3 个敏感词 (风险等级: medium)
[XHS生成] 执行自动替换...
[XHS生成] 自动替换完成，共替换 3 处
[XHS生成] 最终状态: draft
```

**性能目标**:
- 敏感词扫描: < 100ms ✅
- 自动替换: < 50ms ✅
- 总额外耗时: < 150ms ✅

---

## 🐛 遇到问题？

### 问题1: 找不到新字段

**解决**:
```bash
npx supabase migration up
```

### 问题2: UI不显示风险Badge

**检查**:
1. 浏览器缓存（Ctrl+Shift+R 强制刷新）
2. 开发服务器是否重启
3. 控制台是否有错误

### 问题3: 自动替换未生效

**检查**:
1. 风险等级（高风险不替换）
2. 词汇是否有替换规则
3. 查看 `src/lib/xiaohongshu/sensitive-word-filter.ts` 的 `WORD_REPLACEMENTS`

---

## 📚 详细文档

查看完整测试指南：
- [docs/testing/xiaohongshu-sensitive-word-test.md](docs/testing/xiaohongshu-sensitive-word-test.md)

查看功能说明：
- [docs/xiaohongshu-sensitive-word-filter.md](docs/xiaohongshu-sensitive-word-filter.md)

---

## 🎯 测试完成后

### 选项A: 继续Phase 2开发

开始实现 P0-2：选择器自动更新机制

### 选项B: 部署到生产

参考部署检查清单：
- [docs/xiaohongshu-deployment-checklist.md](docs/xiaohongshu-deployment-checklist.md)

---

## 📞 需要帮助？

测试中遇到任何问题，请：
1. 查看控制台错误日志
2. 查看Supabase日志
3. 查看常见问题章节
4. 联系开发团队

---

**预计测试时间**: 10-15分钟
**测试难度**: ⭐⭐☆☆☆（简单）
**文档编码**: UTF-8
**最后更新**: 2025-12-10
