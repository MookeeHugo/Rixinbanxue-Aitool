import { createClient } from '@supabase/supabase-js'

// Supabase 客户端配置
// 临时硬编码本地 Supabase 配置以解决环境变量缓存问题
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// 原始代码（环境变量方式）- 暂时注释
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//
// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error('Missing Supabase environment variables')
// }

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库类型定义
export type UserRole = 'teacher' | 'student'

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Class {
  id: string
  name: string
  grade: string
  teacher_id: string
  class_code: string
  created_at: string
}

export interface Question {
  id: string
  type: 'choice' | 'fill' | 'essay'
  content: string
  options?: string[] // JSON
  answer: string
  analysis_content?: string | null
  analysis?: string | null
  knowledge_points: string[]
  difficulty: 'easy' | 'medium' | 'hard'
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

export interface Paper {
  id: string
  name: string
  question_ids: string[]
  created_by: string
  created_at: string
}

export interface Assignment {
  id: string
  class_id: string
  paper_id: string
  deadline: string
  status: 'draft' | 'published' | 'closed'
  created_by: string
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  answers: Record<string, any> // JSON
  score?: number
  submitted_at: string
}

export type LiveProvider = 'zego' | 'livekit'
export type LiveSessionStatus = 'pending' | 'live' | 'ended' | 'failed'

export interface LiveSession {
  id: string
  title: string
  provider: LiveProvider
  status: LiveSessionStatus
  scheduled_at?: string
  duration_min?: number
  record_on_start?: boolean
  room_id?: string
  created_by: string
  created_at: string
  updated_at: string
}
