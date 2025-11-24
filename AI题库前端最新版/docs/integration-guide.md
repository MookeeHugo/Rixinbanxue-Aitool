# 集成指南

## 概述

本文档说明如何将数学题目录入工具集成到日新教育平台中。

## 集成方式

### 方式一：API集成（推荐）

通过RESTful API将题目录入工具作为独立服务集成。

**优点**：
- 服务解耦，独立部署和扩展
- 可以被多个系统调用
- 便于维护和升级

**集成步骤**：

1. **部署题目录入服务**
   \`\`\`bash
   # 部署到独立域名或子路径
   https://api.rixinedu.com/question-entry
   \`\`\`

2. **配置认证**
   \`\`\`typescript
   // 在日新教育平台中配置API密钥
   const QUESTION_ENTRY_API_KEY = process.env.QUESTION_ENTRY_API_KEY
   \`\`\`

3. **调用API**
   \`\`\`typescript
   // 在日新教育平台中调用题目录入API
   import { questionEntryClient } from '@/lib/question-entry-client'
   
   const uploadFile = async (file: File) => {
     const response = await questionEntryClient.upload(file)
     return response.data
   }
   \`\`\`

### 方式二：组件集成

将题目录入工具作为React组件集成到日新教育平台。

**优点**：
- 无需额外部署
- 共享认证和状态管理
- 用户体验更统一

**集成步骤**：

1. **安装依赖包**
   \`\`\`bash
   npm install @rixinedu/question-entry
   \`\`\`

2. **导入组件**
   \`\`\`typescript
   import { QuestionEntryTool } from '@rixinedu/question-entry'
   
   export default function QuestionManagePage() {
     return (
       <div>
         <QuestionEntryTool
           onQuestionCreated={(question) => {
             // 处理新创建的题目
             console.log('New question:', question)
           }}
         />
       </div>
     )
   }
   \`\`\`

## API客户端封装

### 创建API客户端

\`\`\`typescript
// lib/question-entry-client.ts
import { ApiResponse, Question, UploadTask } from '@/types/question'

class QuestionEntryClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // 上传文件
  async uploadFile(file: File): Promise<ApiResponse<UploadTask>> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/upload/file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    return response.json()
  }

  // 获取上传任务状态
  async getUploadTask(taskId: string): Promise<ApiResponse<UploadTask>> {
    return this.request(`/upload/tasks/${taskId}`)
  }

  // 获取解析的题目
  async getParsedQuestions(taskId: string) {
    return this.request(`/upload/tasks/${taskId}/questions`)
  }

  // 批量创建题目
  async createQuestionsBatch(uploadTaskId: string, questionIds: string[]) {
    return this.request('/questions/batch', {
      method: 'POST',
      body: JSON.stringify({ uploadTaskId, questionIds }),
    })
  }

  // 查询题目列表
  async getQuestions(params: any): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/questions?${queryString}`)
  }

  // 获取题目详情
  async getQuestion(id: string): Promise<ApiResponse<Question>> {
    return this.request(`/questions/${id}`)
  }

  // 更新题目
  async updateQuestion(id: string, data: any): Promise<ApiResponse<Question>> {
    return this.request(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // 删除题目
  async deleteQuestion(id: string): Promise<ApiResponse<void>> {
    return this.request(`/questions/${id}`, {
      method: 'DELETE',
    })
  }

  // 获取标签列表
  async getTags(category?: string) {
    const query = category ? `?category=${category}` : ''
    return this.request(`/tags${query}`)
  }

  // AI自动标注
  async autoTag(questionId: string) {
    return this.request(`/questions/${questionId}/auto-tag`, {
      method: 'POST',
    })
  }
}

// 导出单例
export const questionEntryClient = new QuestionEntryClient(
  process.env.NEXT_PUBLIC_QUESTION_ENTRY_API_URL || 'http://localhost:3000/api/v1',
  process.env.QUESTION_ENTRY_API_KEY || ''
)
\`\`\`

### 在日新教育平台中使用

\`\`\`typescript
// app/questions/import/page.tsx
'use client'

import { useState } from 'react'
import { questionEntryClient } from '@/lib/question-entry-client'
import { Button } from '@/components/ui/button'

export default function QuestionImportPage() {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    try {
      // 1. 上传文件
      const uploadResponse = await questionEntryClient.uploadFile(file)
      const taskId = uploadResponse.data.taskId

      // 2. 轮询解析状态
      const checkStatus = async () => {
        const statusResponse = await questionEntryClient.getUploadTask(taskId)
        if (statusResponse.data.status === 'completed') {
          // 3. 获取解析结果
          const questionsResponse = await questionEntryClient.getParsedQuestions(taskId)
          console.log('Parsed questions:', questionsResponse.data)
        } else if (statusResponse.data.status === 'processing') {
          setTimeout(checkStatus, 2000)
        }
      }
      
      checkStatus()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <h1>导入题目</h1>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
        }}
        disabled={isUploading}
      />
    </div>
  )
}
\`\`\`

## 数据同步

### 题目数据同步到日新教育平台

\`\`\`typescript
// 监听题目创建事件
questionEntryClient.on('question:created', async (question) => {
  // 同步到日新教育平台的题库
  await supabase.from('questions').insert({
    id: question.id,
    type: question.type,
    content: question.content,
    // ... 其他字段
  })
})
\`\`\`

### Webhook集成

\`\`\`typescript
// 配置Webhook接收题目更新
// POST /api/webhooks/question-entry
export async function POST(request: Request) {
  const payload = await request.json()
  
  switch (payload.event) {
    case 'question.created':
      // 处理题目创建事件
      await handleQuestionCreated(payload.data)
      break
    case 'question.updated':
      // 处理题目更新事件
      await handleQuestionUpdated(payload.data)
      break
  }
  
  return Response.json({ success: true })
}
\`\`\`

## 权限控制

### 集成日新教育平台的权限系统

\`\`\`typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: Request) {
  const supabase = createServerClient(/* ... */)
  
  // 验证用户身份
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.redirect('/login')
  }
  
  // 检查用户权限
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile.role !== 'teacher' && profile.role !== 'admin') {
    return Response.redirect('/unauthorized')
  }
  
  return NextResponse.next()
}
\`\`\`

## 部署建议

### 独立部署

\`\`\`bash
# 使用Docker部署
docker build -t question-entry-tool .
docker run -p 3001:3000 question-entry-tool
\`\`\`

### Vercel部署

\`\`\`bash
# 部署到Vercel
vercel deploy --prod
\`\`\`

### 环境变量配置

\`\`\`env
# .env.production
NEXT_PUBLIC_QUESTION_ENTRY_API_URL=https://api.rixinedu.com/question-entry
QUESTION_ENTRY_API_KEY=your_api_key_here
DATABASE_URL=postgresql://...
STORAGE_URL=https://storage.example.com
\`\`\`

## 监控和日志

### 集成日志系统

\`\`\`typescript
import { logger } from '@/lib/logger'

// 记录API调用
logger.info('Question created', {
  questionId: question.id,
  userId: user.id,
  timestamp: new Date().toISOString()
})
\`\`\`

### 性能监控

\`\`\`typescript
import { trackEvent } from '@/lib/analytics'

// 追踪关键操作
trackEvent('question_upload', {
  fileSize: file.size,
  fileType: file.type,
  duration: uploadDuration
})
