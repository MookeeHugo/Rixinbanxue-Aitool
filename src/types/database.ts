/**
 * 数据库类型定义
 * 基于 Supabase schema，提供更严格的类型
 */

/**
 * 用户角色类型
 */
export type UserRole = 'teacher' | 'student'

/**
 * 题目类型
 */
export type QuestionType = 'choice' | 'fill' | 'essay'

/**
 * 题目难度
 */
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

/**
 * 作业状态
 */
export type AssignmentStatus = 'draft' | 'published' | 'closed'

/**
 * 直播提供商
 */
export type LiveProvider = 'zego' | 'livekit'

/**
 * 直播会话状态
 */
export type LiveSessionStatus = 'pending' | 'live' | 'ended' | 'failed'

/**
 * 导出任务状态
 */
export type ExportTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/**
 * 用户 Profile
 */
export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at?: string
}

/**
 * 班级
 */
export interface Class {
  id: string
  name: string
  grade: string
  teacher_id: string
  class_code: string
  created_at: string
  updated_at?: string
}

/**
 * 题目
 */
export interface Question {
  id: string
  type: QuestionType
  content: string
  options?: string[]
  answer: string
  analysis_content?: string | null
  analysis?: string | null
  knowledge_points: string[]
  difficulty: QuestionDifficulty
  province?: string | null
  year?: number | null
  source?: string | null
  tags?: string[]
  image_url?: string | null
  image_key?: string | null
  is_public?: boolean
  created_by: string
  created_at: string
  updated_at?: string
}

/**
 * 试卷
 */
export interface Paper {
  id: string
  name: string
  question_ids: string[]
  created_by: string
  created_at: string
  updated_at?: string
}

/**
 * 作业
 */
export interface Assignment {
  id: string
  class_id: string
  paper_id: string
  deadline: string
  status: AssignmentStatus
  created_by: string
  created_at: string
  updated_at?: string
}

/**
 * 学生提交
 */
export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  answers: Record<string, unknown>
  score?: number | null
  submitted_at: string
  graded_at?: string | null
}

/**
 * 直播会话
 */
export interface LiveSession {
  id: string
  title: string
  provider: LiveProvider
  status: LiveSessionStatus
  scheduled_at?: string | null
  duration_min?: number | null
  record_on_start?: boolean
  room_id?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * 聊天消息
 */
export interface LiveChatMessage {
  id: string
  session_id: string
  user_id: string
  message: string
  message_type?: string
  created_at: string
}

/**
 * 导出任务
 */
export interface ExportTask {
  id: string
  user_id: string
  template_id: string
  question_ids: string[]
  options?: Record<string, unknown>
  status: ExportTaskStatus
  progress: number
  download_url?: string | null
  error_message?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

/**
 * 数据库表名类型
 */
export type TableName =
  | 'profiles'
  | 'classes'
  | 'questions'
  | 'papers'
  | 'assignments'
  | 'submissions'
  | 'live_sessions'
  | 'live_chat_messages'
  | 'export_tasks'

/**
 * 根据表名获取对应的类型
 */
export type TableType<T extends TableName> = T extends 'profiles'
  ? Profile
  : T extends 'classes'
  ? Class
  : T extends 'questions'
  ? Question
  : T extends 'papers'
  ? Paper
  : T extends 'assignments'
  ? Assignment
  : T extends 'submissions'
  ? Submission
  : T extends 'live_sessions'
  ? LiveSession
  : T extends 'live_chat_messages'
  ? LiveChatMessage
  : T extends 'export_tasks'
  ? ExportTask
  : never

/**
 * Supabase Database schema 类型占位，兼容任意表结构
 */
export type Database = any
