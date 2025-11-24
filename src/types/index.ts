/**
 * 类型定义统一导出
 * 中央化的类型管理，提供类型安全的 API
 */

// API 响应类型
export type {
  ApiResponse,
  ApiError,
  SupabaseResponse,
  SupabaseError,
  PaginatedResponse,
  PaginationMeta,
  ApiRequestConfig,
} from './api'

// 数据库实体类型
export type {
  // 枚举类型
  UserRole,
  QuestionType,
  QuestionDifficulty,
  AssignmentStatus,
  LiveProvider,
  LiveSessionStatus,
  ExportTaskStatus,

  // 实体接口
  Profile,
  Class,
  Question,
  Paper,
  Assignment,
  Submission,
  LiveSession,
  LiveChatMessage,
  ExportTask,

  // 工具类型
  TableName,
  TableType,
} from './database'

// 错误处理类型从 lib/errors 导出
export {
  ErrorLevel,
  ErrorCategory,
  BaseAppError,
  NetworkError,
  AuthError,
  PermissionError,
  ValidationError,
  NotFoundError,
  ServerError,
  toAppError,
  handleApiError,
  handleError,
  withErrorHandling,
  withRetry,
} from '../lib/errors'

export type { AppError, ErrorHandlerConfig } from '../lib/errors'
