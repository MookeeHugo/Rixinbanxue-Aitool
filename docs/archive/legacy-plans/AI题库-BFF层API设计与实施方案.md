# AI智能题库系统 - BFF层 API 设计与实施方案

**文档版本**: v1.0
**创建时间**: 2025-11-21
**目标**: 为日新教育平台设计统一的 BFF(Backend for Frontend) API 层

---

## 一、架构概述

### 1.1 整体架构图

```
┌──────────────────────────────────────────────────────────┐
│                    AI题库前端                            │
│            (question-entry-tool)                        │
│  Upload / Parse / Edit / Library / Admin               │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTP/JSON
                      ↓
┌──────────────────────────────────────────────────────────┐
│              BFF 层 (/api/ingest/*)                     │
│         (Next.js 14 Route Handlers)                     │
│                                                          │
│  ┌──────────┬──────────┬───────────┬──────────────┐   │
│  │ Upload   │  Task    │  Batch    │  Recovery    │   │
│  │ Service  │  Service │  Service  │  Service     │   │
│  └──────────┴──────────┴───────────┴──────────────┘   │
│                                                          │
│  统一功能:                                               │
│  - Supabase Token 注入                                  │
│  - 配额检查与扣减                                        │
│  - Trace ID 生成                                        │
│  - 错误码标准化                                          │
│  - 日志记录                                             │
└─────────┬───────────────┬──────────────┬────────────────┘
          │               │              │
          ↓               ↓              ↓
┌─────────────────┐ ┌────────────┐ ┌───────────────┐
│ Supabase        │ │ R2 Storage │ │ Worker Queue  │
│ (PostgreSQL)    │ │ (Cloudflare│ │ (BullMQ/      │
│                 │ │  CDN)      │ │  Inngest)     │
│ - upload_tasks  │ │            │ │               │
│ - parsed_ques.. │ │            │ │ ┌──────────┐  │
│ - questions     │ │            │ │ │ OCR      │  │
│ - tenant_quotas │ │            │ │ │ Worker   │  │
└─────────────────┘ └────────────┘ │ └──────────┘  │
                                   │ ┌──────────┐  │
                                   │ │ AI       │  │
                                   │ │ Worker   │  │
                                   │ └──────────┘  │
                                   └───────────────┘
```

### 1.2 为什么需要 BFF 层?

**问题**: 如果前端直接访问 Supabase

❌ 安全风险: 暴露 Service Role Key
❌ 无法统一鉴权: 每个页面重复验证
❌ 配额难管理: 无中心化控制点
❌ 日志分散: 链路追踪困难
❌ 错误处理不一致: 前端处理复杂

**解决**: 通过 BFF 层统一处理

✅ 安全: 前端只持有 Anon Key,BFF 持有 Service Key
✅ 鉴权统一: BFF 验证 Supabase token
✅ 配额中心化: BFF 检查并扣减配额
✅ 可观测性: 统一 trace_id 与日志
✅ 错误标准化: 统一错误响应格式

---

## 二、API 端点设计

### 2.1 API 清单

| 端点 | 方法 | 描述 | 鉴权 |
|------|------|------|------|
| `/api/ingest/upload` | POST | 上传文件并创建解析任务 | ✅ |
| `/api/ingest/tasks/:id` | GET | 获取任务详情与进度 | ✅ |
| `/api/ingest/tasks/:id/questions` | GET | 获取解析结果列表 | ✅ |
| `/api/ingest/tasks/:id/reparse` | POST | 重新解析单个题目 | ✅ |
| `/api/ingest/batch` | POST | 批量提交题目到 questions 表 | ✅ |
| `/api/ingest/recovery` | GET | 获取可恢复的任务列表 | ✅ |
| `/api/ingest/quotas` | GET | 获取当前用户配额信息 | ✅ |
| `/api/ingest/ai/tagging` | POST | AI 标签生成(可选) | ✅ |

### 2.2 API 详细设计

---

#### 2.2.1 POST /api/ingest/upload

**用途**: 上传文件并创建解析任务

