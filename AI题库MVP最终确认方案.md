# AI题库MVP最终确认方案

**文档版本**: v1.0 Final
**确认时间**: 2025-01-24
**方案状态**: ✅ 已确认，可开始开发

---

## ✅ 用户确认的关键决策

### 1. 质量与成本平衡
- ✅ **接受MVP阶段OCR准确率80-85%**
- 理由：通过人工审核补充，优先快速验证


### 2. 功能优先级
聚焦核心价值（上传→解析→入库），避免过度设计

### 3. AI模型选择
- ✅ **采纳千问建议：Qwen3-VL-Flash**


---

## 🎯 最终技术方案（极简MVP）

### 架构概览

```
┌─────────────────────────────────────────┐
│  前端（移植到主平台）                    │
│  /tools/ingest                          │
│  - FileUpload（上传界面）               │
│  - TaskStatus（进度展示）               │
│  - QuestionEditor（人工审核）           │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  Server Actions                         │
│  - uploadQuestionFile()                 │
│  - getTaskStatus()                      │
│  - submitQuestions()                    │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  Inngest Worker（Serverless）          │
│  - processPdfUpload()                   │
│    1. 下载文件                          │
│    2. 调用Qwen3-VL-Flash               │
│    3. 保存到parsed_questions           │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  Qwen3-VL-Flash API                    │
│  - 模型：qwen3-vl-flash                │
│  - 成本：¥0.002/题                     │
│  - 准确率：80-85%（MVP可接受）         │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  Supabase（2个核心表）                  │
│  - upload_tasks（任务管理）             │
│  - parsed_questions（解析结果）         │
└─────────────────────────────────────────┘
```

---

## 📋 技术栈清单

### 前端
```yaml
框架: Next.js 14.2.7 (App Router)
语言: TypeScript 5.6.3
UI组件: shadcn/ui + Radix UI
样式: Tailwind CSS 3.4.17
状态管理: Zustand 5.0.8
表单验证: React Hook Form + Zod
图标: Lucide React
```

### 后端
```yaml
API层: Next.js Server Actions
异步任务: Inngest (Serverless)
数据库: Supabase PostgreSQL
存储: Supabase Storage
AI模型: Qwen3-VL-Flash (阿里云DashScope)
```

### 数据库（仅2个表）
```sql
upload_tasks:
  - id, user_id, file_name, file_url
  - status, progress, total_questions
  - trace_id, created_at, updated_at

parsed_questions:
  - id, upload_task_id, type, content
  - options, answer, explanation
  - tags (JSONB), difficulty, confidence_score
  - is_selected, is_submitted
```

---

## 💰 成本分析（最终版）

### 一次性成本
```yaml
开发成本:
  - MVP开发（3周）: ¥0（自己开发）或 ¥16,800（外包）

基础设施:
  - 本地Supabase: ¥0（免费层，<500MB数据库，<2GB文件存储）
  - 本地Supabase Storage: ¥0
  - 本地Inngest: ¥0（免费层，100K步骤/月）
  - Qwen3-VL-Flash: ¥0（按用量付费）

总计: ¥0 - ¥16,800
```

### 月度运营成本
```yaml
固定成本:
  - Supabase（未超免费层）: ¥0
  - 上线后再升级为R2存储（10GB以内）: ¥0
  - Inngest（10万步骤以内）: ¥0
  - CDN流量（50GB）: ¥2.5

变动成本（AI调用）:
  假设每月新增2,500题:
  - Qwen3-VL-Flash: 2,500题 × ¥0.002 = ¥5.0

月度总计: ¥7.5
年度成本: ¥90
```

**对比原方案**：
- Claude方案：¥1,080/月
- 优化后方案：**¥7.5/月**
- **节省：99.3%** 🎉

---

## 🚀 实施计划（3周冲刺）

### Week 1: 核心通路（基础设施）

**Day 1: 数据库设计**
```sql
任务:
  ✅ 创建2个核心表的Migration
  ✅ 设置RLS策略
  ✅ 创建批量入库RPC函数

验收:
  ✅ npx supabase db reset 成功
  ✅ 表结构正确
```

