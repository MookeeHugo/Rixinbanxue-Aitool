# AI智能题库系统 - 分阶段实施路线图与行动计划

**文档版本**: v1.0
**创建时间**: 2025-11-21
**预计总工期**: 8-10 周
**团队配置**: 全栈工程师 × 1-2,AI工程师 × 0.5(兼职)

---

## 执行摘要

### 核心里程碑

```
Week 1-2  │ 阶段1: 基础设施 (数据库 + BFF)
          │ ✅ Supabase Migration
          │ ✅ BFF API 骨架
          │ ✅ 前端版本统一
          └─────────────────────────────────────
Week 3-6  │ 阶段2: 解析引擎 (OCR/AI)
          │ ✅ Provider Factory
          │ ✅ Worker 实现
          │ ✅ 成本优化
          └─────────────────────────────────────
Week 7-8  │ 阶段3: 人工校对 (QuestionEditor)
          │ ✅ 标注界面完善
          │ ✅ 批量入库
          │ ✅ 主平台联调
          └─────────────────────────────────────
Week 9-10 │ 阶段4: 管理优化 (Admin)
          │ ✅ 供应商管理
          │ ✅ 配额监控
          │ ✅ 性能优化
          └─────────────────────────────────────
Week 11+  │ 持续迭代
          │ 商业化/SaaS 功能
          │ 智能推荐/学情分析
```

---

## 阶段1: 基础设施搭建(Week 1-2)

### 目标

建立稳定的数据库架构和 API 基础,确保后续开发有坚实基础。

### 关键成果

- ✅ 6 个核心表创建完成(upload_tasks, parsed_questions 等)
- ✅ BFF API 可接收上传请求
- ✅ 题库前端版本降级完成
- ✅ 配额系统 MVP 就绪

---

### 1.1 数据库 Migration(Day 1-3)

**负责人**: 后端工程师
**工作量**: 3 天

#### 任务清单

- [ ] **创建 Migration 文件**
  ```bash
  cd d:\rixinwork\Rixindemo-codex-m1
  npx supabase migration new add_ai_question_bank
  ```

- [ ] **编写 SQL 脚本**
  - 复制[数据库设计文档](./AI题库-数据库设计与Migration方案.md)中的完整 SQL
  - 确认所有表、索引、RLS 策略、触发器

- [ ] **本地验证**
  ```bash
  npx supabase db reset
  npx supabase db diff
  ```
  检查输出是否符合预期

- [ ] **创建种子数据**
  - 编写 `supabase/seed_ai_question_bank.sql`
  - 包含测试教师账号、默认配额、示例任务

- [ ] **更新 README**
  - 添加数据库架构说明
  - 记录 migration 执行步骤

#### 验收标准

```sql
-- 验证所有表已创建
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'upload_tasks',
    'parsed_questions',
    'question_images',
    'question_tags',
    'provider_usage_logs',
    'tenant_quotas'
  );
-- 应返回 6 行

-- 验证 RLS 已启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%upload%' OR tablename LIKE '%parsed%';
-- rowsecurity 应全部为 true
```

---

### 1.2 BFF API 骨架(Day 4-7)

**负责人**: 全栈工程师
**工作量**: 4 天

#### 任务清单

- [ ] **创建 API 路由文件**
  ```
  src/app/api/ingest/
    ├── upload/route.ts
    ├── tasks/[id]/route.ts
    ├── tasks/[id]/questions/route.ts
    ├── batch/route.ts
    ├── recovery/route.ts
    └── quotas/route.ts
  ```

- [ ] **实现 `/upload` 接口**
  - 用户鉴权(Supabase Auth)
  - 文件验证(大小、类型)
  - 配额检查
  - 上传到 R2
  - 创建 upload_tasks 记录
  - 返回 taskId

- [ ] **实现 `/tasks/:id` 接口**
  - RLS 自动过滤
  - 返回任务详情与进度

- [ ] **实现配额服务**
  ```typescript
  // lib/quota.ts
  export async function checkQuota(...)
  export async function reserveQuota(...)
  ```

- [ ] **统一错误处理**
  ```typescript
  // lib/api-error.ts
  export class APIError extends Error {
    constructor(
      public code: string,
      public message: string,
      public traceId: string
    ) {}
  }
  ```