**请求**:
```http
POST /api/ingest/upload
Content-Type: multipart/form-data
Authorization: Bearer <supabase_access_token>

file: <binary>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "2024中考数学.pdf",
    "fileSize": 2048576,
    "status": "pending",
    "traceId": "trace-abc123"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "您已达到本月上传限额(100页),请升级套餐",
    "traceId": "trace-abc123"
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录或 token 无效
- `QUOTA_EXCEEDED`: 配额超限
- `FILE_TOO_LARGE`: 文件超过 20MB
- `INVALID_FILE_TYPE`: 不支持的文件类型
- `UPLOAD_FAILED`: 上传到 R2 失败

**实现代码**:
```typescript
// app/api/ingest/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/storage'
import { checkQuota, reserveQuota } from '@/lib/quota'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    // 1. 验证用户
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
          traceId
        }
      }, { status: 401 })
    }

    // 2. 解析 FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '缺少文件',
          traceId
        }
      }, { status: 400 })
    }

    // 3. 文件验证
    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `文件大小不能超过 20MB,当前 ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          traceId
        }
      }, { status: 413 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: '仅支持 PDF/JPG/PNG 格式',
          traceId
        }
      }, { status: 415 })
    }

    // 4. 检查配额
    const quota = await checkQuota(user.id, 'page', 1) // 假设1个文件=1页,后续可精确计算

    if (!quota.available) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `您已达到本月上传限额(${quota.limit}页),请升级套餐`,
          traceId,
          details: {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining
          }
        }
      }, { status: 429 })
    }

    // 5. 上传到 R2
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileKey = `raw-papers/${user.id}/${Date.now()}-${file.name}`

    const uploadResult = await uploadFile({
      file: fileBuffer,
      key: fileKey,
      accessLevel: 'PRIVATE',
      contentType: file.type
    })

    // 6. 创建任务记录
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: uploadResult.publicUrl || uploadResult.cdnUrl,
        file_size: file.size,
        mime_type: file.type,
        status: 'pending',
        trace_id: traceId,
        stage: 'uploading'
      })
      .select()
      .single()

    if (taskError) {
      logger.error('创建任务失败', { traceId, error: taskError })
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '创建任务失败,请稍后重试',
          traceId
        }
      }, { status: 500 })
    }

    // 7. 扣减配额
    await reserveQuota(user.id, 'page', 1, traceId)

    // 8. 触发解析 Worker(异步)
    // await triggerParseWorker(task.id)
    // 或使用消息队列: await queueParseTask(task.id)

    // 9. 记录日志
    logger.info('文件上传成功', {
      traceId,
      taskId: task.id,
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      duration: Date.now() - startTime
    })

    // 10. 返回成功
    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        fileName: task.file_name,
        fileSize: task.file_size,
        status: task.status,
        traceId
      }
    })

  } catch (error) {
    logger.error('上传异常', { traceId, error })
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
        traceId
      }
    }, { status: 500 })
  }
}
```

---

#### 2.2.2 GET /api/ingest/tasks/:id

**用途**: 获取任务详情与实时进度

**请求**:
```http
GET /api/ingest/tasks/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <supabase_access_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "2024中考数学.pdf",
    "fileSize": 2048576,
    "status": "processing",
    "progress": 65,
    "stage": "parsing",
    "stageProgress": {
      "upload": 100,
      "ocr": 100,
      "split": 65,
      "tag": 0
    },
    "totalQuestions": 12,
    "currentPage": 3,
    "errorMessage": null,
    "traceId": "trace-abc123",
    "createdAt": "2025-11-21T10:30:00Z",
    "updatedAt": "2025-11-21T10:35:00Z",
    "completedAt": null
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "任务不存在或无权访问",
    "traceId": "trace-xyz"
  }
}
```

**实现代码**:
```typescript
// app/api/ingest/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const traceId = crypto.randomUUID()

  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '请先登录', traceId }
      }, { status: 401 })
    }

    // 查询任务(RLS 自动过滤)
    const { data: task, error } = await supabase
      .from('upload_tasks')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !task) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: '任务不存在或无权访问',
          traceId
        }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        fileName: task.file_name,
        fileSize: task.file_size,
        status: task.status,
        progress: task.progress,
        stage: task.stage,
        stageProgress: task.stage_progress,
        totalQuestions: task.total_questions,
        currentPage: task.current_page,
        errorMessage: task.error_message,
        traceId: task.trace_id,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: '服务器错误', traceId }
    }, { status: 500 })
  }
}
```

