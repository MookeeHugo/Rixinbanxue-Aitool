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
import { withTimeout } from '@/lib/utils/timeout';
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit';

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

  const clientId = getClientId(req);
  const rate = checkRateLimit(`start-recording:${clientId}`, { limit: 10, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
    );
  }

  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await withTimeout(supabase.auth.getUser(), 10_000, 'Supabase 请求超时');

    if (userError || !user) {
      logger.warn('Unauthorized start recording attempt', { sessionId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session, error: sessionError } = await withTimeout(
      supabase
        .from('live_sessions')
        .select('id, title, created_by, room_id, status')
        .eq('id', sessionId)
        .single(),
      10_000,
      'Supabase 请求超时'
    );

    if (sessionError || !session) {
      logger.error('Failed to fetch session', sessionError, { sessionId });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

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

    const quotaManager = createQuotaManager();
    const estimatedSize = 500 * 1024 * 1024; // 500 MB

    const quotaCheck = await withTimeout(
      quotaManager.checkAllQuotas(user.id, sessionId, estimatedSize),
      10_000,
      'Quota check timeout'
    );

    if (!quotaCheck.allowed) {
      logger.warn('Storage quota exceeded', {
        sessionId,
        userId: user.id,
        reason: quotaCheck.reason,
      });
      return NextResponse.json(
        { error: quotaCheck.reason || 'Storage quota exceeded' },
        { status: 413 }
      );
    }

    const livekit = new LiveKitAdapter();

    try {
      const result = await withTimeout(
        livekit.startRecording({
          sessionId: session.id,
          roomId: session.room_id,
          userId: user.id,
        }),
        15_000,
        'LiveKit 录制启动超时'
      );

      logger.info('Recording started successfully', {
        sessionId,
        recordingId: result.recordingId,
        userId: user.id,
      });

      broadcastRecordingStatus(sessionId, {
        isRecording: true,
        recordingId: result.recordingId,
        startedAt: new Date().toISOString(),
        egressId: result.egressId,
      });

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