- [ ] **添加日志**
  ```typescript
  // lib/logger.ts
  export const logger = {
    info, error, warn
  }
  ```

#### 验收标准

```bash
# 测试上传接口
curl -X POST http://localhost:3000/api/ingest/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# 应返回
{
  "success": true,
  "data": {
    "taskId": "xxx",
    "fileName": "test.pdf",
    "status": "pending"
  }
}

# 测试任务查询
curl http://localhost:3000/api/ingest/tasks/xxx \
  -H "Authorization: Bearer $TOKEN"

# 应返回任务详情
```

---

### 1.3 题库前端版本降级(Day 6-7)

**负责人**: 前端工程师
**工作量**: 2 天

#### 任务清单

- [ ] **降级 Next.js 和 React**
  ```bash
  cd "C:\Users\PC\Downloads\question-entry-tool 1121最新版"
  npm uninstall next react react-dom
  npm install next@14.2.7 react@18.3.1 react-dom@18.3.1
  ```

- [ ] **降级 Tailwind CSS**
  ```bash
  npm uninstall tailwindcss
  npm install tailwindcss@3.4.17
  ```

- [ ] **修复类型错误**
  - 检查 TypeScript 编译错误
  - 调整不兼容的 API 调用

- [ ] **更新 `app/layout.tsx`**
  ```tsx
  export const metadata = {
    title: '日新伴学 AI 题库',
    description: '智能题目解析与录入系统'
  }

  export default function RootLayout({ children }) {
    return (
      <html lang="zh-CN">
        <body className={geistSans.className}>
          {children}
        </body>
      </html>
    )
  }
  ```

- [ ] **本地测试运行**
  ```bash
  npm run dev
  # 访问 http://localhost:3000 确认无报错
  ```

#### 验收标准

- ✅ `npm run build` 成功
- ✅ `npm run dev` 无错误
- ✅ 所有页面可正常访问
- ✅ TypeScript 无编译错误

---

### 1.4 前端连接 BFF(Day 7-10)

**负责人**: 前端工程师
**工作量**: 3-4 天

#### 任务清单

- [ ] **创建 API 客户端**
  ```typescript
  // lib/api-client.ts
  export const apiClient = {
    upload: (file: File) => fetch('/api/ingest/upload', ...),
    getTask: (taskId: string) => fetch(`/api/ingest/tasks/${taskId}`),
    getQuestions: (taskId: string, page: number) => ...,
    submitBatch: (taskId: string, questionIds: string[]) => ...
  }
  ```

- [ ] **替换 mockAPI**
  ```typescript
  // components/file-upload.tsx
  - import { mockAPI } from '@/lib/mock-api'
  + import { apiClient } from '@/lib/api-client'

  - const result = await mockAPI.uploadSingleFile(formData)
  + const result = await apiClient.upload(file)
  ```

- [ ] **集成 useAppStore**
  ```typescript
  // stores/useAppStore.ts
  export const useAppStore = create(
    persist(
      (set) => ({
        // 上传状态
        uploadedFiles: [],
        // 解析任务
        tasks: {},
        // 配额信息
        quotas: {}
      }),
      { name: 'app-storage' }
    )
  )
  ```

- [ ] **连接 Supabase Auth**
  ```typescript
  // 从主平台复用
  import { createClient } from '@/lib/supabase/client'

  const supabase = createClient()
  const { data: session } = await supabase.auth.getSession()
  ```

- [ ] **错误处理**
  - 实现统一的 Toast 提示
  - 配额超限时显示升级弹窗
  - 网络错误重试机制

#### 验收标准

- ✅ 可真实上传文件到 R2
- ✅ 任务状态实时更新(轮询)
- ✅ 错误提示正确显示
- ✅ 配额信息准确展示

---

### 阶段1 里程碑验收

**时间**: Week 2 结束

**演示内容**:
1. 登录日新教育平台
2. 进入 AI 题库页面
3. 上传一个 PDF 文件
4. 查看任务创建成功
5. 数据库中 `upload_tasks` 表有记录
6. R2 存储中有文件

