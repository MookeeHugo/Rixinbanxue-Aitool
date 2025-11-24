/**
 * 存储统计 API
 * GET /api/storage/stats
 * 获取当前用户的存储使用情况
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { createQuotaManager } from '@/lib/storage/quota';
import { logger } from '@/lib/logger';

/**
 * GET - 获取用户存储统计信息
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServerClient();

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn('Unauthorized storage stats access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取存储统计
    const quotaManager = createQuotaManager();
    const stats = await quotaManager.getUserStorageStats(user.id);

    if (!stats) {
      logger.error('Failed to fetch storage stats', undefined, {
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch storage stats' },
        { status: 500 }
      );
    }

    logger.info('Storage stats fetched successfully', {
      userId: user.id,
      usagePercentage: stats.usagePercentage,
    });

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error: any) {
    logger.error('Storage stats error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
