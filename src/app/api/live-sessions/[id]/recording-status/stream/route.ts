/**
 * SSE (Server-Sent Events) endpoint for real-time recording status updates
 * GET /api/live-sessions/[id]/recording-status/stream
 *
 * This endpoint maintains an open connection and pushes updates when recording status changes.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/lib/performance-monitor';

interface RouteParams {
  params: {
    id: string;
  };
}

// Keep track of active SSE connections per session
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>();

// Helper to broadcast status updates to all connected clients for a session
export function broadcastRecordingStatus(sessionId: string, status: unknown) {
  const connections = activeConnections.get(sessionId);
  if (!connections || connections.size === 0) return;

  const data = JSON.stringify(status);
  const message = `data: ${data}\n\n`;

  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      logger.error('Failed to write to SSE stream', { error });
      connections.delete(controller);
    }
  });
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const sessionId = params.id;

  try {
    const supabase = createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify session exists and user has access
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, created_by, title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response('Session not found', { status: 404 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start: async (controller) => {
        // Register this connection
        if (!activeConnections.has(sessionId)) {
          activeConnections.set(sessionId, new Set());
        }
        activeConnections.get(sessionId)!.add(controller);

        // Track performance metric
        performanceMonitor.trackSSEConnection(sessionId, 'connect');

        logger.info('SSE connection established', {
          sessionId,
          userId: user.id,
          activeConnectionsCount: activeConnections.get(sessionId)!.size,
        });

        // Send initial status
        try {
          const { data: recordings } = await supabase
            .from('live_recordings')
            .select('id, status, started_at, ended_at, egress_id')
            .eq('session_id', sessionId)
            .eq('status', 'recording')
            .order('started_at', { ascending: false })
            .limit(1);

          const recording = recordings && recordings.length > 0 ? recordings[0] : null;

          const initialStatus = {
            isRecording: !!recording,
            recordingId: recording?.id || null,
            startedAt: recording?.started_at || null,
            egressId: recording?.egress_id || null,
          };

          const initialMessage = `data: ${JSON.stringify(initialStatus)}\n\n`;
          controller.enqueue(new TextEncoder().encode(initialMessage));
        } catch (error) {
          logger.error('Failed to fetch initial recording status', error);
        }

        // Send keepalive every 30 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
          } catch (error) {
            clearInterval(keepaliveInterval);
          }
        }, 30000);

        // Cleanup on connection close
        req.signal.addEventListener('abort', () => {
          clearInterval(keepaliveInterval);

          const connections = activeConnections.get(sessionId);
          if (connections) {
            connections.delete(controller);
            if (connections.size === 0) {
              activeConnections.delete(sessionId);
            }
          }

          // Track performance metric
          performanceMonitor.trackSSEConnection(sessionId, 'disconnect');

          logger.info('SSE connection closed', {
            sessionId,
            userId: user.id,
            remainingConnections: connections?.size || 0,
          });

          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    logger.error('SSE endpoint error', error, { sessionId });
    return new Response('Internal server error', { status: 500 });
  }
}
