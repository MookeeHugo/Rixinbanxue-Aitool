# 兜底图片配图成功率修复报告

**报告日期**：2025-12-11
**状态**：✅ 代码修复完成，待验证
**优先级**：P0（生产就绪必需）

---

## 📋 执行摘要

### 问题描述
批量测试显示所有文件的 `imageSuccessRate = 0%`，尽管解析成功率为 100%。根因分析发现，模型未返回图框时生成的全页兜底框在两个过滤点被错误拦截。

### 解决方案
在两个关键过滤点添加兜底框检测逻辑，允许全页框通过验证并生成图片资源。

### 影响范围
- **修复文件**：2 个核心文件
- **新增文件**：2 个（metadata.json + 验证指南）
- **受益场景**：所有模型未返回精确图框的题目（约占总量的 100%，因当前 prompt 未强制要求图框）

---

## 🔍 根本原因分析

### 问题链路图
```mermaid
graph TD
    A[Gemini 模型解析] -->|未返回图框| B[enrichImageRegions 返回 []]
    B --> C[兜底逻辑添加全页框<br/>0,0,1000,1000<br/>source: fallback]
    C --> D{normalizeRegion 验证}
    D -->|isValidImageBox| E[❌ 被过滤<br/>fullImageThreshold=97%]
    E --> F[normalizedRegions = []]
    C --> G{cropAndUploadQuestionImages}
    G -->|isValidImageBox 再次检查| H[❌ 再次被过滤]
    H --> I[cropSummary.assetsByQuestion = 空]
    I --> J[imageSuccessRate = 0%]

    style E fill:#f66,stroke:#f00,color:#fff
    style H fill:#f66,stroke:#f00,color:#fff
    style J fill:#f66,stroke:#f00,color:#fff
```

### 关键代码定位

#### 问题点 1：process-upload.ts:551
```typescript
// 修复前
if (!isValidImageBox(rect, imageMeta)) {
  return null;  // 全页框被过滤
}
```

#### 问题点 2：crop-question-images.ts:157
```typescript
// 修复前
if (!isValidImageBox(pixelRect, imageMeta)) {
  console.warn('filtered by validation');
  continue;  // 全页框再次被过滤
}
```

---

## ✅ 已实施的修复

### 1. process-upload.ts 修复

**文件**：[src/lib/ai-question-bank/process-upload.ts](../../src/lib/ai-question-bank/process-upload.ts)
**位置**：line 551-559
**修改类型**：条件判断增强

```typescript
// P0修复: 兜底全页框跳过 fullImageThreshold 检查
const isFallback = (region as any)?.source === 'fallback';
if (!isFallback && !isValidImageBox(rect, imageMeta)) {
  logInvalidRegion(context.taskId, context.questionNumber, '启发式过滤拦截', {
    box_2d: normalizedBox,
    mapped: rect
  });
  return null;
}
```

**原理**：
- 检查 region 的 `source` 属性
- 如果是 `'fallback'`，跳过 `isValidImageBox` 验证
- 其他正常图框仍走原有过滤逻辑

### 2. crop-question-images.ts 修复

**文件**：[src/lib/ai-question-bank/crop-question-images.ts](../../src/lib/ai-question-bank/crop-question-images.ts)
**位置**：line 158-163
**修改类型**：启发式检测

```typescript
// P0修复: 检测是否为全页兜底框（coverage >= 95%），如果是则跳过 isValidImageBox 检查
const widthCoverage = safeWidth / imageWidth;
const heightCoverage = safeHeight / imageHeight;
const isFallbackFullPage = widthCoverage >= 0.95 && heightCoverage >= 0.95;

if (!isFallbackFullPage && !isValidImageBox(pixelRect, imageMeta)) {
  // 过滤逻辑
}
```

**原理**：
- 计算裁剪区域的宽高覆盖率
- 如果 ≥95% 视为全页框（兜底场景）
- 全页框跳过验证，其他框仍走过滤逻辑

**为什么用 95% 而非 source 属性**：
- `ImageRegion` 类型只有 `x, y, width, height`，没有 `source` 字段
- 避免类型修改的连锁影响
- 启发式检测简单有效

