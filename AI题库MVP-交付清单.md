# AI题库MVP - 交付清单

> **交付日期**: 2025-01-24
> **方案状态**: ✅ 已确认，可开始开发
> **预计开发周期**: 3周（21天）

---

## 📦 本次交付内容

### 1. 方案文档（已确认）

| 文档名称 | 路径 | 说明 |
|---------|------|------|
| **最终确认方案** | [AI题库MVP最终确认方案.md](./AI题库MVP最终确认方案.md) | ✅ 用户确认的完整方案，包含技术栈、成本、时间线 |
| **3周冲刺指南** | [MVP快速开始指南-3周冲刺版.md](./MVP快速开始指南-3周冲刺版.md) | Day-by-day执行手册（21天详细计划） |
| **综合优化方案** | [AI题库系统-终极综合优化方案v3.0.md](./AI题库系统-终极综合优化方案v3.0.md) | 战略分析和技术选型对比 |
| **Day 0准备清单** | [AI题库MVP-Day0准备清单.md](./AI题库MVP-Day0准备清单.md) | 🆕 开发前准备工作（环境、账号、测试数据） |

---

### 2. 核心代码模板（可直接使用）

#### 后端核心库 (`src/lib/ai-question-bank/`)

| 文件名 | 功能 | 状态 |
|--------|------|------|
| `index.ts` | 统一导出，一站式导入所有API | ✅ |
| `types.ts` | TypeScript类型定义（含Qwen输出格式） | ✅ |
| `schemas.ts` | Zod验证模式（运行时类型检查） | ✅ |
| `prompts.ts` | Qwen Prompt工程模板（结构化输出） | ✅ |
| `qwen-flash.ts` | Qwen3-VL-Flash API客户端 | ✅ |
| `utils.ts` | 工具函数（Base64转换、重试、格式化等） | ✅ |
| `README.md` | 使用指南和示例代码 | ✅ |

**核心功能**：
```typescript
import { parseQuestions, uploadQuestionFile } from '@/lib/ai-question-bank';

// 前端：上传文件
const result = await uploadQuestionFile(formData);

// 后端：直接调用Qwen
const questions = await parseQuestions(imageBase64);
```

---

#### Server Actions (`src/app/actions/`)

| 文件名 | 导出函数 | 说明 |
|--------|----------|------|
| `question-upload.ts` | `uploadQuestionFile()` | 上传文件到R2，创建任务 |
| | `getTaskStatus()` | 查询任务状态（轮询用） |
| | `getTaskQuestions()` | 获取解析结果 |
| | `submitQuestions()` | 批量提交到题库 |
| | `updateQuestion()` | 人工编辑题目 |
| | `deleteQuestion()` | 删除题目 |

**调用方式**：
```typescript
'use client';
import { uploadQuestionFile } from '@/app/actions/question-upload';

const result = await uploadQuestionFile(formData);
if (result.success) {
  console.log('任务ID:', result.data.taskId);
}
```

---

#### Inngest Worker (`inngest/`)

| 文件路径 | 功能 | 触发事件 |
|---------|------|---------|
| `client.ts` | Inngest客户端配置 | - |
| `functions/process-pdf-upload.ts` | PDF解析Worker | `question/upload.started` |

**Worker流程**：
1. 下载R2文件
2. 转Base64
3. 调用Qwen3-VL-Flash
4. 解析JSON并验证
5. 写入`parsed_questions`表
6. 更新任务状态

**本地调试**：
```bash
npx inngest-cli dev  # 启动Dev Server
```

---

#### API路由 (`src/app/api/`)

| 路径 | 功能 | 说明 |
|-----|------|------|
| `/api/inngest` | Inngest Webhook端点 | 接收Inngest事件，执行Worker |

**验证**：
```bash
curl http://localhost:3000/api/inngest
# 应返回Inngest配置元数据
```

---

### 3. 数据库Schema

#### Migration文件

| 文件名 | 说明 | 状态 |
|--------|------|------|
| `20241124000001_ai_question_bank_mvp_v2.sql` | MVP v2数据库Schema | ✅ 已创建 |

#### 表结构（2个核心表）

**upload_tasks（任务管理）**
```sql
- id, user_id, file_name, file_url
- status (pending/processing/completed/failed)
- progress (0-100), total_questions
- trace_id (追踪), error_message
- created_at, updated_at
```

**parsed_questions（解析结果）**
```sql
- id, upload_task_id
- type (choice/fill/essay/proof), content, options, answer
- tags (JSONB: {knowledge, difficulty, type})
- confidence_score (0-1)
- is_selected (是否选中), is_submitted (是否已提交)
- created_at
```

#### RPC函数

- `batch_submit_questions(task_id, question_ids[], user_id)` - 批量提交（事务保护）
- `get_task_summary(task_id)` - 任务统计摘要

