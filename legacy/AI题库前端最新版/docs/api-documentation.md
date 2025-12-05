# API 接口文档

## 基础信息

- **Base URL**: `/api/v1`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON

## 通用响应格式

### 成功响应
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

### 错误响应
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
\`\`\`

## 1. 文件上传相关

### 1.1 上传文件

**POST** `/upload/file`

上传题目文件（PDF、Word、图片等）。

**请求**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: 文件对象

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "fileName": "试卷.pdf",
    "fileUrl": "https://storage.example.com/...",
    "status": "pending"
  }
}
\`\`\`

### 1.2 获取上传任务状态

**GET** `/upload/tasks/{taskId}`

查询文件解析进度。

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fileName": "试卷.pdf",
    "status": "processing",
    "progress": 65,
    "totalQuestions": 10,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
\`\`\`

### 1.3 获取解析结果

**GET** `/upload/tasks/{taskId}/questions`

获取解析出的题目列表。

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "questions": [
      {
        "id": "uuid",
        "type": "choice",
        "content": "题目内容...",
        "options": ["A. 选项1", "B. 选项2"],
        "answer": "A",
        "confidenceScore": 0.95,
        "isSelected": true
      }
    ]
  }
}
\`\`\`

### 1.4 更新题目选择状态

**PATCH** `/upload/tasks/{taskId}/questions/{questionId}`

选择或取消选择解析出的题目。

**请求**
\`\`\`json
{
  "isSelected": true
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isSelected": true
  }
}
\`\`\`

## 2. 题目管理

### 2.1 创建题目

**POST** `/questions`

将解析的题目正式收录到题库。

**请求**
\`\`\`json
{
  "type": "choice",
  "content": "题目内容...",
  "options": ["A. 选项1", "B. 选项2"],
  "answer": "A",
  "explanation": "解析内容...",
  "difficulty": "medium",
  "source": "高考真题",
  "year": 2024,
  "tagIds": ["uuid1", "uuid2"],
  "imageUrls": ["https://..."]
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "choice",
    "content": "题目内容...",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
\`\`\`

### 2.2 批量创建题目

**POST** `/questions/batch`

批量提交解析的题目到题库。

**请求**
\`\`\`json
{
  "uploadTaskId": "uuid",
  "questionIds": ["uuid1", "uuid2", "uuid3"]
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "created": 3,
    "questionIds": ["uuid1", "uuid2", "uuid3"]
  }
}
\`\`\`

### 2.3 查询题目列表

**GET** `/questions`

分页查询题库中的题目。

**查询参数**
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `search`: 搜索关键词
- `type`: 题目类型（choice/fill/solve）
- `difficulty`: 难度（easy/medium/hard）
- `tagIds`: 标签ID列表（逗号分隔）
- `sortBy`: 排序字段（createdAt/updatedAt）
- `sortOrder`: 排序方向（asc/desc）

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "type": "choice",
        "content": "题目内容...",
        "tags": [
          {
            "id": "uuid",
            "category": "knowledge",
            "value": "集合"
          }
        ],
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
\`\`\`

### 2.4 获取题目详情

**GET** `/questions/{id}`

获取单个题目的完整信息。

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "choice",
    "content": "题目内容...",
    "options": ["A. 选项1", "B. 选项2"],
    "answer": "A",
    "explanation": "解析内容...",
    "difficulty": "medium",
    "tags": [...],
    "images": [...],
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
\`\`\`

### 2.5 更新题目

**PUT** `/questions/{id}`

更新题目信息。

**请求**
\`\`\`json
{
  "content": "更新后的题目内容...",
  "answer": "B",
  "difficulty": "hard",
  "tagIds": ["uuid1", "uuid2"]
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
\`\`\`

### 2.6 删除题目

**DELETE** `/questions/{id}`

软删除题目。

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deletedAt": "2024-01-15T11:00:00Z"
  }
}
\`\`\`

### 2.7 批量删除题目

**DELETE** `/questions/batch`

批量删除题目。

**请求**
\`\`\`json
{
  "questionIds": ["uuid1", "uuid2", "uuid3"]
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "deleted": 3
  }
}
\`\`\`

## 3. 标签管理

### 3.1 获取标签列表

**GET** `/tags`

获取所有标签，支持按分类筛选。

**查询参数**
- `category`: 标签分类（knowledge/difficulty/grade/source/custom）
- `sortBy`: 排序方式（usageCount/createdAt）

**响应**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "knowledge",
      "value": "集合",
      "usageCount": 25,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
\`\`\`

### 3.2 创建标签

**POST** `/tags`

创建新标签。

**请求**
\`\`\`json
{
  "category": "knowledge",
  "value": "复数",
  "description": "复数相关知识点"
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category": "knowledge",
    "value": "复数",
    "usageCount": 0
  }
}
\`\`\`

### 3.3 为题目添加标签

**POST** `/questions/{questionId}/tags`

为题目添加标签。

**请求**
\`\`\`json
{
  "tagIds": ["uuid1", "uuid2"]
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "questionId": "uuid",
    "tags": [...]
  }
}
\`\`\`

### 3.4 AI自动标注

**POST** `/questions/{questionId}/auto-tag`

使用AI为题目自动生成标签。

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "questionId": "uuid",
    "suggestedTags": [
      {
        "category": "knowledge",
        "value": "集合",
        "confidence": 0.95
      }
    ]
  }
}
\`\`\`

## 4. 统计分析

### 4.1 获取题库统计

**GET** `/statistics/overview`

获取题库整体统计信息。

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "totalQuestions": 150,
    "weeklyNew": 12,
    "byType": {
      "choice": 80,
      "fill": 40,
      "solve": 30
    },
    "byDifficulty": {
      "easy": 50,
      "medium": 70,
      "hard": 30
    }
  }
}
\`\`\`

## 5. 导出功能

### 5.1 导出题目

**POST** `/export/questions`

导出选中的题目为文件。

**请求**
\`\`\`json
{
  "questionIds": ["uuid1", "uuid2"],
  "format": "pdf",
  "options": {
    "includeAnswer": true,
    "includeExplanation": true
  }
}
\`\`\`

**响应**
\`\`\`json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.example.com/export-xxx.pdf",
    "expiresAt": "2024-01-15T12:00:00Z"
  }
}
\`\`\`

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| `INVALID_REQUEST` | 请求参数错误 |
| `UNAUTHORIZED` | 未授权 |
| `FORBIDDEN` | 无权限 |
| `NOT_FOUND` | 资源不存在 |
| `FILE_TOO_LARGE` | 文件过大 |
| `UNSUPPORTED_FILE_TYPE` | 不支持的文件类型 |
| `PARSE_FAILED` | 文件解析失败 |
| `DUPLICATE_TAG` | 标签重复 |
| `INTERNAL_ERROR` | 服务器内部错误 |

## 接口调用示例

### 完整流程示例

\`\`\`typescript
// 1. 上传文件
const uploadResponse = await fetch('/api/v1/upload/file', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
})
const { taskId } = uploadResponse.data

// 2. 轮询解析状态
const checkStatus = async () => {
  const statusResponse = await fetch(`/api/v1/upload/tasks/${taskId}`)
  return statusResponse.data
}

// 3. 获取解析结果
const questionsResponse = await fetch(`/api/v1/upload/tasks/${taskId}/questions`)
const parsedQuestions = questionsResponse.data.questions

// 4. 批量提交到题库
const submitResponse = await fetch('/api/v1/questions/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    uploadTaskId: taskId,
    questionIds: parsedQuestions.map(q => q.id)
  })
})
