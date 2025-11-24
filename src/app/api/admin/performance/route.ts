/**
 * Performance Metrics API
 * GET /api/admin/performance
 *
 * Returns current performance metrics including:
 * - SSE connection counts
 * - API response times
 * - Active recording sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { performanceMonitor } from '@/lib/performance-monitor';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Check if user is admin
    // For now, any authenticated user can view metrics
    // TODO: Add admin role check

    // Get performance metrics summary
    const summary = performanceMonitor.getMetricsSummary();

    logger.info('Performance metrics requested', {
      userId: user.id,
      metrics: summary,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: summary,
    });
  } catch (error: any) {
    logger.error('Failed to fetch performance metrics', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Reset performance metrics (admin only)
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check
    // For now, any authenticated user can reset metrics

    performanceMonitor.reset();

    logger.info('Performance metrics reset', {
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Performance metrics reset successfully',
    });
  } catch (error: any) {
    logger.error('Failed to reset performance metrics', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
