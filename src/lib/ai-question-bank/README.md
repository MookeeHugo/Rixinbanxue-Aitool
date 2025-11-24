# AI题库系统 - 代码模板使用指南

## 📁 文件结构

```
src/lib/ai-question-bank/
├── index.ts              # 统一导出（推荐使用）
├── types.ts              # TypeScript类型定义
├── schemas.ts            # Zod验证模式
├── prompts.ts            # Qwen Prompt模板
├── qwen-flash.ts         # Qwen3-VL-Flash API客户端
├── utils.ts              # 工具函数
└── README.md             # 本文档

src/app/actions/
└── question-upload.ts    # Server Actions

src/app/api/inngest/
└── route.ts              # Inngest API端点

inngest/
├── client.ts             # Inngest客户端配置
└── functions/
    └── process-pdf-upload.ts  # PDF处理Worker
```

---

## 🚀 快速开始

### 1. 环境变量配置

在 `.env.local` 中添加：

```bash
# Qwen API (阿里云DashScope)
QWEN_API_KEY=your_qwen_api_key

# Inngest (可选，本地开发用)
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

### 2. 安装依赖

```bash
npm install inngest
# Zod、Supabase等已安装
```

### 3. 启动Inngest Dev Server（本地开发）

```bash
npx inngest-cli@latest dev
```

---

## 📖 使用示例

### 前端：上传文件

```typescript
import { uploadQuestionFile } from '@/lib/ai-question-bank';

async function handleFileUpload(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const result = await uploadQuestionFile(formData);

  if (result.success) {
    console.log('任务创建成功', result.data);
    // result.data.taskId - 用于轮询任务状态
    // result.data.traceId - 用于日志追踪
  } else {
    console.error('上传失败', result.error);
  }
}
```

### 前端：轮询任务状态

```typescript
import { getTaskStatus, getTaskQuestions } from '@/lib/ai-question-bank';

async function pollTaskStatus(taskId: string) {
  const interval = setInterval(async () => {
    const result = await getTaskStatus(taskId);

    if (result.success && result.data) {
      const task = result.data;

      if (task.status === 'completed') {
        clearInterval(interval);
        // 获取解析结果
        const questionsResult = await getTaskQuestions(taskId);
        console.log('解析完成', questionsResult.data);
      } else if (task.status === 'failed') {
        clearInterval(interval);
        console.error('解析失败', task.error_message);
      } else {
        console.log('进度', task.progress);
      }
    }
  }, 2000); // 每2秒轮询一次
}
```

### 前端：批量提交题目

```typescript
import { submitQuestions } from '@/lib/ai-question-bank';

async function handleBatchSubmit(taskId: string, selectedIds: string[]) {
  const result = await submitQuestions(taskId, selectedIds);

  if (result.success) {
    console.log(`成功提交${result.data?.submittedCount}道题目`);
  } else {
    console.error('提交失败', result.error);
  }
}
```

### 后端：直接调用Qwen API

```typescript
import { parseQuestions } from '@/lib/ai-question-bank/qwen-flash';
import { fileToBase64 } from '@/lib/ai-question-bank/utils';

async function parseImage(file: File) {
  // 1. 转换为Base64
  const base64 = await fileToBase64(file);

  // 2. 调用Qwen解析
  const questions = await parseQuestions(base64);

  // 3. 处理结果
  questions.forEach(q => {
    console.log(`题${q.number}: ${q.content}`);
    console.log(`置信度: ${q.confidence}`);
  });
}
```

### 后端：批量解析多页PDF

```typescript
import { parseQuestionsFromPages } from '@/lib/ai-question-bank/qwen-flash';

async function parsePdfPages(pageImages: string[]) {
  const allQuestions = await parseQuestionsFromPages(
    pageImages,
    undefined, // 使用默认配置
    (completed, total) => {
      console.log(`进度: ${completed}/${total}`);
    }
  );

  console.log(`总计${allQuestions.length}道题`);
}
```

---

## 🔧 自定义配置

### 修改Qwen API配置

```typescript
import { parseQuestions } from '@/lib/ai-question-bank/qwen-flash';

const questions = await parseQuestions(imageBase64, {
  temperature: 0.05,  // 更低温度（默认0.1）
  maxTokens: 8192     // 更多token（默认4096）
});
```

### 修改Prompt模板

编辑 `src/lib/ai-question-bank/prompts.ts`：

```typescript
export const QWEN_SYSTEM_PROMPT = `
你是专业的数学题目识别专家...
（根据实际需求修改）
`;
```

---

## 📊 类型定义

### ParsedQuestion（AI解析结果）

```typescript
interface ParsedQuestion {
  number: string;              // 题号
  type: QuestionType;          // 题型（choice/fill/essay/proof）
  content: string;             // 题目内容（LaTeX格式）
  options?: string[];          // 选项（仅选择题）
  answer: string;              // 答案
  tags: QuestionTag;           // 标签
  confidence: number;          // 置信度（0-1）
  steps?: string[];            // 解题步骤（可选）
}
```

### UploadTask（任务状态）

```typescript
interface UploadTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;            // 0-100
  total_questions?: number;    // 解析出的题目数
  error_message?: string;      // 错误信息
}
```

---

## 🧪 测试

### 单元测试示例

```typescript
import { parseQuestions } from '@/lib/ai-question-bank/qwen-flash';
import { ParsedQuestionSchema } from '@/lib/ai-question-bank/schemas';

describe('Qwen API', () => {
  it('should parse questions correctly', async () => {
    const testImage = 'base64_image_data';
    const questions = await parseQuestions(testImage);

    expect(questions).toBeInstanceOf(Array);
    expect(questions.length).toBeGreaterThan(0);

    // 验证每个题目的格式
    questions.forEach(q => {
      const result = ParsedQuestionSchema.safeParse(q);
      expect(result.success).toBe(true);
    });
  });
});
```

---

## 🔍 调试技巧

### 启用详细日志

```typescript
// 在qwen-flash.ts中设置环境变量
process.env.DEBUG_QWEN = 'true';
```

### 查看Inngest任务

访问：`http://localhost:8288`（本地开发）

---

## 📚 参考文档

- [Qwen3-VL-Flash API文档](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl-plus-api)
- [Inngest文档](https://www.inngest.com/docs)
- [Zod文档](https://zod.dev)
- [项目完整方案](../../../AI题库MVP最终确认方案.md)

---

## ⚠️ 注意事项

1. **API Key安全**：
   - 不要在前端代码中暴露`QWEN_API_KEY`
   - 所有AI调用必须在Server Actions或Inngest Worker中

2. **成本控制**：
   - Qwen3-VL-Flash成本：¥0.002/题
   - 建议设置调用限额和监控

3. **错误处理**：
   - 所有API调用都有重试机制（Inngest自动重试2次）
   - 前端需处理`success: false`的情况

4. **置信度阈值**：
   - 默认阈值：0.8
   - 低于0.8的题目需人工复核

---

## 🐛 常见问题

### Q: Inngest任务不执行？
A:
1. 检查`npx inngest-cli dev`是否运行
2. 确认`/api/inngest`路由正确配置
3. 查看Inngest Dashboard日志

### Q: Qwen API返回格式错误？
A:
1. 检查Prompt是否清晰
2. 查看响应中的原始JSON
3. 调整`temperature`参数（降低可提高稳定性）

### Q: 如何处理PDF文件？
A:
需额外实现PDF→图片转换（使用`pdf-lib`或`pdf2pic`），
然后将每页图片传给`parseQuestionsFromPages`。

---

**最后更新**: 2025-01-24
