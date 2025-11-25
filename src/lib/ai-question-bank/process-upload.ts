/**
 * PDF/图片上传处理核心逻辑
 * @description 可以被 Inngest Worker 或直接调用
 */

import { parseQuestions } from './qwen-flash';
import { bufferToBase64, calculateAverageConfidence, guessImageMimeType } from './utils';
import { downloadFile, FileAccessLevel } from '@/lib/storage';
import { cropQuestionImages } from './image-cropper';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

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
 * 处理上传任务的核心逻辑
 * @description 开发环境直接调用，生产环境通过 Inngest Worker 调用
 */
export async function processUploadTask(data: {
  taskId: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  traceId: string;
}) {
  const { taskId, fileName, fileUrl } = data;
  const supabase = createServiceClient();

  console.log('开始处理上传任务', { taskId, fileName, fileUrl });

  try {
    // Step 1: 更新状态为 processing
    await supabase
      .from('upload_tasks')
      .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    // Step 2: 下载文件
    console.log('开始下载文件', { fileUrl });
    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);
    console.log('文件下载完成', { size: fileBuffer.length });

    // Step 3: 转换为 Base64
    await supabase
      .from('upload_tasks')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const imageBase64 = bufferToBase64(fileBuffer);

    // Step 4: 调用 Qwen3-VL-Flash 解析
    console.log('调用 Qwen3-VL-Flash 解析', { taskId });
    await supabase
      .from('upload_tasks')
      .update({ progress: 50, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const imageMimeType = guessImageMimeType(fileName || fileUrl);
    console.log('Qwen 调用前数据预览', {
      taskId,
      mimeType: imageMimeType,
      base64Length: imageBase64?.length,
      base64Head: imageBase64?.slice(0, 32),
      base64Tail: imageBase64?.slice(-32)
    });

    const questions = await parseQuestions(imageBase64, { mimeType: imageMimeType });
    console.log('解析完成', {
      taskId,
      questionCount: questions.length,
      avgConfidence: calculateAverageConfidence(questions.map(q => q.confidence)),
      questionsWithImages: questions.filter(q => q.image_region).length
    });

    // Step 4.5: 裁剪题目配图（如果有）
    await supabase
      .from('upload_tasks')
      .update({ progress: 60, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    let questionImageUrls: Record<string, string> = {};
    const questionsWithImages = questions.filter(q => q.image_region);

    if (questionsWithImages.length > 0) {
      console.log('开始裁剪题目配图', {
        taskId,
        questionCount: questionsWithImages.length
      });

      questionImageUrls = await cropQuestionImages(
        fileBuffer,
        questions,
        data.userId,
        taskId
      );

      console.log('题目配图裁剪完成', {
        taskId,
        croppedCount: Object.keys(questionImageUrls).length
      });
    }

    // Step 5: 保存到数据库
    await supabase
      .from('upload_tasks')
      .update({ progress: 80, updated_at: new Date().toISOString() })
      .eq('id', taskId);

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
      original_image_url: fileUrl, // 保存原始图片URL（完整大图）
      question_image_url: questionImageUrls[q.number] || null, // 保存裁剪后的配图URL
      image_region: q.image_region || null // 保存配图区域坐标
    }));

    await supabase.from('parsed_questions').insert(records);
    console.log('解析结果已保存', { taskId, count: questions.length });

    // Step 6: 更新任务为完成
    await supabase
      .from('upload_tasks')
      .update({
        status: 'completed',
        progress: 100,
        total_questions: questions.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    console.log('任务处理完成', { taskId, questionCount: questions.length });

    return {
      success: true,
      taskId,
      questionCount: questions.length
    };
  } catch (error) {
    console.error('处理上传任务失败', { taskId, error });

    // 更新任务状态为失败
    await supabase
      .from('upload_tasks')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : '未知错误',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    throw error;
  }
}
