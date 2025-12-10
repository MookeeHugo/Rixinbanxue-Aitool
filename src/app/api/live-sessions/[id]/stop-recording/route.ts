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
  const rate = checkRateLimit(`stop-recording:${clientId}`, { limit: 10, windowMs: 60_000 });
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
      logger.warn('Unauthorized stop recording attempt', { sessionId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session, error: sessionError } = await withTimeout(
      supabase
        .from('live_sessions')
        .select('id, created_by')
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

    let recordingId: string | undefined;
    try {
      const body = await req.json();
      recordingId = body.recordingId;
    } catch {
      // ignore parsing error, recordingId remains undefined
    }

    const livekit = new LiveKitAdapter();

    try {
      await withTimeout(
        livekit.stopRecording({
          sessionId: session.id,
          recordingId,
        }),
        15_000,
        'LiveKit 录制停止超时'
      );

      logger.info('Recording stopped successfully', {
        sessionId,
        recordingId,
        userId: user.id,
      });

      broadcastRecordingStatus(sessionId, {
        isRecording: false,
        recordingId: null,
        startedAt: null,
        egressId: null,
      });

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
