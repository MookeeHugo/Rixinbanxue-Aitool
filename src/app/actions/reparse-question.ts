/**
 * AI题库系统 - 单题重新解析 Server Actions
 * @description 支持对单个题目重新调用AI解析，包含状态管理和进度追踪
 */

'use server';

import { createAuthenticatedSupabaseClient } from '@/lib/server/auth';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ActionResult, ReparseStatus, ParsedQuestionRecord } from '@/lib/ai-question-bank/types';

function createServiceSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('缺少 Supabase 服务配置');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

/**
 * 重解析状态响应
 */
export interface ReparseStatusResponse {
  questionId: string;
  status: ReparseStatus;
  reparseCount: number;
  lastReparseAt: string | null;
  errorMessage?: string;
}

/**
 * 启动单题重新解析
 */
export async function initiateReparse(questionId: string): Promise<ActionResult<{ questionId: string }>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录，请先登录' };
    }

    // 查询题目及其关联任务
    const { data: question, error: questionError } = await supabase
      .from('parsed_questions')
      .select(`
        id,
        upload_task_id,
        reparse_status,
        reparse_count,
        original_image_url
      `)
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return { success: false, error: '题目不存在' };
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('id, user_id, file_url')
      .eq('id', question.upload_task_id)
      .single();

    if (taskError || !task) {
      return { success: false, error: '关联任务不存在' };
    }

    if (task.user_id !== user.id) {
      return { success: false, error: '无权操作该题目' };
    }

    // 检查是否正在解析中
    if (question.reparse_status === 'processing' || question.reparse_status === 'pending') {
      return { success: false, error: '该题目正在解析中，请稍后再试' };
    }

    // 检查是否有原始图片
    const sourceImageKey = question.original_image_url || task.file_url;
    if (!sourceImageKey) {
      return { success: false, error: '缺少原始图片，无法重新解析' };
    }

    // 更新状态为pending
    const { error: updateError } = await supabase
      .from('parsed_questions')
      .update({
        reparse_status: 'pending',
        reparse_count: (question.reparse_count || 0) + 1
      })
      .eq('id', questionId);

    if (updateError) {
      return { success: false, error: `更新状态失败: ${updateError.message}` };
    }

    return {
      success: true,
      data: { questionId }
    };

  } catch (error) {
    console.error('initiateReparse错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '启动重解析失败'
    };
  }
}

/**
 * 查询重解析状态
 */
export async function getReparseStatus(questionId: string): Promise<ActionResult<ReparseStatusResponse>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    const { data: question, error } = await supabase
      .from('parsed_questions')
      .select(`
        id,
        upload_task_id,
        reparse_status,
        reparse_count,
        last_reparse_at
      `)
      .eq('id', questionId)
      .single();

    if (error || !question) {
      return { success: false, error: '题目不存在' };
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('user_id')
      .eq('id', question.upload_task_id)
      .single();

    if (taskError || !task || task.user_id !== user.id) {
      return { success: false, error: '无权查看该题目' };
    }

    return {
      success: true,
      data: {
        questionId: question.id,
        status: (question.reparse_status as ReparseStatus) || 'idle',
        reparseCount: question.reparse_count || 0,
        lastReparseAt: question.last_reparse_at || null
      }
    };

  } catch (error) {
    console.error('getReparseStatus错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '查询状态失败'
    };
  }
}

/**
 * 取消重解析（仅限pending状态）
 */
export async function cancelReparse(questionId: string): Promise<ActionResult<void>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 查询题目
    const { data: question, error: questionError } = await supabase
      .from('parsed_questions')
      .select('id, upload_task_id, reparse_status')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return { success: false, error: '题目不存在' };
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('user_id')
      .eq('id', question.upload_task_id)
      .single();

    if (taskError || !task || task.user_id !== user.id) {
      return { success: false, error: '无权操作该题目' };
    }

    // 只能取消pending状态的解析
    if (question.reparse_status !== 'pending') {
      return { success: false, error: '只能取消等待中的解析任务' };
    }

    // 重置状态
    const { error: updateError } = await supabase
      .from('parsed_questions')
      .update({ reparse_status: 'idle' })
      .eq('id', questionId);

    if (updateError) {
      return { success: false, error: `取消失败: ${updateError.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error('cancelReparse错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '取消失败'
    };
  }
}

/**
 * 更新重解析状态（内部使用，需要服务端权限）
 */
export async function updateReparseStatus(
  questionId: string,
  status: ReparseStatus,
  errorMessage?: string
): Promise<ActionResult<void>> {
  try {
    const serviceClient = createServiceSupabaseClient();

    const updateData: Record<string, unknown> = {
      reparse_status: status
    };

    if (status === 'completed' || status === 'failed') {
      updateData.last_reparse_at = new Date().toISOString();
    }

    if (errorMessage && status === 'failed') {
      // 可以考虑添加一个error_message字段，这里暂时不处理
      console.error('重解析失败:', errorMessage);
    }

    const { error } = await serviceClient
      .from('parsed_questions')
      .update(updateData)
      .eq('id', questionId);

    if (error) {
      return { success: false, error: `更新状态失败: ${error.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error('updateReparseStatus错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新状态失败'
    };
  }
}

/**
 * 获取题目完整信息（用于重解析）
 */
export async function getQuestionForReparse(questionId: string): Promise<ActionResult<{
  question: ParsedQuestionRecord;
  sourceImageKey: string;
}>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    const { data: question, error: questionError } = await supabase
      .from('parsed_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return { success: false, error: '题目不存在' };
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('id, user_id, file_url')
      .eq('id', question.upload_task_id)
      .single();

    if (taskError || !task) {
      return { success: false, error: '关联任务不存在' };
    }

    if (task.user_id !== user.id) {
      return { success: false, error: '无权访问该题目' };
    }

    const sourceImageKey = question.original_image_url || task.file_url;
    if (!sourceImageKey) {
      return { success: false, error: '缺少原始图片' };
    }

    return {
      success: true,
      data: {
        question: question as ParsedQuestionRecord,
        sourceImageKey
      }
    };

  } catch (error) {
    console.error('getQuestionForReparse错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取题目信息失败'
    };
  }
}
