/**
 * 录制文件管理 API
 * DELETE /api/live-sessions/[id]/recordings/[recordingId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { logger } from '@/lib/logger';
import { AppError, ErrorCategory } from '@/lib/errors';

interface RouteParams {
  params: {
    id: string;
    recordingId: string;
  };
}

/**
 * DELETE - 删除录制文件
 * 1. 验证用户权限（仅创建者可删除）
 * 2. 从 Supabase Storage 删除文件
 * 3. 从数据库删除记录
 */
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: sessionId, recordingId } = params;

  try {
    const supabase = createServerClient();

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn('Unauthorized recording deletion attempt', {
        sessionId,
        recordingId,
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取录制记录（包含权限检查）
    const { data: recording, error: fetchError } = await supabase
      .from('live_recordings')
      .select('id, session_id, file_path, recorded_by')
      .eq('id', recordingId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Failed to fetch recording', fetchError, {
        sessionId,
        recordingId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: 500 }
      );
    }

    if (!recording) {
      logger.warn('Recording not found', {
        sessionId,
        recordingId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // 验证权限：只有录制创建者可以删除
    if (recording.recorded_by !== user.id) {
      logger.warn('User not authorized to delete recording', {
        sessionId,
        recordingId,
        userId: user.id,
        recordedBy: recording.recorded_by,
      });
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this recording' },
        { status: 403 }
      );
    }

    // 从 Supabase Storage 删除文件
    // 假设文件存储在 'recordings' bucket 中
    if (recording.file_path) {
      const { error: storageError } = await supabase.storage
        .from('recordings')
        .remove([recording.file_path]);

      if (storageError) {
        logger.error('Failed to delete recording file from storage', storageError, {
          sessionId,
          recordingId,
          filePath: recording.file_path,
        });
        // 继续删除数据库记录，即使存储文件删除失败
        // 这样可以避免孤立的数据库记录
      } else {
        logger.info('Recording file deleted from storage', {
          sessionId,
          recordingId,
          filePath: recording.file_path,
        });
      }
    }

    // 从数据库删除记录（RLS 策略会自动验证权限）
    const { error: deleteError } = await supabase
      .from('live_recordings')
      .delete()
      .eq('id', recordingId)
      .eq('session_id', sessionId);

    if (deleteError) {
      logger.error('Failed to delete recording from database', deleteError, {
        sessionId,
        recordingId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to delete recording' },
        { status: 500 }
      );
    }

    logger.info('Recording deleted successfully', {
      sessionId,
      recordingId,
      userId: user.id,
    });

    return NextResponse.json(
      { success: true, message: 'Recording deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Recording deletion error', error, {
      sessionId,
      recordingId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取单个录制文件详情
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: sessionId, recordingId } = params;

  try {
    const supabase = createServerClient();

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取录制记录
    const { data: recording, error: fetchError } = await supabase
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
      .eq('id', recordingId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Failed to fetch recording', fetchError, {
        sessionId,
        recordingId,
      });
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: 500 }
      );
    }

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ recording }, { status: 200 });
  } catch (error: any) {
    logger.error('Recording fetch error', error, {
      sessionId,
      recordingId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
