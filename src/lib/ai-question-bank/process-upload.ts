/**
 * PDF/图片上传处理核心逻辑
 * @description 可以被 Inngest Worker 或直接调用
 *
 * 【重要】已切换到 Gemini Flash + Pro 级联架构
 * - 使用 Gemini Vision 直接输出题目内容和图像坐标
 * - 不再依赖 OCR + 空白区域检测 + 智能匹配的复杂流程
 */

import { downloadFile, FileAccessLevel } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import sharp from 'sharp';

import type { GeminiQuestion } from './gemini-vision-client';
import { cropAndUploadQuestionImages, type QuestionWithRegions } from './crop-question-images';
import type { ImageRegion } from './types';

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

function inferQuestionType(question: any): 'choice' | 'fill' | 'essay' {
  if (question.options?.length >= 4) return 'choice';
  if (question.content.includes('填空') || question.content.includes('_______')) return 'fill';
  return 'essay';
}

function getCropRect(
  box2d: [number, number, number, number],
  imgWidth: number,
  imgHeight: number
) {
  const [ymin, xmin, ymax, xmax] = box2d;

  let top = Math.floor((ymin / 1000) * imgHeight);
  let left = Math.floor((xmin / 1000) * imgWidth);
  let bottom = Math.ceil((ymax / 1000) * imgHeight);
  let right = Math.ceil((xmax / 1000) * imgWidth);

  const PADDING = 10;
  top = Math.max(0, top - PADDING);
  left = Math.max(0, left - PADDING);
  bottom = Math.min(imgHeight, bottom + PADDING);
  right = Math.min(imgWidth, right + PADDING);

  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    console.error('无效的裁剪区域', { box2d, left, top, width, height });
    return null;
  }

  return { left, top, width, height };
}

function normalizeRegion(
  region: GeminiQuestion['image_regions'][number],
  imageWidth: number | null,
  imageHeight: number | null
): ImageRegion | null {
  if (
    typeof region?.x === 'number' &&
    typeof region?.y === 'number' &&
    typeof region?.width === 'number' &&
    typeof region?.height === 'number'
  ) {
    return {
      x: Math.round(region.x),
      y: Math.round(region.y),
      width: Math.round(region.width),
      height: Math.round(region.height)
    };
  }

  if (region?.box_2d && imageWidth && imageHeight) {
    const rect = getCropRect(region.box_2d, imageWidth, imageHeight);
    if (rect) {
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
    }
  }

  return null;
}

