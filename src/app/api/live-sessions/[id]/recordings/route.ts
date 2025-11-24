/**
 * 录制文件列表 API
 * GET /api/live-sessions/[id]/recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET - 获取会话的所有录制文件列表
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: sessionId } = params;

  try {
    const supabase = createServerClient();

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn('Unauthorized recordings list access attempt', {
        sessionId,
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取所有录制记录
    const { data: recordings, error: fetchError } = await supabase
      .from('live_recordings')
      .select(`
        id,
        session_id,
        title,
        description,
        file_path,
        file_url,
        file_size,
        duration_seconds,
        recorded_by,
        status,
        created_at,
        updated_at
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      logger.error('Failed to fetch recordings list', fetchError, {
        sessionId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch recordings' },
        { status: 500 }
      );
    }

    // 计算总存储大小
    const totalSize = recordings?.reduce(
      (sum, rec) => sum + (rec.file_size || 0),
      0
    ) || 0;

    logger.info('Recordings list fetched', {
      sessionId,
      count: recordings?.length || 0,
      totalSize,
    });

    return NextResponse.json(
      {
        recordings: recordings || [],
        metadata: {
          count: recordings?.length || 0,
          totalSize,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Recordings list fetch error', error, {
      sessionId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