**Day 2: 前端路由**
```typescript
任务:
  ✅ 创建 /tools/ingest 路由
  ✅ 移植FileUpload组件
  ✅ 集成主平台样式

验收:
  ✅ 页面可访问
  ✅ UI符合主平台风格
```

**Day 3-4: 上传功能**
```typescript
任务:
  ✅ 创建uploadQuestionFile() Server Action
  ✅ 上传到Supabase Storage
  ✅ 写入upload_tasks表

验收:
  ✅ 文件成功上传
  ✅ 数据库有记录
```

**Day 5-6: Inngest集成**
```typescript
任务:
  ✅ 安装Inngest
  ✅ 创建processPdfUpload函数（暂时Mock）
  ✅ 触发事件测试

验收:
  ✅ Inngest Dashboard可见任务
  ✅ 事件触发成功
```

**Day 7: 前端轮询**
```typescript
任务:
  ✅ 实现任务状态查询
  ✅ 前端实时更新进度

验收:
  ✅ 状态实时显示
```

---

### Week 2: AI引擎（关键周）

**Day 8-9: Qwen3-VL-Flash集成**
```typescript
任务:
  ✅ 申请阿里云DashScope API Key
  ✅ 创建Qwen3-VL-Flash客户端
  ✅ 实现parseQuestions(imageBase64)函数

验收:
  ✅ 可成功调用API
  ✅ 返回结构化JSON
```

**Day 10-12: Prompt工程（最关键！）**
```typescript
任务:
  ✅ 设计结构化JSON输出Prompt
  ✅ 测试100道真实题目
  ✅ 调整Prompt直到准确率≥80%

验收:
  ✅ 准确率≥80%（100题测试集）
  ✅ JSON格式稳定
  ✅ 置信度合理
```

**Day 13-14: Worker完整实现**
```typescript
任务:
  ✅ 完整实现processPdfUpload:
     1. 下载R2文件
     2. 转Base64
     3. 调用Qwen3-VL-Flash
     4. 解析JSON
     5. 写入parsed_questions
     6. 更新任务状态

验收:
  ✅ 上传文件后自动解析
  ✅ parsed_questions表有数据
  ✅ 任务状态正确
```

---

### Week 3: 入库与测试

**Day 15-17: QuestionEditor**
```typescript
任务:
  ✅ 移植QuestionEditor组件
  ✅ 读取parsed_questions
  ✅ 可编辑所有字段
  ✅ 置信度<0.8时标红提示

验收:
  ✅ UI美观易用
  ✅ 低置信度有视觉提示
```

**Day 18-19: 批量入库**
```typescript
任务:
  ✅ 创建submitQuestions() Server Action
  ✅ 调用batch_submit_questions RPC（事务保护）
  ✅ 前端批量选择和提交

验收:
  ✅ 批量提交成功
  ✅ questions表有数据
  ✅ 主平台题库可见
```

**Day 20-21: E2E测试**
```bash
任务:
  ✅ 完整流程测试：上传→解析→编辑→入库
  ✅ 邀请5位教师内测
  ✅ 收集反馈并优化

验收:
  ✅ 5位教师成功使用
  ✅ 准确率≥80%
  ✅ 无严重Bug
```

---

## 🔧 技术细节

### 1. Qwen3-VL-Flash API调用

```typescript
// lib/ai-question-bank/qwen-flash.ts
interface QwenFlashConfig {
  apiKey: string;
  model: 'qwen3-vl-flash';
  temperature: number;
  maxTokens: number;
}

interface QuestionTag {
  knowledge: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
}

interface ParsedQuestion {
  number: string;
  type: 'choice' | 'fill' | 'essay' | 'proof';
  content: string;
  options?: string[];
  answer: string;
  tags: QuestionTag;
  confidence: number;
  steps?: string[];
}

export async function parseQuestions(imageBase64: string): Promise<ParsedQuestion[]> {
  const apiKey = process.env.QWEN_API_KEY!;
  const apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen3-vl-flash',
      messages: [
        {
          role: 'system',
          content: [{ type: 'text', text: SYSTEM_PROMPT }]
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4096
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 提取JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions || [];
}

// Prompt模板（结构化输出）
const SYSTEM_PROMPT = `你是专业的初中数学题目识别专家。`;

const USER_PROMPT = `请分析图片中的题目，严格按照JSON格式输出：

