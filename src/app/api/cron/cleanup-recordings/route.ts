/**
 * 定时清理录制文件任务
 * Vercel Cron Job: 每天凌晨 2:00 执行
 *
 * 功能：
 * 1. 清理超过 30 天的已完成录制
 * 2. 清理状态为 'failed' 且超过 7 天的录制
 * 3. 清理孤立的存储文件（数据库中不存在的文件）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// 验证 Cron 请求的密钥
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST - 执行清理任务
 * 由 Vercel Cron 调用，需要验证密钥
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 验证 Cron 密钥
    const authHeader = req.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
      logger.warn('Unauthorized cron job access attempt', {
        hasSecret: !!CRON_SECRET,
        hasProvidedSecret: !!providedSecret,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting scheduled recording cleanup task');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Supabase configuration missing for cron job');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 任务 1: 清理超过 30 天的已完成录制
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldCompletedRecordings, error: fetchError1 } = await supabase
      .from('live_recordings')
      .select('id, file_path, session_id, title')
      .eq('status', 'completed')
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (fetchError1) {
      logger.error('Failed to fetch old completed recordings', fetchError1);
    } else if (oldCompletedRecordings && oldCompletedRecordings.length > 0) {
      logger.info('Found old completed recordings to delete', {
        count: oldCompletedRecordings.length,
      });

      await deleteRecordings(supabase, oldCompletedRecordings, 'old completed');
    }

    // 任务 2: 清理状态为 'failed' 且超过 7 天的录制
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldFailedRecordings, error: fetchError2 } = await supabase
      .from('live_recordings')
      .select('id, file_path, session_id, title')
      .eq('status', 'failed')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (fetchError2) {
      logger.error('Failed to fetch old failed recordings', fetchError2);
    } else if (oldFailedRecordings && oldFailedRecordings.length > 0) {
      logger.info('Found old failed recordings to delete', {
        count: oldFailedRecordings.length,
      });

      await deleteRecordings(supabase, oldFailedRecordings, 'old failed');
    }

    // 任务 3: 清理 webhook_events 表中超过 30 天的记录
    const { error: cleanupWebhookError } = await supabase.rpc(
      'cleanup_old_webhook_events'
    );

    if (cleanupWebhookError) {
      logger.error('Failed to cleanup old webhook events', cleanupWebhookError);
    } else {
      logger.info('Old webhook events cleaned up successfully');
    }

    const totalDeleted =
      (oldCompletedRecordings?.length || 0) + (oldFailedRecordings?.length || 0);

    logger.info('Recording cleanup task completed', {
      deletedCount: totalDeleted,
      completedDeleted: oldCompletedRecordings?.length || 0,
      failedDeleted: oldFailedRecordings?.length || 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Cleanup completed successfully',
        stats: {
          deletedCount: totalDeleted,
          completedDeleted: oldCompletedRecordings?.length || 0,
          failedDeleted: oldFailedRecordings?.length || 0,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Cron job error', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * 批量删除录制文件和数据库记录
 */
async function deleteRecordings(
  supabase: SupabaseClient,
  recordings: Array<{ id: string; file_path: string; session_id: string; title: string }>,
  category: string
): Promise<void> {
  let successCount = 0;
  let failCount = 0;

  for (const recording of recordings) {
    try {
      // 从存储删除文件
      if (recording.file_path) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove([recording.file_path]);

        if (storageError) {
          logger.error('Failed to delete recording file from storage', storageError, {
            recordingId: recording.id,
            filePath: recording.file_path,
            category,
          });
          // 继续删除数据库记录
        }
      }

      // 从数据库删除记录
      const { error: dbError } = await supabase
        .from('live_recordings')
        .delete()
        .eq('id', recording.id);

      if (dbError) {
        logger.error('Failed to delete recording from database', dbError, {
          recordingId: recording.id,
          category,
        });
        failCount++;
      } else {
        logger.info('Recording deleted successfully', {
          recordingId: recording.id,
          sessionId: recording.session_id,
          title: recording.title,
          category,
        });
        successCount++;
      }
    } catch (error: any) {
      logger.error('Error deleting recording', error, {
        recordingId: recording.id,
        category,
      });
      failCount++;
    }
  }

  logger.info(`Batch deletion completed for ${category} recordings`, {
    total: recordings.length,
    success: successCount,
    failed: failCount,
  });
}

/**
 * GET - 手动触发清理任务（仅用于测试，需要管理员权限）
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // 在生产环境中，应该通过 POST + 密钥验证
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Use POST method with authorization' },
      { status: 405 }
    );
  }

  logger.warn('Manual cleanup task triggered via GET (development only)');

  // 在开发环境中，重定向到 POST
  return POST(req);
}
