/**
 * AI题库系统 - Server Actions
 * @description 文件上传、任务状态查询、批量提交
 */

'use server';

import { uploadFile } from '@/lib/storage';
import { inngest } from '../../../inngest/client';
import { generateFileKey, formatFileSize } from '@/lib/ai-question-bank/utils';
import { BatchSubmitSchema } from '@/lib/ai-question-bank/schemas';
import type { ActionResult, UploadResult, UploadTask, ParsedQuestionRecord } from '@/lib/ai-question-bank/types';
import { createAuthenticatedSupabaseClient, getAccessTokenFromCookies } from '@/lib/server/auth';

/**
 * 上传题目文件（PDF/图片）
 */
export async function uploadQuestionFile(formData: FormData): Promise<ActionResult<UploadResult>> {
  try {
    // 1. 验证用户身份
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录，请先登录' };
    }

    // 2. 获取文件
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: '未选择文件' };
    }

    // 3. 验证文件大小和类型
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: `文件过大（${formatFileSize(file.size)}），最大支持20MB`
      };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: '只支持JPG、PNG和PDF格式'
      };
    }

    // 4. 上传到R2
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileKey = generateFileKey(user.id, file.name);

    const uploadResult = await uploadFile({
      file: fileBuffer,
      key: fileKey,
      accessLevel: 'PRIVATE',
      contentType: file.type
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: `文件上传失败: ${uploadResult.error || '未知错误'}`
      };
    }

    // 5. 创建任务记录
    const { data: task, error: dbError } = await supabase
      .from('upload_tasks')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: fileKey,
        status: 'pending',
        progress: 0
      })
      .select()
      .single();

    if (dbError || !task) {
      return {
        success: false,
        error: `创建任务失败: ${dbError?.message || '未知错误'}`
      };
    }

    // 6. 触发Inngest异步处理
    await inngest.send({
      name: 'question/upload.started',
      data: {
        taskId: task.id,
        userId: user.id,
        fileName: file.name,
        fileUrl: fileKey,
        traceId: task.trace_id
      }
    });

    return {
      success: true,
      data: {
        taskId: task.id,
        traceId: task.trace_id
      }
    };

  } catch (error) {
    console.error('uploadQuestionFile错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(taskId: string): Promise<ActionResult<UploadTask>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 查询任务
    const { data: task, error } = await supabase
      .from('upload_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id) // 确保只能查询自己的任务
      .single();

    if (error) {
      return { success: false, error: `查询失败: ${error.message}` };
    }

    return { success: true, data: task as UploadTask };

  } catch (error) {
    console.error('getTaskStatus错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 获取任务的解析结果
 */
export async function getTaskQuestions(taskId: string): Promise<ActionResult<ParsedQuestionRecord[]>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return { success: false, error: '任务不存在或无权限访问' };
    }

    // 查询解析结果
    const { data: questions, error } = await supabase
      .from('parsed_questions')
      .select('*')
      .eq('upload_task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: `查询失败: ${error.message}` };
    }

    return { success: true, data: questions as ParsedQuestionRecord[] };

  } catch (error) {
    console.error('getTaskQuestions错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 批量提交题目到题库
 */
export async function submitQuestions(
  taskId: string,
  questionIds: string[]
): Promise<ActionResult<{ submittedCount: number }>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    // 验证输入
    const validation = BatchSubmitSchema.safeParse({ taskId, questionIds });
    if (!validation.success) {
      return { success: false, error: validation.error.message };
    }

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 验证任务归属
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return { success: false, error: '任务不存在或无权限访问' };
    }

    // 获取待提交的题目
    const { data: questions, error: fetchError } = await supabase
      .from('parsed_questions')
      .select('*')
      .eq('upload_task_id', taskId)
      .in('id', questionIds)
      .eq('is_submitted', false);

    if (fetchError) {
      return { success: false, error: `查询题目失败: ${fetchError.message}` };
    }

    if (!questions || questions.length === 0) {
      return { success: false, error: '没有可提交的题目' };
    }

    // 调用RPC函数批量入库（事务保护）
    const { data: result, error: rpcError } = await supabase.rpc('batch_submit_questions', {
      p_user_id: user.id,
      p_task_id: taskId,
      p_question_ids: questionIds
    });

    if (rpcError) {
      return { success: false, error: `提交失败: ${rpcError.message}` };
    }

    return {
      success: true,
      data: { submittedCount: result as number }
    };

  } catch (error) {
    console.error('submitQuestions错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 更新单个题目（人工编辑）
 */
export async function updateQuestion(
  questionId: string,
  updates: {
    type?: string;
    content?: string;
    options?: string[];
    answer?: string;
    tags?: Record<string, unknown>;
  }
): Promise<ActionResult<void>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 更新题目
    const { error } = await supabase
      .from('parsed_questions')
      .update(updates)
      .eq('id', questionId);

    if (error) {
      return { success: false, error: `更新失败: ${error.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error('updateQuestion错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 删除单个题目
 */
export async function deleteQuestion(questionId: string): Promise<ActionResult<void>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 删除题目
    const { error } = await supabase
      .from('parsed_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      return { success: false, error: `删除失败: ${error.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error('deleteQuestion错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 获取题库中的题目列表（从 questions 表）
 */
export interface QuestionInLibrary {
  id: string
  type: string
  content: string
  options?: string[]
  answer: string
  knowledge_points: string[]
  difficulty: string
  created_by: string
  created_at: string
}

export async function getQuestions(params?: {
  type?: string
  difficulty?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<ActionResult<{ questions: QuestionInLibrary[]; total: number }>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    // 构建查询
    let query = supabase
      .from('questions')
      .select('*', { count: 'exact' })
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    // 应用过滤条件
    if (params?.type) {
      query = query.eq('type', params.type);
    }

    if (params?.difficulty) {
      query = query.eq('difficulty', params.difficulty);
    }

    if (params?.search) {
      query = query.or(`content.ilike.%${params.search}%,answer.ilike.%${params.search}%`);
    }

    // 分页
    const limit = params?.limit || 20;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: questions, error, count } = await query;

    if (error) {
      return { success: false, error: `查询失败: ${error.message}` };
    }

    return {
      success: true,
      data: {
        questions: (questions || []) as QuestionInLibrary[],
        total: count || 0
      }
    };

  } catch (error) {
    console.error('getQuestions错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}
