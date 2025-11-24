/**
 * 停止服务端录制 API
 * POST /api/live-sessions/[id]/stop-recording
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { LiveKitAdapter } from '@/lib/live/providers/livekit';
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
      logger.warn('Unauthorized stop recording attempt', { sessionId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取会话信息
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, created_by')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.error('Failed to fetch session', sessionError, { sessionId });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // 验证权限：只有会话创建者可以停止录制
    if (session.created_by !== user.id) {
      logger.warn('User not authorized to stop recording', {
        sessionId,
        userId: user.id,
        createdBy: session.created_by,
      });
      return NextResponse.json(
        { error: 'Forbidden: Only session creator can stop recording' },
        { status: 403 }
      );
    }

    // 解析请求体（可选 recordingId）
    let recordingId: string | undefined;
    try {
      const body = await req.json();
      recordingId = body.recordingId;
    } catch {
      // 如果请求体为空或无效，recordingId 将保持 undefined
    }

    // 初始化 LiveKit 适配器
    const livekit = new LiveKitAdapter();

    try {
      // 停止录制
      await livekit.stopRecording({
        sessionId: session.id,
        recordingId,
      });

      logger.info('Recording stopped successfully', {
        sessionId,
        recordingId,
        userId: user.id,
      });

      // Broadcast status update to all connected SSE clients
      broadcastRecordingStatus(sessionId, {
        isRecording: false,
        recordingId: null,
        startedAt: null,
        egressId: null,
      });

      // Track performance metrics
      const duration = Date.now() - startTime;
      performanceMonitor.trackAPIResponseTime('stopRecording', duration);
      performanceMonitor.trackRecording('stop');

      return NextResponse.json(
        {
          success: true,
          message: 'Recording stopped successfully',
        },
        { status: 200 }
      );
    } catch (recordingError: any) {
      logger.error('LiveKit recording stop failed', recordingError, {
        sessionId,
        recordingId,
      });

      return NextResponse.json(
        { error: `Failed to stop recording: ${recordingError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Stop recording error', error, { sessionId });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
