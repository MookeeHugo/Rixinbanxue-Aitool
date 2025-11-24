import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

// Supabase 客户端配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-auth',
  },
})

async function syncServerSessionCookies(session: Session | null) {
  if (typeof window === 'undefined') return
  if (!session?.access_token || !session.refresh_token || !session.expires_at) {
    return
  }

  try {
    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      }),
    })
  } catch (error) {
    console.error('[supabase] Failed to sync session cookie', error)
  }
}

async function clearServerSessionCookies() {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/auth/clear-session', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('[supabase] Failed to clear session cookie', error)
  }
}

let hasBoundAuthListener = false
if (typeof window !== 'undefined' && !hasBoundAuthListener) {
  hasBoundAuthListener = true

  // 首次加载时尝试同步，避免 cookie 仍然是旧 token
  supabase.auth
    .getSession()
    .then(({ data }) => {
      if (data.session) {
        syncServerSessionCookies(data.session)
      }
    })
    .catch((error) => {
      console.error('[supabase] Failed to read initial session', error)
    })

  supabase.auth.onAuthStateChange((event, session) => {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        syncServerSessionCookies(session)
        break
      case 'SIGNED_OUT':
        clearServerSessionCookies()
        break
      default:
        break
    }
  })
}

// Re-export createClient for components and server actions
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sb-auth',
    },
  })
}

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
