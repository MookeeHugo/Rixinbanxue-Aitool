/**
 * Inngest Worker - 处理 PDF/图片上传与 AI 解析
 * @description 核心异步任务：下载文件 -> Qwen 解析 -> 写入数据库
 */

import { inngest } from '../client';
import { parseQuestions } from '@/lib/ai-question-bank/qwen-flash';
import { bufferToBase64, calculateAverageConfidence, guessImageMimeType } from '@/lib/ai-question-bank/utils';
import { createClient } from '@supabase/supabase-js';
import { downloadFile, FileAccessLevel } from '@/lib/storage';
import type { Database } from '@/types/database';

/**
 * 创建 Supabase Service Client（服务密钥，不持久化会话）
 */
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

/**
 * 更新任务状态
 */
async function updateTaskStatus(
  supabase: ReturnType<typeof createServiceClient>,
  taskId: string,
  updates: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    total_questions?: number;
    error_message?: string;
  }
) {
  const { error } = await supabase
    .from('upload_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) {
    console.error('更新任务状态失败', { taskId, error });
    throw error;
  }
}

/**
 * 批量写入解析结果
 */
async function insertParsedQuestions(
  supabase: ReturnType<typeof createServiceClient>,
  taskId: string,
  questions: Array<{
    number: string;
    type: string;
    content: string;
    options?: string[];
    answer: string;
    tags: Record<string, unknown>;
    confidence: number;
    steps?: string[];
  }>
) {
  const records = questions.map(q => ({
    upload_task_id: taskId,
    type: q.type,
    content: q.content,
    options: q.options || null,
    answer: q.answer,
    tags: q.tags,
    confidence_score: q.confidence,
    is_selected: true,
    is_submitted: false,
    original_image_url: fileUrl // 保存原始图片URL，用于在题目卡片中显示
  }));

  const { error } = await supabase.from('parsed_questions').insert(records);

  if (error) {
    console.error('插入解析结果失败', { taskId, error });
    throw error;
  }
}

/**
 * Worker 入口：处理 PDF/图片上传
 */
export const processPdfUpload = inngest.createFunction(
  {
    id: 'process-pdf-upload',
    name: 'Process PDF Upload',
    retries: 2
  },
  { event: 'question/upload.started' },
  async ({ event, step }) => {
    const { taskId, userId, fileName, fileUrl, traceId } = event.data;

    console.log('开始处理上传任务', { taskId, fileName, traceId, userId });

    const supabase = createServiceClient();

    try {
      // Step 1: 更新状态为 processing
      await step.run('update-status-processing', async () => {
        await updateTaskStatus(supabase, taskId, {
          status: 'processing',
          progress: 10
        });
      });

      // Step 2: 从存储下载文件
      const fileBuffer = await step.run('download-file', async () => {
        console.log('开始下载文件', { fileUrl });

        const buffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);
        console.log('文件下载完成', { size: buffer.length });

        return buffer;
      });

      // Step 3: 转换为 Base64
      const imageBase64 = await step.run('convert-to-base64', async () => {
        await updateTaskStatus(supabase, taskId, { progress: 30 });
        return bufferToBase64(fileBuffer);
      });

      // Step 4: 调用 Qwen3-VL-Flash 解析
      const questions = await step.run('parse-with-qwen', async () => {
        console.log('调用 Qwen3-VL-Flash 解析', { taskId });
        await updateTaskStatus(supabase, taskId, { progress: 50 });

        const imageMimeType = guessImageMimeType(fileName || fileUrl || '');
        console.log('Qwen 调用前数据预览', {
          taskId,
          mimeType: imageMimeType,
          base64Length: imageBase64?.length,
          base64Head: imageBase64?.slice(0, 32),
          base64Tail: imageBase64?.slice(-32)
        });
        const parsed = await parseQuestions(imageBase64, { mimeType: imageMimeType });
        console.log('解析完成', {
          taskId,
          questionCount: parsed.length,
          avgConfidence: calculateAverageConfidence(parsed.map(q => q.confidence))
        });

        return parsed;
      });

      // Step 5: 写入数据库
      await step.run('save-to-database', async () => {
        await updateTaskStatus(supabase, taskId, { progress: 70 });

        await insertParsedQuestions(supabase, taskId, questions);

        console.log('解析结果已保存', { taskId, count: questions.length });
      });

      // Step 6: 更新任务为完成
      await step.run('update-status-completed', async () => {
        await updateTaskStatus(supabase, taskId, {
          status: 'completed',
          progress: 100,
          total_questions: questions.length
        });
      });

      // Step 7: 推送完成事件
      await step.sendEvent('send-completion-event', {
        name: 'question/parse.completed',
        data: {
          taskId,
          questionCount: questions.length,
          avgConfidence: calculateAverageConfidence(questions.map(q => q.confidence))
        }
      });

      return {
        success: true,
        taskId,
        questionCount: questions.length
      };
    } catch (error) {
      console.error('处理上传任务失败', { taskId, error });

      // 更新任务状态为失败
      await updateTaskStatus(supabase, taskId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : '未知错误'
      });

      // 推送失败事件
      await step.sendEvent('send-failure-event', {
        name: 'question/parse.failed',
        data: {
          taskId,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });

      throw error;
    }
  }
);
