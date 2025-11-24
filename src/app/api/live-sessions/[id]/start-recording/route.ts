/**
 * 开始服务端录制 API
 * POST /api/live-sessions/[id]/start-recording
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { LiveKitAdapter } from '@/lib/live/providers/livekit';
import { createQuotaManager } from '@/lib/storage/quota';
import { logger } from '@/lib/logger';
import { broadcastRecordingStatus } from '../recording-status/stream/route';
import { performanceMonitor } from '@/lib/performance-monitor';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  const sessionId = params.id;

  try {
    const supabase = createServerClient();

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn('Unauthorized start recording attempt', { sessionId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取会话信息
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, title, created_by, room_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.error('Failed to fetch session', sessionError, { sessionId });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // 验证权限：只有会话创建者可以开始录制
    if (session.created_by !== user.id) {
      logger.warn('User not authorized to start recording', {
        sessionId,
        userId: user.id,
        createdBy: session.created_by,
      });
      return NextResponse.json(
        { error: 'Forbidden: Only session creator can start recording' },
        { status: 403 }
      );
    }

    // 检查会话状态
    if (session.status !== 'live' && session.status !== 'scheduled') {
      logger.warn('Cannot start recording for session not in live/scheduled status', {
        sessionId,
        status: session.status,
      });
      return NextResponse.json(
        { error: `Cannot start recording for session with status: ${session.status}` },
        { status: 400 }
      );
    }

    // 检查存储配额
    const quotaManager = createQuotaManager();

    // 预估文件大小（假设录制 1 小时 = ~500MB）
    const estimatedSize = 500 * 1024 * 1024; // 500 MB

    const quotaCheck = await quotaManager.checkAllQuotas(
      user.id,
      sessionId,
      estimatedSize
    );

    if (!quotaCheck.allowed) {
      logger.warn('Storage quota exceeded', {
        sessionId,
        userId: user.id,
        reason: quotaCheck.reason,
      });
      return NextResponse.json(
        { error: quotaCheck.reason || 'Storage quota exceeded' },
        { status: 413 } // Payload Too Large
      );
    }

    // 初始化 LiveKit 适配器
    const livekit = new LiveKitAdapter();

    try {
      // 开始录制
      const result = await livekit.startRecording({
        sessionId: session.id,
        roomId: session.room_id,
        userId: user.id,
      });

      logger.info('Recording started successfully', {
        sessionId,
        recordingId: result.recordingId,
        userId: user.id,
      });

      // Broadcast status update to all connected SSE clients
      broadcastRecordingStatus(sessionId, {
        isRecording: true,
        recordingId: result.recordingId,
        startedAt: new Date().toISOString(),
        egressId: result.egressId,
      });

      // Track performance metrics
      const duration = Date.now() - startTime;
      performanceMonitor.trackAPIResponseTime('startRecording', duration);
      performanceMonitor.trackRecording('start');

      return NextResponse.json(
        {
          success: true,
          recordingId: result.recordingId,
          message: 'Recording started successfully',
        },
        { status: 200 }
      );
    } catch (recordingError: any) {
      logger.error('LiveKit recording start failed', recordingError, {
        sessionId,
        roomId: session.room_id,
      });

      return NextResponse.json(
        { error: `Failed to start recording: ${recordingError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Start recording error', error, { sessionId });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
