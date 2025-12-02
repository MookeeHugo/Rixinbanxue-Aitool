/**
 * PDF/图片上传处理核心逻辑
 * @description 可以被 Inngest Worker 或直接调用
 *
 * 【重要】已切换到 Gemini Flash + Pro 级联架构
 * - 使用 Gemini Vision 直接输出题目内容和图像坐标
 * - 不再依赖 OCR + 空白区域检测 + 智能匹配的复杂流程
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { downloadFile, FileAccessLevel } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import sharp from 'sharp';

import type { GeminiQuestion } from './types';
import { convertBoxToPixelRect, isValidImageBox } from './coordinates';
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

const METRICS_DIR = join(process.cwd(), 'logs', 'metrics');
const INGEST_METRICS_FILE = join(METRICS_DIR, 'ingest-baseline.log');

interface IngestMetricsEntry {
  timestamp: string;
  taskId: string;
  fileName: string;
  ingest_upload_latency_ms: number | null;
  supabase_bandwidth_mb: number | null;
  python_processing_ms: number | null;
}

function recordIngestMetrics(entry: IngestMetricsEntry) {
  try {
    if (!existsSync(METRICS_DIR)) {
      mkdirSync(METRICS_DIR, { recursive: true });
    }
    appendFileSync(INGEST_METRICS_FILE, `${JSON.stringify(entry)}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.warn('[ingest-metrics] 写入失败', {
      error: error instanceof Error ? error.message : String(error),
      entry
    });
  }
}

function inferQuestionType(question: any): 'choice' | 'fill' | 'essay' {
  if (question.options?.length >= 4) return 'choice';
  if (question.content.includes('填空') || question.content.includes('_______')) return 'fill';
  return 'essay';
}

function logInvalidRegion(
  taskId: string,
  questionNumber: string,
  reason: string,
  extra?: Record<string, unknown>
) {
  console.warn('[region-normalize] 配图被丢弃', {
    taskId,
    questionNumber,
    reason,
    ...extra
  });
}

function normalizeRegion(
  region: GeminiQuestion['image_regions'][number],
  imageMeta: { width: number; height: number } | null,
  context: { taskId: string; questionNumber: string }
): ImageRegion | null {
  if (!imageMeta) {
    logInvalidRegion(context.taskId, context.questionNumber, '缺少原图尺寸', {
      box_2d: region?.box_2d
    });
    return null;
  }

  const normalizedBox =
    (Array.isArray(region?.box_2d) && region.box_2d.length === 4
      ? region.box_2d
      : undefined) ??
    (Array.isArray(region?.rough_bbox) && region.rough_bbox.length === 4
      ? region.rough_bbox
      : undefined);
  if (!normalizedBox) {
    logInvalidRegion(context.taskId, context.questionNumber, 'box_2d 缺失或格式错误', {
      box_2d: region?.box_2d,
      rough_bbox: region?.rough_bbox
    });
    return null;
  }

  const rect = convertBoxToPixelRect(normalizedBox, imageMeta);
  if (!rect) {
    logInvalidRegion(context.taskId, context.questionNumber, '归一化坐标无法映射到像素', {
      box_2d: normalizedBox
    });
    return null;
  }

  if (!isValidImageBox(rect, imageMeta)) {
    logInvalidRegion(context.taskId, context.questionNumber, '启发式过滤拦截', {
      box_2d: normalizedBox,
      mapped: rect
    });
    return null;
  }

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
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
  const processingStartTime = Date.now();
  let uploadCreatedAt: Date | null = null;
  let downloadCompletedAt: number | null = null;
  let downloadedFileBytes: number | null = null;

  console.log('开始处理上传任务', { taskId, fileName, fileUrl });

  try {
    const { data: processingTaskRecord } = await supabase
      .from('upload_tasks')
      .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select('id, created_at')
      .single();

    if (processingTaskRecord?.created_at) {
      uploadCreatedAt = new Date(processingTaskRecord.created_at);
    }

    console.log('开始下载文件', { fileUrl });
    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);
    downloadCompletedAt = Date.now();
    downloadedFileBytes = fileBuffer.length;
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

    const imageMeta = imageWidth && imageHeight ? { width: imageWidth, height: imageHeight } : null;

    const processedQuestions: ProcessedQuestion[] = geminiResult.questions.map((question) => {
      const resolvedType = question.meta?.type ?? inferQuestionType(question);
      const resolvedDifficulty = question.meta?.difficulty ?? 'medium';
      const resolvedTags = question.meta?.tags ?? [];

      const normalizedRegions = (question.image_regions ?? [])
        .map(region =>
          normalizeRegion(region, imageMeta, { taskId, questionNumber: question.number })
        )
        .filter((region): region is ImageRegion => Boolean(region));

      if ((question.image_regions?.length ?? 0) > 0 && normalizedRegions.length === 0) {
        invalidRegionQuestions.push(question.number);
      }

      return {
        number: question.number,
        type: resolvedType,
        content: question.content,
        options: question.options || [],
        answer: question.answer || '',
        tags: {
          knowledge: resolvedTags,
          difficulty: resolvedDifficulty,
          type: resolvedType
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
  } finally {
    const pythonProcessingMs = Date.now() - processingStartTime;
    const supabaseBandwidthMb =
      downloadedFileBytes != null
        ? Number((downloadedFileBytes / (1024 * 1024)).toFixed(3))
        : null;
    const ingestUploadLatencyMs =
      downloadCompletedAt != null
        ? uploadCreatedAt
          ? downloadCompletedAt - uploadCreatedAt.getTime()
          : downloadCompletedAt - processingStartTime
        : null;

    recordIngestMetrics({
      timestamp: new Date().toISOString(),
      taskId,
      fileName,
      ingest_upload_latency_ms: ingestUploadLatencyMs,
      supabase_bandwidth_mb: supabaseBandwidthMb,
      python_processing_ms: pythonProcessingMs
    });
  }
}