---

#### 2.2.3 GET /api/ingest/tasks/:id/questions

**用途**: 获取解析结果列表(分页)

**请求**:
```http
GET /api/ingest/tasks/550e8400-e29b-41d4-a716-446655440000/questions?page=1&limit=20
Authorization: Bearer <supabase_access_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q-001",
        "type": "choice",
        "content": "已知函数 y = 2x² - 4x + 1,求顶点坐标?",
        "options": ["A. (1, -1)", "B. (2, 1)", "C. (1, 1)", "D. (2, -1)"],
        "answer": "A",
        "explanation": "配方法: y = 2(x-1)² - 1",
        "tags": [
          { "category": "knowledge_point", "value": "二次函数", "confidence": 0.95 },
          { "category": "difficulty", "value": "medium", "confidence": 0.88 }
        ],
        "confidence": 0.92,
        "hasImage": false,
        "imageUrls": [],
        "isSelected": true,
        "sourcePage": 1
      }
    ],
    "pagination": {
      "total": 30,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

**实现代码**:
```typescript
// app/api/ingest/tasks/[id]/questions/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const traceId = crypto.randomUUID()
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '请先登录', traceId }
      }, { status: 401 })
    }

    // 验证任务所有权
    const { data: task } = await supabase
      .from('upload_tasks')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!task) {
      return NextResponse.json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '任务不存在', traceId }
      }, { status: 404 })
    }

    // 分页查询解析结果
    const offset = (page - 1) * limit

    const { data: questions, error, count } = await supabase
      .from('parsed_questions')
      .select('*', { count: 'exact' })
      .eq('upload_task_id', params.id)
      .order('source_page', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: '查询失败', traceId }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        questions: questions.map(q => ({
          id: q.id,
          type: q.type,
          content: q.content,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          tags: q.tags,
          confidence: q.confidence_score,
          hasImage: q.has_image,
          imageUrls: q.image_urls || [],
          isSelected: q.is_selected,
          sourcePage: q.source_page
        })),
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: '服务器错误', traceId }
    }, { status: 500 })
  }
}
```

---

#### 2.2.4 POST /api/ingest/batch

**用途**: 批量提交选中的题目到 questions 表

**请求**:
```json
POST /api/ingest/batch
Authorization: Bearer <supabase_access_token>

{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "questionIds": ["q-001", "q-002", "q-003"],
  "overrides": {
    "q-001": {
      "difficulty": "easy",
      "tags": [
        { "category": "knowledge_point", "value": "二次函数" }
      ]
    }
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "submitted": 3,
    "failed": 0,
    "questionIds": [
      "new-q-001",
      "new-q-002",
      "new-q-003"
    ]
  }
}
```

**实现代码**:
```typescript
// app/api/ingest/batch/route.ts
import { z } from 'zod'

