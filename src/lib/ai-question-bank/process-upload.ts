/**
 * PDF/图片上传处理核心逻辑
 * @description 可以被 Inngest Worker 或直接调用
 */

import { parseQuestions } from './qwen-flash';
import { bufferToBase64, calculateAverageConfidence, guessImageMimeType } from './utils';
import { downloadFile, FileAccessLevel } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { recognizeImage, buildMarkdownFromOCR, checkOCRConfig } from './aliyun-ocr-client';
import { detectImageRegions } from './image-region-detector';
import { matchQuestionImages, validateImageMapping } from './question-image-matcher';
import { cropQuestionImages } from './image-cropper';

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

    // Step 2.5: 阿里云OCR识别（检测配图区域）
    let ocrResult = null;
    let imageRegions = [];
    let questionRegions = [];
    const enableOCR = checkOCRConfig();

    if (enableOCR) {
      try {
        console.log('[阿里云OCR] 开始识别图片布局', { taskId });
        await supabase
          .from('upload_tasks')
          .update({ progress: 20, updated_at: new Date().toISOString() })
          .eq('id', taskId);

        ocrResult = await recognizeImage(fileBuffer);
        console.log('[阿里云OCR] 识别完成', {
          taskId,
          wordCount: ocrResult.PrismWordsInfo.length,
          imageSize: `${ocrResult.Width}x${ocrResult.Height}`
        });

        // 检测图像区域
        const detectionResult = detectImageRegions(ocrResult);
        imageRegions = detectionResult.imageRegions;
        questionRegions = detectionResult.questionRegions;

        console.log('[图像区域检测] 检测完成', {
          taskId,
          imageRegionCount: imageRegions.length,
          questionRegionCount: questionRegions.length
        });
      } catch (error) {
        console.error('[阿里云OCR] 识别失败，跳过配图裁剪', {
          taskId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // 打印完整错误对象便于调试
        console.error('[阿里云OCR] 完整错误信息:', error);
      }
    } else {
      console.log('[阿里云OCR] 未配置，跳过OCR识别');
    }

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
      avgConfidence: calculateAverageConfidence(questions.map(q => q.confidence))
    });

    // Step 4.5: 智能匹配题目与配图
    if (ocrResult && imageRegions.length > 0 && questions.length > 0) {
      try {
        console.log('[智能匹配] 开始匹配题目与配图', { taskId });

        const imageMapping = matchQuestionImages(
          questions,
          imageRegions,
          questionRegions,
          ocrResult.PrismWordsInfo
        );

        // 验证匹配结果
        const validatedMapping = validateImageMapping(
          imageMapping,
          ocrResult.Width,
          ocrResult.Height
        );

        // 将匹配的区域附加到题目上
        questions.forEach(q => {
          if (validatedMapping[q.number]) {
            const region = validatedMapping[q.number];
            q.image_region = {
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height
            };
          }
        });

        console.log('[智能匹配] 匹配完成', {
          taskId,
          totalQuestions: questions.length,
          matchedCount: Object.keys(validatedMapping).length,
          matchRate: `${Math.round(Object.keys(validatedMapping).length / questions.length * 100)}%`
        });
      } catch (error) {
        console.error('[智能匹配] 匹配失败', {
          taskId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Step 4.6: 裁剪题目配图
    let questionImageUrls: Record<string, string> = {};
    const questionsWithImages = questions.filter(q => q.image_region);

    if (questionsWithImages.length > 0) {
      try {
        console.log('[图片裁剪] 开始裁剪题目配图', {
          taskId,
          count: questionsWithImages.length
        });

        await supabase
          .from('upload_tasks')
          .update({ progress: 70, updated_at: new Date().toISOString() })
          .eq('id', taskId);

        questionImageUrls = await cropQuestionImages(
          fileBuffer,
          questions,
          data.userId,
          taskId
        );

        console.log('[图片裁剪] 裁剪完成', {
          taskId,
          croppedCount: Object.keys(questionImageUrls).length
        });
      } catch (error) {
        console.error('[图片裁剪] 裁剪失败', {
          taskId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      console.log('[图片裁剪] 无需裁剪（未检测到配图）', {
        taskId,
        questionsWithImages: questionsWithImages.length
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
      original_image_url: fileUrl, // 保存原始图片URL
      question_image_url: questionImageUrls[q.number] || null, // 保存裁剪后的配图URL
      image_region: q.image_region ? JSON.stringify(q.image_region) : null // 保存配图区域坐标
    }));

    await supabase.from('parsed_questions').insert(records);
    console.log('解析结果已保存', { taskId, count: questions.length, withImages: Object.keys(questionImageUrls).length });

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
