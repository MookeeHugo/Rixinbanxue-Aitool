// Supabase持久化存储 - 替代内存存储
import { createClient } from '@supabase/supabase-js'
import type { LiveProvider, LiveSession } from "@/lib/supabase";
import { logger } from '@/lib/logger';

export type SessionRecord = {
  id: string;
  title: string;
  provider: LiveProvider;
  status: "pending" | "live" | "ended" | "failed";
  scheduledAt?: string;
  durationMin?: number;
  recordOnStart?: boolean;
  roomId?: string;
  createdAt: string;
  createdBy?: string;
};

// Lazy initialization for Supabase admin client
let supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for live sessions storage')
  }
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseAdmin
}

// 转换数据库记录到API格式
function dbToSessionRecord(dbSession: LiveSession): SessionRecord {
  return {
    id: dbSession.id,
    title: dbSession.title,
    provider: dbSession.provider,
    status: dbSession.status,
    scheduledAt: dbSession.scheduled_at,
    durationMin: dbSession.duration_min,
    recordOnStart: dbSession.record_on_start,
    roomId: dbSession.room_id,
    createdAt: dbSession.created_at,
    createdBy: dbSession.created_by,
  };
}

// 转换API格式到数据库记录
function sessionRecordToDb(s: SessionRecord): Partial<LiveSession> {
  return {
    id: s.id,
    title: s.title,
    provider: s.provider,
    status: s.status,
    scheduled_at: s.scheduledAt,
    duration_min: s.durationMin,
    record_on_start: s.recordOnStart,
    room_id: s.roomId,
    created_by: s.createdBy!,
  };
}

export async function listSessions(): Promise<SessionRecord[]> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('live_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error listing live sessions:', { error: error })
      return []
    }

    return (data as LiveSession[]).map(dbToSessionRecord)
  } catch (error) {
    logger.error('Failed to list live sessions:', { error: error })
    return []
  }
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      logger.error('Error getting live session:', { error: error })
      return undefined
    }

    return dbToSessionRecord(data as LiveSession)
  } catch (error) {
    logger.error('Failed to get live session:', { error: error })
    return undefined
  }
}

export async function saveSession(s: SessionRecord): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const dbRecord = sessionRecordToDb(s)

    // Upsert: insert if new, update if exists
    // Type assertion needed as Supabase client doesn't have generated types for live_sessions table
    const { error } = await (admin
      .from('live_sessions') as any)
      .upsert(dbRecord, { onConflict: 'id' })

    if (error) {
      logger.error('Error saving live session:', { error: error })
      throw error
    }
  } catch (error) {
    logger.error('Failed to save live session:', { error: error })
    throw error
  }
}