**通过标准**:
- ✅ 所有 6 个表已创建
- ✅ 可成功上传文件
- ✅ 任务状态可查询
- ✅ 配额正确扣减
- ✅ 无 TypeScript 错误
- ✅ 无运行时崩溃

---

## 阶段2: 解析引擎实现(Week 3-6)

### 目标

实现完整的 OCR/AI 解析流程,从文件到结构化题目。

### 关键成果

- ✅ DeepSeek-OCR / Qwen-VL 集成
- ✅ Provider Factory 实现
- ✅ Worker 异步解析
- ✅ 成本控制在 ¥38-42/千题

---

### 2.1 Provider SDK 封装(Day 11-14)

**负责人**: AI 工程师
**工作量**: 4 天

#### 任务清单

- [ ] **创建 Provider 接口**
  ```typescript
  // lib/providers/base.ts
  export interface OCRProvider {
    name: string
    parse(file: Buffer): Promise<OCRResult>
    estimateCost(fileSize: number): number
  }

  export interface OCRResult {
    text: string
    confidence: number
    images: Array<{
      url: string
      position: { x: number, y: number, width: number, height: number }
    }>
  }
  ```

- [ ] **实现 DeepSeek-OCR**
  ```typescript
  // lib/providers/deepseek-ocr.ts
  export class DeepSeekOCRProvider implements OCRProvider {
    async parse(file: Buffer): Promise<OCRResult> {
      const response = await fetch('https://api.deepseek.com/v1/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: file
      })
      // 解析响应
    }
  }
  ```

- [ ] **实现 Qwen-VL**
  ```typescript
  // lib/providers/qwen-vl.ts
  export class QwenVLProvider implements OCRProvider {
    async parse(file: Buffer): Promise<OCRResult> {
      // 调用阿里云 DashScope API
    }
  }
  ```

- [ ] **Provider Factory**
  ```typescript
  // lib/providers/factory.ts
  export class ProviderFactory {
    async selectProvider(task: UploadTask): Promise<OCRProvider> {
      // 分析文件特征
      const profile = await analyzeDocument(task.file_url)

      if (profile.has_math || profile.has_handwriting) {
        return new QwenVLProvider()
      }

      return new DeepSeekOCRProvider()
    }
  }
  ```

#### 验收标准

```typescript
// 测试脚本
const provider = new DeepSeekOCRProvider()
const testPDF = fs.readFileSync('test-paper.pdf')
const result = await provider.parse(testPDF)

expect(result.text).toContain('函数')
expect(result.confidence).toBeGreaterThan(0.8)
expect(result.images.length).toBeGreaterThan(0)
```

---

### 2.2 Worker 实现(Day 15-20)

**负责人**: 后端工程师
**工作量**: 6 天

#### 任务清单

- [ ] **选择 Worker 方案**
  - 方案 A: BullMQ + Redis(推荐)
  - 方案 B: Inngest(Serverless)
  - 方案 C: Supabase Cron(简单)

- [ ] **实现任务调度器**
  ```typescript
  // lib/workers/parse-worker.ts
  import { Queue, Worker } from 'bullmq'

  const parseQueue = new Queue('parse-tasks', {
    connection: { host: 'localhost', port: 6379 }
  })

  const worker = new Worker('parse-tasks', async (job) => {
    const { taskId } = job.data
    await processParseTask(taskId)
  })
  ```

- [ ] **实现解析流程**
  ```typescript
  async function processParseTask(taskId: string) {
    // 1. 更新状态
    await updateTask(taskId, { status: 'processing', stage: 'ocr' })

    // 2. 下载文件
    const file = await downloadFromR2(task.file_url)

    // 3. OCR 解析
    const provider = await selectProvider(task)
    const ocrResult = await provider.parse(file)

    // 4. 题目切分
    const questions = await splitQuestions(ocrResult.text)

    // 5. AI 标签
    for (const q of questions) {
      q.tags = await aiTagging(q.content)
      q.difficulty = inferDifficulty(q)
    }

    // 6. 保存结果
    await saveParsedQuestions(taskId, questions)

    // 7. 更新状态
    await updateTask(taskId, {
      status: 'completed',
      progress: 100,
      total_questions: questions.length
    })
  }
  ```