type ProcessedQuestion = {
  number: string;
  type: 'choice' | 'fill' | 'essay';
  content: string;
  options: string[];
  answer: string;
  tags: {
    knowledge: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    type: string;
  };
  confidence: number;
  image_regions: ImageRegion[];
};

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
    await supabase
      .from('upload_tasks')
      .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    console.log('开始下载文件', { fileUrl });
    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);
    console.log('文件下载完成', { size: fileBuffer.length });

    let imageWidth: number | null = null;
    let imageHeight: number | null = null;

    try {
      const metadata = await sharp(fileBuffer).metadata();
      imageWidth = metadata.width ?? null;
      imageHeight = metadata.height ?? null;
    } catch (error) {
      console.warn('[数据转换] 读取原图尺寸失败', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const { parseQuestionWithCascadingFromBuffer } = await import('./gemini-vision-client');
    console.log('[Gemini级联] 开始解析试卷（从Buffer）', { taskId, fileUrl });
    await supabase
      .from('upload_tasks')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const geminiResult = await parseQuestionWithCascadingFromBuffer(fileBuffer);

    if (!geminiResult.validation?.passed) {
      throw new Error(`Gemini 数据校验失败: ${geminiResult.validation?.reasons?.join('；') ?? '未知原因'}`);
    }

    if (!geminiResult.questions.length) {
      throw new Error('Gemini 未识别到任何题目');
    }

    const invalidRegionQuestions: string[] = [];

    const processedQuestions: ProcessedQuestion[] = geminiResult.questions.map((question) => {
      const normalizedRegions = (question.image_regions ?? [])
        .map(region => normalizeRegion(region, imageWidth, imageHeight))
        .filter((region): region is ImageRegion => Boolean(region));

      if ((question.image_regions?.length ?? 0) > 0 && normalizedRegions.length === 0) {
        invalidRegionQuestions.push(question.number);
      }

      return {
        number: question.number,
        type: inferQuestionType(question),
        content: question.content,
        options: question.options || [],
        answer: question.answer || '',
        tags: {
          knowledge: [],
          difficulty: 'medium',
          type: inferQuestionType(question)
        },
        confidence: 0.95,
        image_regions: normalizedRegions
      };
    });

    if (invalidRegionQuestions.length > 0) {
      throw new Error(`部分题目配图坐标无效: ${invalidRegionQuestions.slice(0, 5).join(', ')}`);
    }

    await supabase
      .from('upload_tasks')
      .update({ progress: 50, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const cropInput: QuestionWithRegions[] = processedQuestions.map(q => ({
      number: q.number,
      image_regions: q.image_regions
    }));

    await supabase
      .from('upload_tasks')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const cropSummary = await cropAndUploadQuestionImages(taskId, fileBuffer, cropInput);
    const questionsWithImages = processedQuestions.filter(q => q.image_regions.length > 0);
    const questionsWithAssets = questionsWithImages.filter(q => (cropSummary.assetsByQuestion[q.number]?.length ?? 0) > 0);

    if (questionsWithImages.length > 0 && questionsWithAssets.length === 0) {
      throw new Error('检测到配图题目，但裁剪结果全部为空');
    }

    const missingAssets = questionsWithImages.filter(q => !(cropSummary.assetsByQuestion[q.number]?.length));
    if (missingAssets.length > 0) {
      throw new Error(`部分配图裁剪失败: ${missingAssets.map(q => q.number).slice(0, 5).join(', ')}`);
    }

    await supabase
      .from('upload_tasks')
      .update({ progress: 80, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const records = processedQuestions.map(question => {
      const assets = cropSummary.assetsByQuestion[question.number] ?? [];
      const primaryAsset = assets[0] ?? null;

      return {
        upload_task_id: taskId,
        number: question.number,
        type: question.type,
        content: question.content,
        raw_content: question.content,
        options: question.options.length > 0 ? question.options : null,
        answer: question.answer,
        tags: question.tags,
        confidence_score: question.confidence,
        is_selected: true,
        is_submitted: false,
        original_image_url: fileUrl,
        question_image_url: primaryAsset?.url ?? null,
        image_region: question.image_regions[0] ? JSON.stringify(question.image_regions[0]) : null,
        image_placeholders: null,
        image_assets: assets.length ? assets : null
      };
    });

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('parsed_questions')
      .insert(records)
      .select();

    if (insertError) {
      console.error('[数据库保存失败]', {
        taskId,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
      throw new Error(`数据库保存失败: ${insertError.message}`);
    }

    const totalQuestions = processedQuestions.length;
    const imageQuestionCount = questionsWithImages.length;
    const imageSuccessRate = imageQuestionCount
      ? Math.round((questionsWithAssets.length / imageQuestionCount) * 100)
      : 100;

    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      progress: 100,
      total_questions: totalQuestions,
      image_questions: imageQuestionCount,
      image_success_rate: imageSuccessRate,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('upload_tasks')
      .update(updatePayload)
      .eq('id', taskId);

    console.log('任务处理完成', {
      taskId,
      questionCount: totalQuestions,
      insertedCount: insertedQuestions?.length || 0,
      imageQuestions: imageQuestionCount,
      imageSuccessRate
    });

    return {
      success: true,
      taskId,
      questionCount: totalQuestions
    };
  } catch (error) {
    console.error('处理上传任务失败', { taskId, error });

    await supabase
      .from('upload_tasks')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : '未知错误',
        image_success_rate: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    throw error;
  }
}