**应用Migration**：
```bash
npx supabase db reset
```

---

## 🎯 技术架构概览

```
前端（Next.js 14）
   ↓ Server Actions
后端层（uploadQuestionFile）
   ↓ 触发事件
Inngest Worker（processPdfUpload）
   ↓ 调用AI
Qwen3-VL-Flash API
   ↓ 返回JSON
Supabase（parsed_questions表）
   ↓ 前端轮询
前端展示 → 人工审核 → 批量提交
```

---

## 📊 成本对比（最终确认）

| 方案 | 月度成本 | 节省比例 |
|------|---------|---------|
| 原Claude方案 | ¥1,080 | - |
| **优化后MVP** | **¥7.5** | **99.3%** ⬇️ |

**成本构成**（每月新增2,500题）：
- CDN流量（50GB）: ¥2.5
- Qwen3-VL-Flash（2,500题 × ¥0.002）: ¥5.0
- Supabase/R2/Inngest: ¥0（免费层）

---

## ✅ 验收标准

### MVP完成标志

- [ ] 教师可上传PDF/图片（≤20MB）
- [ ] 自动AI解析（≤5分钟）
- [ ] 可人工编辑所有字段
- [ ] 可批量提交入库
- [ ] 主平台题库可查看新题

### 性能指标

- [ ] 解析速度：1页≤30秒
- [ ] 准确率：≥80%（人工复核）
- [ ] 并发支持：≥3个任务同时解析

### 用户体验

- [ ] 低置信度题目（<0.8）有明显提示
- [ ] 解析失败有清晰错误信息
- [ ] 进度实时更新
- [ ] UI符合主平台风格

---

## 🚀 下一步行动

### 立即开始（现在）

1. **阅读Day 0清单**：[AI题库MVP-Day0准备清单.md](./AI题库MVP-Day0准备清单.md)
2. **申请Qwen API Key**：注册阿里云DashScope
3. **注册Inngest账号**：获取Event Key
4. **配置环境变量**：在`.env.local`中添加`QWEN_API_KEY`
5. **安装依赖**：`npm install inngest`
6. **应用Migration**：`npx supabase db reset`
7. **启动开发环境**：
   ```bash
   npm run dev          # 终端1
   npx inngest-cli dev  # 终端2
   ```

### Day 1开始开发（完成Day 0后）

参考：[MVP快速开始指南-3周冲刺版.md](./MVP快速开始指南-3周冲刺版.md) 的Day 1-7部分

---

## 📞 技术支持

### 参考文档

- [Qwen3-VL-Flash API文档](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl-plus-api)
- [Inngest文档](https://www.inngest.com/docs)
- [Zod文档](https://zod.dev)

### 代码示例

所有模板文件中都包含详细的使用示例和注释，特别是：
- `src/lib/ai-question-bank/README.md` - 完整使用指南
- `src/lib/ai-question-bank/qwen-flash.ts` - API调用示例

---

## 📁 文件清单（本次创建）

### 文档类（4个）
1. ✅ `AI题库MVP最终确认方案.md`
2. ✅ `AI题库MVP-Day0准备清单.md`
3. ✅ `AI题库MVP-交付清单.md`（本文档）
4. ✅ `src/lib/ai-question-bank/README.md`

### 代码类（13个）
5. ✅ `src/lib/ai-question-bank/index.ts`
6. ✅ `src/lib/ai-question-bank/types.ts`
7. ✅ `src/lib/ai-question-bank/schemas.ts`
8. ✅ `src/lib/ai-question-bank/prompts.ts`
9. ✅ `src/lib/ai-question-bank/qwen-flash.ts`
10. ✅ `src/lib/ai-question-bank/utils.ts`
11. ✅ `src/app/actions/question-upload.ts`
12. ✅ `src/app/api/inngest/route.ts`
13. ✅ `inngest/client.ts`
14. ✅ `inngest/functions/process-pdf-upload.ts`

### 数据库类（1个）
15. ✅ `supabase/migrations/20241124000001_ai_question_bank_mvp_v2.sql`

**总计**: 15个文件

---

## 🎉 总结

本次交付包含：
- ✅ 完整的技术方案（用户已确认）
- ✅ 生产级代码模板（可直接使用）
- ✅ 数据库Schema（2表结构）
- ✅ 详细的开发指南（21天计划）
- ✅ Day 0准备清单（环境配置）

**成本优化**：从¥1,080/月降至¥7.5/月（节省99.3%）

**开发周期**：3周（21个工作日）

**下一步**：完成Day 0准备工作，开始Day 1开发 🚀

---

**最后更新**: 2025-01-24
**方案状态**: ✅ 已确认，可开始开发