- [ ] **实现题目切分算法**
  ```typescript
  function splitQuestions(text: string): Question[] {
    // 简单版本: 按题号分割
    const pattern = /\d+[\.、]/g
    const parts = text.split(pattern)

    return parts.map((content, index) => ({
      content: content.trim(),
      type: inferQuestionType(content)
    }))
  }
  ```

- [ ] **错误处理与重试**
  ```typescript
  // Worker 配置
  const worker = new Worker('parse-tasks', processParseTask, {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,      // 最多 10 个任务/分钟
      duration: 60000
    },
    settings: {
      backoffStrategies: {
        exponential: (attemptsMade) => Math.pow(2, attemptsMade) * 1000
      }
    }
  })

  worker.on('failed', async (job, err) => {
    await updateTask(job.data.taskId, {
      status: 'failed',
      error_message: err.message
    })
  })
  ```

#### 验收标准

```bash
# 启动 Worker
npm run worker:dev

# 触发解析任务
curl -X POST http://localhost:3000/api/ingest/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-paper.pdf"

# 观察日志
[Worker] Task started: task-123
[Worker] OCR completed: confidence 0.92
[Worker] Found 15 questions
[Worker] AI tagging completed
[Worker] Task completed: task-123
```

---

### 2.3 成本优化(Day 21-24)

**负责人**: AI 工程师 + 后端工程师
**工作量**: 4 天

#### 任务清单

- [ ] **实现文档预分析**
  ```typescript
  async function analyzeDocument(fileUrl: string) {
    const metadata = await getFileMetadata(fileUrl)

    return {
      has_math: detectMathFormula(metadata),
      has_handwriting: detectHandwriting(metadata),
      complexity: calculateComplexity(metadata),
      estimated_pages: metadata.pageCount
    }
  }
  ```

- [ ] **动态策略选择**
  ```typescript
  const strategies = {
    standard: {
      ocr: 'deepseek-ocr',
      llm: 'deepseek-v2.5',
      cost_per_page: 0.02
    },
    mathHeavy: {
      ocr: 'qwen-vl-max',
      llm: 'gemini-1.5-pro',
      cost_per_page: 0.025
    },
    costSaving: {
      ocr: 'paddle-ocr',  // 开源
      llm: 'deepseek-v2.5',
      cost_per_page: 0.01
    }
  }
  ```

- [ ] **记录使用日志**
  ```typescript
  await supabase.from('provider_usage_logs').insert({
    task_id: taskId,
    provider_id: 'deepseek-ocr',
    stage: 'ocr_primary',
    duration_ms: 2500,
    response_tokens: 1200,
    cost_estimated: 0.024,
    success: true,
    confidence: 0.92
  })
  ```

- [ ] **成本监控 Dashboard**
  ```typescript
  // 查询本月成本
  const { data: costs } = await supabase
    .from('provider_usage_logs')
    .select('cost_estimated, provider_id')
    .gte('created_at', startOfMonth())
    .lte('created_at', endOfMonth())

  const totalCost = costs.reduce((sum, c) => sum + c.cost_estimated, 0)
  ```

#### 验收标准

- ✅ 1000 题成本稳定在 ¥38-42
- ✅ `provider_usage_logs` 表有完整记录
- ✅ 可按供应商/策略查询成本
- ✅ 超预算时自动告警

---

### 阶段2 里程碑验收

**时间**: Week 6 结束

**演示内容**:
1. 上传一份真实试卷(20 题)
2. Worker 自动解析
3. 5 分钟内完成
4. `parsed_questions` 表有 20 条记录
5. 每题包含 AI 标签和置信度
6. 成本记录准确

**通过标准**:
- ✅ 解析成功率 ≥ 90%
- ✅ 平均置信度 ≥ 0.85
- ✅ 单题成本 ≤ ¥0.05
- ✅ 无内存泄漏
- ✅ 错误自动重试

---

## 阶段3: 人工校对界面(Week 7-8)

### 目标

教师可审核、编辑、提交 AI 解析结果到正式题库。

### 关键成果

- ✅ QuestionEditor 读取真实数据
- ✅ 标签置信度可视化
- ✅ 批量提交入库
- ✅ 主平台题库可查看

---

### 3.1 QuestionEditor 改造(Day 25-28)

**负责人**: 前端工程师
**工作量**: 4 天