const BatchSchema = z.object({
  taskId: z.string().uuid(),
  questionIds: z.array(z.string()),
  overrides: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID()

  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '请先登录', traceId }
      }, { status: 401 })
    }

    // 解析并验证请求体
    const body = await request.json()
    const validated = BatchSchema.parse(body)

    // 获取解析结果
    const { data: parsedQuestions, error: fetchError } = await supabase
      .from('parsed_questions')
      .select('*')
      .in('id', validated.questionIds)
      .eq('upload_task_id', validated.taskId)

    if (fetchError || !parsedQuestions) {
      return NextResponse.json({
        success: false,
        error: { code: 'QUESTIONS_NOT_FOUND', message: '题目不存在', traceId }
      }, { status: 404 })
    }

    // 转换为 questions 表格式
    const questionsToInsert = parsedQuestions.map(pq => {
      const override = validated.overrides?.[pq.id] || {}

      return {
        type: pq.type,
        content: pq.content,
        options: pq.options,
        answer: pq.answer,
        analysis_content: pq.explanation,
        knowledge_points: pq.tags
          ?.filter((t: any) => t.category === 'knowledge_point')
          .map((t: any) => t.value) || [],
        difficulty: override.difficulty || pq.difficulty || 'medium',
        image_url: pq.image_urls?.[0] || null,
        created_by: user.id
      }
    })

    // 批量插入
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: { code: 'INSERT_FAILED', message: '入库失败', traceId }
      }, { status: 500 })
    }

    // 标记为已提交
    await supabase
      .from('parsed_questions')
      .update({ is_submitted: true })
      .in('id', validated.questionIds)

    return NextResponse.json({
      success: true,
      data: {
        submitted: insertedQuestions.length,
        failed: validated.questionIds.length - insertedQuestions.length,
        questionIds: insertedQuestions.map(q => q.id)
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请求参数错误', traceId }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: '服务器错误', traceId }
    }, { status: 500 })
    }
}
```

---

## 三、统一错误处理

### 3.1 错误码规范

| 错误码 | HTTP 状态码 | 含义 | 处理建议 |
|--------|------------|------|---------|
| `UNAUTHORIZED` | 401 | 未登录或 token 无效 | 跳转登录页 |
| `FORBIDDEN` | 403 | 权限不足 | 提示用户 |
| `QUOTA_EXCEEDED` | 429 | 配额超限 | 引导升级 |
| `FILE_TOO_LARGE` | 413 | 文件过大 | 提示压缩 |
| `INVALID_FILE_TYPE` | 415 | 文件类型不支持 | 提示格式 |
| `TASK_NOT_FOUND` | 404 | 任务不存在 | 返回列表 |
| `VALIDATION_ERROR` | 400 | 请求参数错误 | 显示详情 |
| `DATABASE_ERROR` | 500 | 数据库错误 | 稍后重试 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 | 联系客服 |

### 3.2 错误响应格式

```typescript
interface APIError {
  success: false
  error: {
    code: string
    message: string
    traceId: string
    details?: Record<string, any>
  }
}
```

### 3.3 前端错误处理

```typescript
// lib/api-client.ts
async function handleAPIResponse(response: Response) {
  const data = await response.json()

  if (!data.success) {
    const error = data.error

    // 记录到控制台
    console.error('[API Error]', {
      code: error.code,
      message: error.message,
      traceId: error.traceId
    })

    // 全局错误处理
    switch (error.code) {
      case 'UNAUTHORIZED':
        // 跳转登录
        window.location.href = '/login'
        break

      case 'QUOTA_EXCEEDED':
        // 显示升级弹窗
        showUpgradeModal(error.details)
        break

      case 'FILE_TOO_LARGE':
        // Toast 提示
        toast.error(error.message)
        break

      default:
        // 通用错误提示
        toast.error(error.message || '操作失败,请稍后重试')
    }

    throw new APIError(error)
  }

  return data.data
}
```

---

## 四、配额管理实现

### 4.1 配额服务

```typescript
// lib/quota.ts
import { createClient } from '@/lib/supabase/server'

export interface QuotaCheckResult {
  available: boolean
  used: number
  limit: number
  remaining: number
}