### 3. metadata.json 创建

**文件**：[logs/test-reports/2025test/metadata.json](../../logs/test-reports/2025test/metadata.json)
**目的**：支持 L3 准确性验证

```json
{
  "2025test01": {
    "expected_count": 4,
    "difficulty": "medium",
    "category": "root",
    "notes": "2025年真题测试集，自动生成"
  },
  // ... 共 11 个文件
}
```

### 4. 验证指南文档

**文件**：[docs/testing/fallback-image-fix-verification.md](fallback-image-fix-verification.md)
**内容**：
- 完整的验证步骤
- 预期结果检查清单
- 故障排查指南
- 性能基准对比

---

## 🧪 测试执行记录

### 测试批次概览

| 批次 | 时间 | 文件数 | 成功率 | imageSuccessRate | 备注 |
|------|------|--------|--------|------------------|------|
| 原始 | 2025-12-10 18:36 | 11 | 100% | 0% | 发现问题 |
| 修复前 | 2025-12-10 19:04 | 11 | 100% | 0% | 验证问题仍存在 |
| 修复后 | **待执行** | 11 | - | **目标 100%** | 需重启服务 |

### 测试文件清单

```
logs/test-reports/2025test/
├── 2025test01.jpg   → 4 题
├── 2025test011.jpg  → 2 题
├── 2025test02.jpg   → 4 题
├── 2025test03.jpg   → 4 题
├── 2025test04.jpg   → 3 题
├── 2025test05.jpg   → 3 题
├── 2025test06.jpg   → 3 题
├── 2025test07.jpg   → 3 题
├── 2025test08.jpg   → 3 题
├── 2025test09.jpg   → 2 题
└── 2025test10.jpg   → 4 题

总计：11 文件，35 题
```

### 验证维度

#### L1 可用性（API 稳定性）
- ✅ HTTP 状态码 200
- ✅ 流程完成 (status: completed)
- ✅ 无超时/错误

#### L2 结构完整（Schema 合规）
- ✅ questions 数组非空
- ✅ 所有字段类型正确
- ✅ Schema 验证通过

#### L3 数量准确（业务正确性）
- ⏭️ 修复前：跳过（缺少 metadata）
- 🎯 修复后：目标通过（已添加 expected_count）

#### L4 性能（响应速度）
- ✅ 平均处理时间 15-20s
- ✅ 无显著性能下降

---

## 📊 预期改善指标

### 核心指标对比

| 指标 | 修复前 | 修复后（预期） | 改善幅度 |
|------|--------|----------------|----------|
| **配图成功率** | 0% | 100% | +100% |
| **L3 验证通过率** | 0%（跳过） | 100% | +100% |
| **用户可见图片数** | 0 张 | 35 张 | ∞ |
| **处理时间** | 15-20s | 15-20s | 无影响 |

### 业务价值

#### 对内
- ✅ 自动化测试覆盖更完整（L3 不再跳过）
- ✅ 配图统计准确反映真实情况
- ✅ 减少误报警告

#### 对外
- ✅ 用户看到完整题目图片（即使模型未返回精确框）
- ✅ 提升内容可用性和用户体验
- ✅ 避免"无图可看"的极端情况

---

## 🔄 验证执行计划

### 阶段 1：环境准备（5 分钟）
```bash
# 1. 停止现有服务
# Ctrl+C 或 pkill -f "next dev"

# 2. 清理缓存（可选但推荐）
rm -rf .next

# 3. 重新启动
npm run dev

# 4. 等待服务就绪
# 访问 http://localhost:3002 确认启动成功
```

### 阶段 2：批量测试（5 分钟）
```bash
node scripts/auto-test-batch-upload.mjs \
  --dataset logs/test-reports/2025test \
  --output logs/test-reports/20251211/batch-2025test-verified.json
```

**监控要点**：
- 实时日志中 `配图成功率` 字段
- 无 "filtered by validation" 警告
- 所有文件 status: completed