#### 任务清单

- [ ] **读取 parsed_questions**
  ```typescript
  // app/edit/page.tsx
  const { data: questions } = await apiClient.getQuestions(taskId)

  useEffect(() => {
    setQuestions(questions)
  }, [questions])
  ```

- [ ] **置信度可视化**
  ```tsx
  <div className={cn(
    'confidence-badge',
    confidence >= 0.9 && 'bg-green-100',
    confidence >= 0.7 && confidence < 0.9 && 'bg-yellow-100',
    confidence < 0.7 && 'bg-red-100'
  )}>
    {(confidence * 100).toFixed(0)}%
  </div>
  ```

- [ ] **AI 标签建议**
  ```tsx
  {question.tags.map(tag => (
    <Badge
      key={tag.value}
      variant={tag.confidence > 0.8 ? 'default' : 'outline'}
    >
      {tag.value}
      <span className="text-xs ml-1">
        {(tag.confidence * 100).toFixed(0)}%
      </span>
    </Badge>
  ))}
  ```

- [ ] **图片拖拽排版**
  ```tsx
  <DndContext onDragEnd={handleDragEnd}>
    <SortableContext items={images}>
      {images.map(img => (
        <SortableImage key={img.id} {...img} />
      ))}
    </SortableContext>
  </DndContext>
  ```

- [ ] **必填项校验**
  ```typescript
  function validateQuestion(q: Question): string[] {
    const errors: string[] = []

    if (!q.content) errors.push('题干不能为空')
    if (!q.answer) errors.push('答案不能为空')
    if (!q.difficulty) errors.push('请选择难度')
    if (q.tags.filter(t => t.category === 'knowledge_point').length === 0) {
      errors.push('至少选择一个知识点')
    }

    return errors
  }
  ```

#### 验收标准

- ✅ 所有字段可编辑
- ✅ 置信度正确显示
- ✅ 图片可拖拽排序
- ✅ 缺少必填项时禁止提交

---

### 3.2 批量入库(Day 29-30)

**负责人**: 全栈工程师
**工作量**: 2 天

#### 任务清单

- [ ] **前端批量选择**
  ```tsx
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  <Checkbox
    checked={selectedIds.has(q.id)}
    onCheckedChange={(checked) => {
      if (checked) {
        setSelectedIds(prev => new Set([...prev, q.id]))
      } else {
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(q.id)
          return next
        })
      }
    }}
  />
  ```

- [ ] **调用批量提交 API**
  ```typescript
  const handleSubmit = async () => {
    const result = await apiClient.submitBatch(taskId, [...selectedIds])

    if (result.success) {
      toast.success(`成功提交 ${result.submitted} 道题目`)
      router.push('/library')
    }
  }
  ```

- [ ] **后端批量插入优化**
  ```typescript
  // 使用事务
  const { data, error } = await supabase
    .rpc('batch_insert_questions', {
      questions: questionsData
    })
  ```

#### 验收标准

- ✅ 可选择多道题目
- ✅ 一次提交全部入库
- ✅ 主平台题库立即可见
- ✅ 提交后标记 `is_submitted=true`

---

### 3.3 主平台联调(Day 31-32)

**负责人**: 全栈工程师
**工作量**: 2 天

#### 任务清单

- [ ] **验证 RLS 权限**
  - 教师可查看自己提交的题目
  - 学生不可见待审核题目

- [ ] **题库列表展示**
  ```tsx
  // src/app/questions/page.tsx (主平台)
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })
  ```

- [ ] **关联图片显示**
  ```tsx
  const { data: images } = await supabase
    .from('question_images')
    .select('*')
    .eq('question_id', questionId)
    .order('position')
  ```

- [ ] **标签筛选**
  ```tsx
  // 按知识点筛选
  const { data } = await supabase
    .from('questions')
    .select(`
      *,
      question_tags!inner(category, value)
    `)
    .eq('question_tags.category', 'knowledge_point')
    .eq('question_tags.value', '二次函数')
  ```

#### 验收标准

- ✅ 主平台可看到新增题目
- ✅ 图片正确显示
- ✅ 标签筛选正常
- ✅ 无权限漏洞

---

### 阶段3 里程碑验收

