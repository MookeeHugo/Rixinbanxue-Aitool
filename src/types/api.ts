/**
 * API 通用类型定义
 * 用于替换 any 类型，提供类型安全
 */

/**
 * 通用 API 响应类型
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
  message?: string
  success?: boolean
}

/**
 * API 错误类型
 */
export interface ApiError {
  message: string
  code?: string
  details?: string
  hint?: string
  statusCode?: number
}

/**
 * Supabase 查询响应类型
 */
export interface SupabaseResponse<T = unknown> {
  data: T | null
  error: SupabaseError | null
  count?: number | null
  status?: number
  statusText?: string
}

/**
 * Supabase 错误类型
 */
export interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

/**
 * 分页参数类型
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  offset?: number
  limit?: number
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T = unknown> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 排序参数类型
 */
export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}

/**
 * 筛选参数类型
 */
export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * 请求配置类型
 */
export interface RequestConfig {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

/**
 * Next.js Fetch 配置类型
 */
export interface NextFetchRequestConfig {
  revalidate?: number | false
  tags?: string[]
}