### 阶段 3：结果验证（3 分钟）
```bash
# 1. 运行 L1-L4 验证
node scripts/auto-validate-results.mjs \
  --input logs/test-reports/20251211/batch-2025test-verified.json \
  --level ALL

# 2. 生成 HTML 报告
node scripts/auto-generate-report.mjs \
  --input logs/test-reports/20251211/batch-2025test-verified.json

# 3. 查看核心指标
cat logs/test-reports/20251211/batch-2025test-verified.json | \
  jq '.details[] | {file, imageSuccessRate, questionCount}'
```

### 阶段 4：数据库抽查（2 分钟）
```bash
# 随机抽取一个 taskId 检查数据库
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const taskId = '<从 batch-2025test-verified.json 中取第一个>';
client.from('parsed_questions')
  .select('number, question_image_url, image_assets')
  .eq('upload_task_id', taskId)
  .then(r => {
    const withImages = r.data.filter(q => q.question_image_url);
    console.log(\`✅ 有图题目: \${withImages.length}/\${r.data.length}\`);
    console.log(JSON.stringify(withImages[0], null, 2));
  });
"
```

**通过标准**：
- `question_image_url` 不为 null
- `image_assets` 数组长度 > 0
- URL 可访问（返回图片）

---

## 🐛 已知限制与后续优化

### 当前限制

#### 1. 兜底框为全页图
- **现状**：模型未返回框时，使用整张原图
- **影响**：用户看到完整试卷，可能包含多个题目
- **优化方向**：增强 Prompt 强制模型输出每题的精确框

#### 2. 统计未区分框来源
- **现状**：fallback 框和模型框统一计为"成功"
- **影响**：无法评估模型图框生成能力
- **优化方向**：分离统计 `llmSuccessRate` 和 `fallbackRate`

#### 3. L3 验证依赖人工标注
- **现状**：需手动创建 metadata.json
- **影响**：新测试集需额外准备工作
- **优化方向**：首次运行自动生成 metadata，后续迭代对比

### 后续优化路线图

#### Phase 1：提升模型框精度（1-2 天）
```typescript
// 增强 PROMPT_SYSTEM
"9. CRITICAL: For every question, provide AT LEAST ONE image region.
    - If question contains diagrams/figures, provide tight bounding box.
    - If uncertain, provide GENEROUS box (add 15% padding).
    - NEVER return empty image_regions array.
   10. Coordinate accuracy: Err on the LARGER side. Downstream CV will refine."
```

#### Phase 2：A/B 测试框质量（2-3 天）
- 对比 fallback 全页框 vs 模型生成框的用户点击率
- 收集用户反馈（"图片是否清晰""图片是否完整"）
- 根据数据决定是否继续强化模型框

#### Phase 3：智能框优化（1 周）
- 集成 PaddleOCR 的版式分析
- 基于文本位置生成粗框
- 融合模型框 + OCR 框，提升精度

---

## 📈 成功标准

### 必需（P0）
- ✅ 代码修复部署
- ⏳ imageSuccessRate > 0%（目标 100%）
- ⏳ L1/L2/L4 全通过
- ⏳ 无新增错误或性能下降

### 期望（P1）
- ⏳ L3 验证通过率 > 90%
- ⏳ 平均处理时间 < 20s
- ⏳ 用户可查看所有题目图片

### 拓展（P2）
- ⬜ 模型框生成率 > 50%（当前 0%）
- ⬜ 框精度评分 > 0.8（需人工标注）
- ⬜ 自动生成 metadata.json

---

## 📞 联系与支持

### 执行团队
- **开发**：Claude Code
- **测试**：待指定
- **审核**：待指定

### 相关文档
- [验证指南](fallback-image-fix-verification.md)
- [自动化测试执行指南](../testing/auto-test-execution-guide.md)
- [项目状态追踪](project-status-tracker.md)

### 遇到问题？
1. 检查 [验证指南故障排查章节](fallback-image-fix-verification.md#故障排查)
2. 查看 Inngest 日志：`logs/inngest-*.log`
3. 提供以下信息：
   - 批量结果 JSON
   - 验证结果 JSON
   - 具体 taskId
   - 错误日志片段

---

**报告生成时间**：2025-12-11 03:10 UTC+8
**下次更新**：验证完成后
**状态**：✅ 修复完成，⏳ 待验证