**时间**: Week 8 结束

**演示内容**:
1. 教师上传试卷
2. AI 解析完成
3. 教师审核并修改部分题目
4. 批量提交 20 道题
5. 在主平台题库中查看
6. 使用题目组卷

**通过标准**:
- ✅ 人工校对效率 ≤ 30 秒/题
- ✅ AI 标签准确率 ≥ 85%
- ✅ 批量入库成功率 100%
- ✅ 主平台联调无错误

---

## 阶段4: 管理与优化(Week 9-10)

### 目标

完善 Admin 后台,实现供应商管理、配额监控、性能优化。

### 关键成果

- ✅ 可在后台切换 OCR 供应商
- ✅ 配额实时监控
- ✅ 成本报表生成
- ✅ 性能优化完成

---

### 4.1 Admin 供应商管理(Day 33-36)

**负责人**: 全栈工程师
**工作量**: 4 天

#### 任务清单

- [ ] **创建 provider_configs 表**
  ```sql
  CREATE TABLE provider_configs (
    id UUID PRIMARY KEY,
    name TEXT,
    type TEXT, -- 'ocr' | 'llm'
    endpoint TEXT,
    api_key TEXT,  -- 加密存储
    priority INTEGER,
    status TEXT,   -- 'active' | 'standby' | 'disabled'
    cost_per_unit NUMERIC(10,4)
  );
  ```

- [ ] **Admin 界面**
  ```tsx
  // components/admin/provider-manager.tsx
  <Table>
    {providers.map(p => (
      <TableRow key={p.id}>
        <TableCell>{p.name}</TableCell>
        <TableCell>{p.type}</TableCell>
        <TableCell>{p.status}</TableCell>
        <TableCell>
          <Button onClick={() => toggleStatus(p.id)}>
            {p.status === 'active' ? '禁用' : '启用'}
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </Table>
  ```

- [ ] **热更新机制**
  ```typescript
  // lib/providers/registry.ts
  let providerCache: Map<string, OCRProvider> | null = null

  export function getProvider(type: string): OCRProvider {
    if (!providerCache) {
      providerCache = loadProvidersFromDB()
    }
    return providerCache.get(type)
  }

  export function refreshProviders() {
    providerCache = null  // 清空缓存
  }
  ```

#### 验收标准

- ✅ 可新增/编辑供应商配置
- ✅ 切换状态后下个任务生效
- ✅ API Key 加密存储
- ✅ 有操作日志

---

### 4.2 配额监控 Dashboard(Day 37-38)

**负责人**: 前端工程师
**工作量**: 2 天

#### 任务清单

- [ ] **实时配额展示**
  ```tsx
  <Progress value={(quota.used / quota.limit) * 100} />
  <p className="text-sm text-muted-foreground">
    已使用 {quota.used} / {quota.limit} 页
  </p>
  ```

- [ ] **配额趋势图**
  ```tsx
  <LineChart
    data={quotaHistory}
    xField="date"
    yField="used"
    colorField="resource_type"
  />
  ```

- [ ] **告警规则**
  ```typescript
  // lib/quota-alerts.ts
  export async function checkQuotaAlerts() {
    const quotas = await getQuotas()

    for (const q of quotas) {
      const usage = (q.used / q.limit) * 100

      if (usage >= 95) {
        await sendAlert({
          level: 'critical',
          message: `配额即将耗尽: ${q.resource_type} (${usage.toFixed(1)}%)`
        })
      } else if (usage >= 80) {
        await sendAlert({
          level: 'warning',
          message: `配额使用率较高: ${q.resource_type} (${usage.toFixed(1)}%)`
        })
      }
    }
  }
  ```

#### 验收标准

- ✅ Dashboard 实时显示配额
- ✅ 趋势图正确渲染
- ✅ 超 80% 时黄色预警
- ✅ 超 95% 时红色告警

---

### 4.3 性能优化(Day 39-40)

**负责人**: 全栈工程师
**工作量**: 2 天

#### 任务清单

- [ ] **数据库查询优化**
  ```sql
  -- 添加复合索引
  CREATE INDEX idx_parsed_questions_task_selected
    ON parsed_questions(upload_task_id, is_selected)
    WHERE is_selected = true;

  -- 使用 Explain Analyze 验证
  EXPLAIN ANALYZE
  SELECT * FROM parsed_questions
  WHERE upload_task_id = 'xxx' AND is_selected = true;
  ```

