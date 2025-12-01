/**
 * 题目类型定义
 */

// 题目类型枚举
export type QuestionType = 'choice' | 'fill' | 'solve'

// 难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

// 标签分类
export type TagCategory = 'knowledge' | 'difficulty' | 'grade' | 'source' | 'custom'

// 上传任务状态
export type UploadTaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * 标签接口
 */
export interface Tag {
  id: string
  category: TagCategory
  value: string
  description?: string
  usageCount: number
  createdAt: string
}

/**
 * 题目图片接口
 */
export interface QuestionImage {
  id: string
  questionId: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  position: number
  createdAt: string
}

/**
 * 题目接口
 */
export interface Question {
  id: string
  type: QuestionType
  content: string
  options?: string[] // 选择题选项
  answer: string
  explanation?: string // 题目解析
  difficulty?: DifficultyLevel
  source?: string
  year?: number
  tags: Tag[]
  images: QuestionImage[]
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * 解析后的题目（临时）
 */
export interface ParsedQuestion {
  id: string
  uploadTaskId: string
  type: QuestionType
  content: string
  options?: string[]
  answer: string
  confidenceScore?: number // AI解析置信度
  isSelected: boolean
  isSubmitted: boolean
  questionId?: string
  createdAt: string
  hasImage?: boolean
  imageUrl?: string
}

/**
 * 上传任务接口
 */
export interface UploadTask {
  id: string
  userId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  status: UploadTaskStatus
  progress: number
  totalQuestions: number
  errorMessage?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

/**
 * 题目创建请求
 */
export interface CreateQuestionRequest {
  type: QuestionType
  content: string
  options?: string[]
  answer: string
  explanation?: string
  difficulty?: DifficultyLevel
  source?: string
  year?: number
  tagIds: string[]
  imageUrls?: string[]
}

/**
 * 题目更新请求
 */
export interface UpdateQuestionRequest {
  content?: string
  options?: string[]
  answer?: string
  explanation?: string
  difficulty?: DifficultyLevel
  source?: string
  year?: number
  tagIds?: string[]
}

/**
 * 题目查询参数
 */
export interface QuestionQueryParams {
  page?: number
  pageSize?: number
  search?: string // 搜索关键词
  type?: QuestionType
  difficulty?: DifficultyLevel
  tagIds?: string[] // 标签ID列表
  grade?: string
  source?: string
  yearFrom?: number
  yearTo?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'difficulty'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * API响应
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