{
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "已知函数 $y = 2x^2 - 4x + 1$，求顶点坐标？",
      "options": ["A. (1, -1)", "B. (2, 1)", "C. (1, 1)", "D. (2, -1)"],
      "answer": "A",
      "tags": {
        "knowledge": ["二次函数", "顶点坐标"],
        "difficulty": "medium",
        "type": "选择题"
      },
      "confidence": 0.95,
      "steps": ["配方法：$y = 2(x-1)^2 - 1$", "顶点为 $(1, -1)$"]
    }
  ]
}`;
```

### 2. 前端Zod验证

```typescript
// lib/ai-question-bank/schemas.ts
import { z } from 'zod';

export const QuestionTagSchema = z.object({
  knowledge: z.array(z.string()).min(1, '至少需要一个知识点'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.string()
});

export const ParsedQuestionSchema = z.object({
  number: z.string(),
  type: z.enum(['choice', 'fill', 'essay', 'proof']),
  content: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
  tags: QuestionTagSchema,
  confidence: z.number().min(0).max(1),
  steps: z.array(z.string()).optional()
});

export const ParseResultSchema = z.object({
  questions: z.array(ParsedQuestionSchema)
});

// 使用
const result = ParseResultSchema.safeParse(apiResponse);
if (!result.success) {
  console.error('格式错误', result.error.format());
  throw new Error('AI返回格式不正确');
}
```

---

## ✅ MVP验收标准

### 功能完整性
- [ ] 教师可上传PDF/图片（≤20MB）
- [ ] 自动AI解析（≤5分钟）
- [ ] 可人工编辑所有字段
- [ ] 可批量提交入库
- [ ] 主平台题库可查看新题

### 性能指标
- [ ] 解析速度：1页≤30秒
- [ ] 准确率：≥80%（人工复核）
- [ ] 无内存泄漏
- [ ] 并发支持：≥3个任务同时解析

### 成本控制
- [ ] 月度AI成本≤¥10（前期低用量）
- [ ] 总月度成本≤¥20
- [ ] 无异常高额调用

### 用户体验
- [ ] 低置信度题目（<0.8）有明显提示
- [ ] 解析失败有清晰错误信息
- [ ] 进度实时更新
- [ ] UI符合主平台风格

---

## 🎯 后续迭代规划

### V1.1（Week 4-6）- 准确率优化
```yaml
新增功能:
  - 置信度<0.8时，可选调用Mathpix增强OCR
  - 基础成本追踪（添加provider_usage_logs表）

目标:
  - 准确率: 80% → 90%
  - 成本: ¥2/千题 → ¥15/千题
```

### V2.0（3个月后）- 规模化
```yaml
新增功能:
  - 题目去重（bge-m3向量化）
  - 知识图谱可视化（react-flow）
  - 多图支持（question_images表）
  - 配额管理（tenant_quotas表）

目标:
  - 支持>500用户
  - 成本: ¥13/千题（千问目标）
```

---

## 📞 支持与帮助

### 开发过程中如有问题

**参考文档**：
1. [AI题库系统-终极综合优化方案v3.0.md](./AI题库系统-终极综合优化方案v3.0.md) - 战略分析
2. [MVP快速开始指南-3周冲刺版.md](./MVP快速开始指南-3周冲刺版.md) - 详细执行手册

**技术文档**：
- [Qwen3-VL-Flash文档](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl-plus-api)
- [Inngest文档](https://www.inngest.com/docs)
- [Supabase文档](https://supabase.com/docs)
- [Zod文档](https://zod.dev)

---

## ✨ 总结

通过您的明确决策，我们确定了一个**极简、高效、低成本**的MVP方案：

✅ **成本极低**：月度¥7.5（节省99.3%）
✅ **开发极快**：3周上线
✅ **技术债极小**：仅2个表，可持续迭代
✅ **风险可控**：准确率80%+人工审核

**下一步**：开始Day 0准备工作（环境配置、API Key申请）

---

**文档状态**: ✅ 已确认
**可开始开发**: 是
**最后更新**: 2025-01-24