- [ ] **API 响应优化**
  ```typescript
  // 使用 React Query 缓存
  const { data } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => apiClient.getTask(taskId),
    staleTime: 5000,  // 5秒内复用缓存
    cacheTime: 60000  // 1分钟后清除
  })
  ```

- [ ] **图片懒加载**
  ```tsx
  <Image
    src={imageUrl}
    alt="题目图片"
    loading="lazy"
    placeholder="blur"
  />
  ```

- [ ] **Worker 并发优化**
  ```typescript
  const worker = new Worker('parse-tasks', processParseTask, {
    concurrency: 10,  // 提升到 10 并发
    limiter: {
      max: 20,
      duration: 60000
    }
  })
  ```

#### 验收标准

- ✅ 题库列表首屏 < 1.5s
- ✅ 图片懒加载生效
- ✅ API 响应 < 500ms
- ✅ Worker 吞吐量 > 10 任务/分钟

---

### 阶段4 里程碑验收

**时间**: Week 10 结束

**演示内容**:
1. Admin 切换 OCR 供应商
2. 新任务使用新供应商
3. 配额监控 Dashboard
4. 成本报表导出
5. 性能指标达标

**通过标准**:
- ✅ 供应商热切换成功
- ✅ 配额监控准确
- ✅ 所有性能指标达标
- ✅ 无已知 Bug

---

## 持续迭代(Week 11+)

### 商业化功能

- [ ] 会员套餐管理
- [ ] 支付集成(微信/支付宝)
- [ ] 发票系统
- [ ] 推广渠道管理

### 智能功能

- [ ] 相似题推荐(向量检索)
- [ ] 拍照搜题
- [ ] 智能组卷优化
- [ ] 学情分析报告

### 运营工具

- [ ] 数据看板(Metabase)
- [ ] 用户行为分析
- [ ] A/B 测试框架
- [ ] 客服工单系统

---

## 团队协作

### 日会

**时间**: 每天 10:00
**时长**: 15 分钟
**内容**:
- 昨天完成了什么?
- 今天计划做什么?
- 有什么阻碍?

### 周会

**时间**: 每周五 15:00
**时长**: 1 小时
**内容**:
- 本周里程碑回顾
- 下周计划
- 风险评估
- Demo 演示

### 工具

- **项目管理**: Notion / Linear
- **代码仓库**: GitHub
- **CI/CD**: GitHub Actions
- **监控**: Vercel Analytics + Supabase Dashboard
- **沟通**: 企业微信/钉钉

---

## 风险管理

| 风险 | 应对措施 | 负责人 |
|------|---------|--------|
| OCR API 限流 | 提前申请提额,准备备用账号 | AI工程师 |
| 数据库性能问题 | 提前压测,准备读写分离方案 | 后端工程师 |
| 前端版本降级失败 | 保留原代码备份,分支开发 | 前端工程师 |
| 成本超支 | 每日监控,设置自动告警 | 项目经理 |
| 进度延期 | 每周 review,及时调整优先级 | 全员 |

---

## 总结

### 关键成功因素

1. ✅ **数据库优先**: 先把表结构做对,后续开发事半功倍
2. ✅ **BFF 隔离**: 前后端通过标准 API 通信,降低耦合
3. ✅ **配额控制**: 从第一天就实现,避免后期成本失控
4. ✅ **人机回环**: AI 只是辅助,人工审核不可省略
5. ✅ **渐进迭代**: 不求一次做完美,MVP 先上线再优化

### 预期成果

- ✅ **教师录题效率**: 5 分钟/题 → 30 秒/题 (提升 **90%**)
- ✅ **题库数据质量**: AI 辅助准确率 **95%+**
- ✅ **运营成本**: ¥38-42 / 1000 题
- ✅ **系统稳定性**: 可用性 **99%+**

### 下一步

完成 Week 1-2 的基础设施搭建后,立即召开阶段1验收会议,确认无误后再进入阶段2。

---

**文档维护者**: Claude Code AI
**最后更新**: 2025-11-21
