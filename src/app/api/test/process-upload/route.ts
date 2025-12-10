/**
 * 受控触发上传任务处理（开发/测试用）
 * - 需要登录 Cookie (sb-auth-token)
 * - 优先使用 Inngest 异步处理，开发环境可回落为直接处理
 * - 增加限流与超时保护，防止阻塞
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateFromCookies } from '@/lib/server/auth';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit';
import { withTimeout } from '@/lib/utils/timeout';
import { inngest } from '../../../../../inngest/client';

async function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('缺少 Supabase 服务端配置');
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const rate = checkRateLimit(`process-upload:${clientId}`, { limit: 6, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
      );
    }

    const user = await authenticateFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const taskId = body?.taskId as string | undefined;
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const supabase = await getServiceSupabase();
    const { data: task, error } = await withTimeout(
      supabase.from('upload_tasks').select('*').eq('id', taskId).single(),
      10_000,
      'Supabase 请求超时'
    );

    if (error || !task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 安全检查：只允许本人触发
    if (task.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = {
      taskId: task.id,
      userId: task.user_id,
      fileName: task.file_name,
      fileUrl: task.file_url,
      traceId: task.trace_id
    };

    // 生产环境：通过 Inngest 异步处理
    if (process.env.NODE_ENV === 'production') {
      await withTimeout(
        inngest.send({
          name: 'question/upload.started',
          data: payload
        }),
        10_000,
        '派发 Inngest 事件超时'
      );
      return NextResponse.json({ success: true, queued: true });
    }

    // 开发环境：直接执行处理逻辑（保持向后兼容）
    const { processUploadTask } = await import('@/lib/ai-question-bank/process-upload');
    await withTimeout(
      processUploadTask(payload),
      30_000,
      '处理任务超时'
    );

    return NextResponse.json({ success: true, queued: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    logger.error('[api/test/process-upload] error', err instanceof Error ? err : undefined, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
