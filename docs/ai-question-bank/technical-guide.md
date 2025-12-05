# AI 题库模块技术手册（Gemini / Qwen）

> 本文整合了 `src/lib/ai-question-bank/README.md` 的实现细节，说明上传解析链路、环境变量、目录结构与常见问题，默认使用 Gemini Vision V3，保留 Qwen 兼容模式。

## 1. 架构概览

- **默认模型**：Gemini Vision V3（`@google/generative-ai` Streaming SDK）。
- **兼容模式**：Qwen3-VL-Flash 仍保留，便于回归测试或代理切换。
- **处理流程**：
  1. 前端上传题目图片/PDF → `/api/export-tasks/create`。
  2. Inngest Worker 拉起 `process-pdf-upload`，按页调用 Gemini/Qwen 解析。
  3. 解析结果写入 Supabase 表，前端通过 taskId 轮询。
  4. 题篮/导出任务统一走 `/api/export-tasks/status`。

## 2. 环境变量

在 `.env.local` 补齐：

```env
# Gemini
GEMINI_API_KEY=xxxx
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.5-flash
GEMINI_REQUEST_TIMEOUT=60000

# Qwen 代理（可选，用于兼容模式）
QWEN_API_KEY=xxxx

# Inngest（本地调试可留空）
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local-signing
```

## 3. 目录结构

```
src/lib/ai-question-bank/
├─ index.ts                  # 对外统一导出
├─ types.ts                  # TypeScript 类型
├─ schemas.ts                # Zod 校验
├─ prompts.ts                # Prompt 模板（Qwen）
├─ gemini-vision-client.ts   # Gemini 主实现
├─ qwen-flash.ts             # Qwen 兼容客户端
├─ utils.ts                  # 工具方法
└─ README（已迁移至本文）

src/app/actions/question-upload.ts     # Server Actions
src/app/api/inngest/route.ts           # Inngest API 入口
inngest/functions/process-pdf-upload.ts
```

## 4. 快速启动

1. **配置环境变量**（见上文）。
2. **安装依赖**：`npm install @google/generative-ai inngest sharp zod`.
3. **启动 Inngest Dev Server**：`npx inngest-cli@latest dev`。
4. **运行 Next.js Dev Server**：`npm run dev`。

## 5. 前端使用示例

### 5.1 上传文件

```ts
import { uploadQuestionFile } from '@/lib/ai-question-bank'

async function handleUpload(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const result = await uploadQuestionFile(formData)

  if (result.success) {
    console.log('任务已创建', result.data?.taskId)
  } else {
    console.error(result.error)
  }
}
```

### 5.2 轮询任务

```ts
import { getTaskStatus, getTaskQuestions } from '@/lib/ai-question-bank'

async function pollTask(taskId: string) {
  const timer = setInterval(async () => {
    const result = await getTaskStatus(taskId)
    if (!result.success || !result.data) return

    if (result.data.status === 'completed') {
      clearInterval(timer)
      const questions = await getTaskQuestions(taskId)
      console.log('解析完成', questions.data)
    }
    if (result.data.status === 'failed') {
      clearInterval(timer)
      console.error(result.data.error_message)
    }
  }, 2000)
}
```

### 5.3 批量提交

```ts
import { submitQuestions } from '@/lib/ai-question-bank'

async function submitSelected(taskId: string, ids: string[]) {
  const result = await submitQuestions(taskId, ids)
  if (result.success) {
    console.log(`成功提交 ${result.data?.submittedCount} 道题目`)
  } else {
    console.error(result.error)
  }
}
```

## 6. 后端/脚本示例

### 6.1 直接调用 Qwen

```ts
import { parseQuestions } from '@/lib/ai-question-bank/qwen-flash'
import { fileToBase64 } from '@/lib/ai-question-bank/utils'

async function parseImage(file: File) {
  const base64 = await fileToBase64(file)
  const questions = await parseQuestions(base64)
  questions.forEach((q) => {
    console.log(q.number, q.content, q.confidence)
  })
}
```

### 6.2 解析多页 PDF

```ts
import { parseQuestionsFromPages } from '@/lib/ai-question-bank/qwen-flash'

async function parsePdfImages(images: string[]) {
  const all = await parseQuestionsFromPages(images, undefined, (done, total) => {
    console.log(`进度 ${done}/${total}`)
  })
  console.log(`共解析 ${all.length} 道题`)
}
```

## 7. 自定义配置

- **参数调整**：

```ts
await parseQuestions(base64, {
  temperature: 0.05,
  maxTokens: 8192,
})
```

- **Prompt**：修改 `src/lib/ai-question-bank/prompts.ts` 中的 `QWEN_SYSTEM_PROMPT`。

- **图片预处理**：`gemini-vision-client` 默认对 `box_2d` 添加 `max(20px, 2%)` padding，并用 `sharp.trim()` 去掉多余边缘。

## 8. TypeScript 类型

```ts
interface ParsedQuestion {
  number: string
  type: 'choice' | 'fill' | 'essay' | 'proof'
  content: string
  options?: string[]
  answer: string
  tags: string[]
  confidence: number
  steps?: string[]
}

interface UploadTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total_questions?: number
  error_message?: string
}
```

## 9. 测试与调试

- 单元测试示例（`packages/test`）：

```ts
import { parseQuestions } from '@/lib/ai-question-bank/qwen-flash'
import { ParsedQuestionSchema } from '@/lib/ai-question-bank/schemas'

it('Qwen 解析', async () => {
  const questions = await parseQuestions('base64_data')
  expect(questions.length).toBeGreaterThan(0)
  questions.forEach((q) => {
    expect(ParsedQuestionSchema.safeParse(q).success).toBe(true)
  })
})
```

- 开启详细日志：`process.env.DEBUG_QWEN = 'true'`。
- 查看 Inngest 控制台：`http://localhost:8288`。

## 10. 常见问题

| 问题 | 处理方式 |
| --- | --- |
| Inngest 任务未执行 | 检查 `npx inngest-cli dev` 是否启动，确认 `/api/inngest` 可访问。 |
| Gemini 请求超时 | 调整 `GEMINI_REQUEST_TIMEOUT` 或压缩图片体积。 |
| JSON 字段缺失 | 通常是模型返回了易混文本，建议重试或降低温度。 |
| Qwen 兼容模式失败 | 确保 `QWEN_API_KEY`、代理地址正确，并重新加载 prompt。 |
| PDF 解析 | 需先将 PDF 转为图片（例如 `pdf-lib` + `sharp`），再传入 `parseQuestionsFromPages`。 |

## 11. 费用与阈值建议

- Gemini Flash：按调用计费，建议在 Server 端设置速率限制和熔断。
- Qwen：`$0.002/题` 左右，建议结合 `confidence` ≥ 0.8 自动入库，低于阈值由人工审核。
- Inngest/Upload Task：所有 API 返回 `success: false` 时都应处理重试和兜底文案。

---

**维护人**：AI 题库小组  
**最后更新**：2025-12-04