export async function checkQuota(
  tenantId: string,
  resourceType: 'storage' | 'page' | 'token' | 'cost',
  amount: number
): Promise<QuotaCheckResult> {
  const supabase = createClient()

  const { data: quota } = await supabase
    .from('tenant_quotas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('resource_type', resourceType)
    .single()

  if (!quota) {
    // 如果没有配额记录,创建默认配额
    const defaultLimit = getDefaultLimit(resourceType)

    const { data: newQuota } = await supabase
      .from('tenant_quotas')
      .insert({
        tenant_id: tenantId,
        resource_type: resourceType,
        limit_value: defaultLimit,
        used_value: 0,
        window_end: getNextMonthStart(),
        overage_policy: 'block'
      })
      .select()
      .single()

    return {
      available: amount <= defaultLimit,
      used: 0,
      limit: defaultLimit,
      remaining: defaultLimit
    }
  }

  const remaining = quota.limit_value - quota.used_value
  const available = amount <= remaining

  return {
    available,
    used: quota.used_value,
    limit: quota.limit_value,
    remaining
  }
}

export async function reserveQuota(
  tenantId: string,
  resourceType: string,
  amount: number,
  traceId: string
): Promise<void> {
  const supabase = createClient()

  // 原子性扣减
  const { error } = await supabase.rpc('reserve_quota', {
    p_tenant_id: tenantId,
    p_resource_type: resourceType,
    p_amount: amount
  })

  if (error) {
    console.error('[Quota] Reserve failed', { traceId, error })
    throw error
  }
}

function getDefaultLimit(resourceType: string): number {
  const defaults = {
    storage: 1024 * 1024 * 1024, // 1GB
    page: 100,                    // 100页/月
    token: 100000,                // 10万 token
    cost: 50                      // ¥50/月
  }
  return defaults[resourceType] || 0
}

function getNextMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}
```

### 4.2 Supabase RPC 函数

```sql
-- 原子性配额扣减
CREATE OR REPLACE FUNCTION reserve_quota(
  p_tenant_id UUID,
  p_resource_type TEXT,
  p_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE tenant_quotas
  SET used_value = used_value + p_amount,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND resource_type = p_resource_type
    AND (used_value + p_amount) <= limit_value;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quota exceeded or not found';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 五、日志与追踪

### 5.1 结构化日志

```typescript
// lib/logger.ts
export const logger = {
  info(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },

  error(message: string, meta?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },

  warn(message: string, meta?: Record<string, any>) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  }
}
```

### 5.2 链路追踪

所有 API 调用都应该:
1. 生成唯一的 `traceId`
2. 记录到数据库(`trace_id` 字段)
3. 返回给前端
4. 前端在后续请求中携带

```typescript
// 前端携带 traceId
fetch('/api/ingest/tasks/xxx/questions', {
  headers: {
    'X-Trace-ID': previousTraceId
  }
})
```

---

## 六、测试策略

### 6.1 单元测试

```typescript
// __tests__/api/ingest/upload.test.ts
import { POST } from '@/app/api/ingest/upload/route'

describe('/api/ingest/upload', () => {
  it('应该拒绝未登录用户', async () => {
    const request = new Request('http://localhost:3000/api/ingest/upload', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  it('应该拒绝过大文件', async () => {
    // Mock 30MB 文件
    const largeFile = new File([new ArrayBuffer(30 * 1024 * 1024)], 'test.pdf')
    const formData = new FormData()
    formData.append('file', largeFile)

    const request = new Request('http://localhost:3000/api/ingest/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(413)
    expect(data.error.code).toBe('FILE_TOO_LARGE')
  })
})
```

### 6.2 集成测试

```typescript
// __tests__/integration/upload-flow.test.ts
describe('完整上传流程', () => {
  it('应该完成上传→解析→入库', async () => {
    // 1. 上传文件
    const uploadRes = await uploadFile('test.pdf')
    expect(uploadRes.success).toBe(true)

    const taskId = uploadRes.data.taskId

    // 2. 轮询直到完成
    await waitUntil(() => getTask(taskId).status === 'completed')

    // 3. 获取解析结果
    const questions = await getQuestions(taskId)
    expect(questions.length).toBeGreaterThan(0)

    // 4. 批量提交
    const batchRes = await submitBatch(taskId, questions.map(q => q.id))
    expect(batchRes.submitted).toBe(questions.length)

    // 5. 验证入库
    const dbQuestions = await getQuestionsFromDB()
    expect(dbQuestions.length).toBeGreaterThanOrEqual(questions.length)
  })
})
```

---

## 七、部署与运维

### 7.1 环境变量

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # 仅服务端

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=rixin-question-bank

# Worker Queue (可选)
BULLMQ_REDIS_URL=redis://localhost:6379
```

### 7.2 健康检查

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // 检查 Supabase 连接
    const supabase = createClient()
    await supabase.from('profiles').select('count').limit(1).single()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        storage: 'up'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: String(error)
    }, { status: 503 })
  }
}
```

---

**文档维护者**: Claude Code AI
**最后更新**: 2025-11-21
