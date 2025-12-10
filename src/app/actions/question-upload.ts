/**
 * AI题库系统 - Server Actions
 * @description 文件上传、任务状态查询、批量提交
 */

'use server';

import { uploadFile, getSignedUrl, FileAccessLevel, downloadFile } from '@/lib/storage';
import { inngest } from '../../../inngest/client';
import { generateFileKey, formatFileSize, normalizeFileName } from '@/lib/ai-question-bank/utils';
import { BatchSubmitSchema } from '@/lib/ai-question-bank/schemas';
import type {
  ActionResult,
  UploadResult,
  UploadTask,
  ParsedQuestionRecord,
  QuestionImageAsset
} from '@/lib/ai-question-bank/types';
import { createAuthenticatedSupabaseClient, getAccessTokenFromCookies } from '@/lib/server/auth';
import sharp from 'sharp';
import { convertBoxToPixelRect } from '@/lib/ai-question-bank/coordinates';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

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

    const normalizedFileName = normalizeFileName(file.name) || file.name;
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
    const fileKey = generateFileKey(user.id, normalizedFileName);

    const uploadResult = await uploadFile({
      file: fileBuffer,
      key: fileKey,
      accessLevel: FileAccessLevel.PRIVATE,
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
        file_name: normalizedFileName,
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

    // 6. 触发处理（开发环境直接执行，生产环境使用 Inngest）
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // 开发环境：直接调用处理逻辑（不需要运行 Inngest CLI）
      console.log('开发环境：直接处理上传任务', { taskId: task.id });

      // 为动态导入添加完整的错误处理
      import('@/lib/ai-question-bank/process-upload')
        .then(({ processUploadTask }) => {
          return processUploadTask({
            taskId: task.id,
            userId: user.id,
            fileName: normalizedFileName,
            fileUrl: fileKey,
            traceId: task.trace_id
          });
        })
        .catch(err => {
          console.error('[question-upload] 后台处理失败', {
            taskId: task.id,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
          });

          // 更新数据库任务状态为失败
          Promise.resolve(
            supabase
              .from('upload_tasks')
              .update({
                status: 'failed',
                error_message: `后台处理失败: ${err instanceof Error ? err.message : '未知错误'}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id)
          )
            .then(() => {
              console.log('[question-upload] 任务状态已更新为失败', { taskId: task.id });
            })
            .catch(dbErr => {
              console.error('[question-upload] 更新任务状态失败', dbErr);
            });
        });
    } else {
      // 生产环境：使用 Inngest 异步处理
      console.log('生产环境：发送 Inngest 事件', { taskId: task.id });
      await inngest.send({
        name: 'question/upload.started',
        data: {
          taskId: task.id,
          userId: user.id,
          fileName: normalizedFileName,
          fileUrl: fileKey,
          traceId: task.trace_id
        }
      });
    }

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
    imageAssets?: QuestionImageAsset[];
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

    // 准备数据库更新（转换 imageAssets 为 image_assets）
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.imageAssets !== undefined) {
      dbUpdates.image_assets = updates.imageAssets;
      delete dbUpdates.imageAssets;
    }

    // 更新题目
    const { error } = await supabase
      .from('parsed_questions')
      .update(dbUpdates)
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
 * 人工框选裁剪配图
 */
export async function manualCropQuestionImage(params: {
  questionId: string;
  taskId: string;
  box2d: [number, number, number, number];
  label?: string;
}): Promise<ActionResult<{ asset: QuestionImageAsset }>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录' };
    }

    if (!Array.isArray(params.box2d) || params.box2d.length !== 4) {
      return { success: false, error: '无效的裁剪坐标' };
    }

    const { data: question, error: questionError } = await supabase
      .from('parsed_questions')
      .select('id, upload_task_id, number, original_image_url, image_assets')
      .eq('id', params.questionId)
      .eq('upload_task_id', params.taskId)
      .single();

    if (questionError || !question) {
      return { success: false, error: '题目不存在或不在当前任务中' };
    }

    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('id, user_id, file_url')
      .eq('id', params.taskId)
      .single();

    if (taskError || !task) {
      return { success: false, error: '上传任务不存在' };
    }

    if (task.user_id !== user.id) {
      return { success: false, error: '无权操作该题目' };
    }

    const sourceKey = question.original_image_url || task.file_url;
    if (!sourceKey) {
      return { success: false, error: '缺少原始图片，请重新上传文件' };
    }

    const originalImageBuffer = await downloadFile(sourceKey, FileAccessLevel.PRIVATE);
    const metadata = await sharp(originalImageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, error: '无法读取原图尺寸' };
    }

    const rect = convertBoxToPixelRect(
      params.box2d,
      { width: metadata.width, height: metadata.height },
      5
    );

    if (!rect) {
      return { success: false, error: '裁剪区域无效，请重新框选' };
    }

    const croppedBuffer = await sharp(originalImageBuffer)
      .extract({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      })
      .png()
      .toBuffer();

    const serviceClient = createServiceSupabaseClient();
    const uniqueId = `manual-${params.questionId}-${Date.now()}`;
    const fileName = `ai-question-bank/${params.taskId}/manual/q${question.number}-${uniqueId}.png`;

    const { error: uploadError } = await serviceClient.storage
      .from('question-images')
      .upload(fileName, croppedBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: `上传截图失败: ${uploadError.message}` };
    }

    const { data: urlData } = serviceClient.storage
      .from('question-images')
      .getPublicUrl(fileName);

    const region = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };

    const questionNumber = question.number || 'unknown';

    const newAsset: QuestionImageAsset = {
      id: uniqueId,
      key: fileName,
      url: urlData.publicUrl,
      questionNumber,
      order: 1,
      placeholder: params.label || '人工修复',
      used: true,
      source: 'manual',
      region
    };

    const existingAssets: QuestionImageAsset[] = Array.isArray(question.image_assets)
      ? question.image_assets
      : [];

    const normalizedAssets = existingAssets.map((asset, index) => ({
      ...asset,
      order: index + 2,
      used: false,
      source: asset.source ?? 'ai'
    }));

    const updatedAssets = [newAsset, ...normalizedAssets];

    const { error: updateError } = await supabase
      .from('parsed_questions')
      .update({
        question_image_url: newAsset.url,
        image_region: JSON.stringify(region),
        image_assets: updatedAssets
      })
      .eq('id', params.questionId);

    if (updateError) {
      return { success: false, error: `保存配图失败: ${updateError.message}` };
    }

    return {
      success: true,
      data: { asset: newAsset }
    };
  } catch (error) {
    console.error('manualCropQuestionImage错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '裁剪失败，请稍后重试'
    };
  }
}

/**
 * 生成图片签名URL（用于显示私有存储中的图片）
 */
export async function generateImageSignedUrl(fileKey: string): Promise<ActionResult<string>> {
  try {
    if (!fileKey) {
      return { success: false, error: '文件路径为空' };
    }

    const signedUrl = await getSignedUrl(fileKey, FileAccessLevel.PRIVATE, 3600); // 1小时有效期
    return { success: true, data: signedUrl };

  } catch (error) {
    console.error('generateImageSignedUrl错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成签名URL失败'
    };
  }
}

/**
 * 批量生成图片签名URL
 */
export async function generateImageSignedUrls(fileKeys: string[]): Promise<ActionResult<Record<string, string>>> {
  try {
    const urls: Record<string, string> = {};

    await Promise.all(
      fileKeys.map(async (key) => {
        if (key) {
          try {
            const signedUrl = await getSignedUrl(key, FileAccessLevel.PRIVATE, 3600);
            urls[key] = signedUrl;
          } catch (error) {
            console.error(`生成签名URL失败: ${key}`, error);
            urls[key] = ''; // 失败时返回空字符串
          }
        }
      })
    );

    return { success: true, data: urls };

  } catch (error) {
    console.error('generateImageSignedUrls错误', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '批量生成签名URL失败'
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
