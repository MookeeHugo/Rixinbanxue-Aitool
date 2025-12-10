/**
 * PDF/图片上传处理核心逻辑
 * @description 可以被 Inngest Worker 或直接调用
 *
 * 【重要】已切换到 Gemini Flash + Pro 级联架构
 * - 使用 Gemini Vision 直接输出题目内容和图像坐标
 * - 不再依赖 OCR + 空白区域检测 + 智能匹配的复杂流程
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { Blob } from 'buffer';
import { downloadFile, FileAccessLevel } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import sharp from 'sharp';

import type {
  GeminiImageRegion,
  GeminiQuestion,
  NormalizedBox
} from './types';
import { convertBoxToPixelRect, isValidImageBox } from './coordinates';
import {
  cropAndUploadQuestionImages,
  type CropHookContext,
  type CropHookResult,
  type QuestionWithRegions,
  type RegionMeta
} from './crop-question-images';
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

const PIPELINE_BASE_URL = (process.env.RIXINMATH_PIPELINE_URL || 'http://127.0.0.1:8000').replace(
  /\/+$/,
  ''
);
const PIPELINE_DISABLED = process.env.RIXINMATH_PIPELINE_DISABLED === 'true';
const PIPELINE_TIMEOUT_MS = Number(process.env.RIXINMATH_PIPELINE_TIMEOUT || 60000);
const SHOULD_USE_PIPELINE = !PIPELINE_DISABLED;
const TMP_ANCHOR_DIR = join(process.cwd(), 'tmp', 'anchor-verify');

interface PipelineArtifactsResponse {
  task_id: string;
  meta?: {
    width?: number;
    height?: number;
  };
  artifacts?: {
    original_path?: string;
    grid_path?: string;
    binary_path?: string;
  };
}

interface CoordinateRefineResponse {
  status: 'ok' | 'fallback';
  refined_bbox: NormalizedBox;
  confidence?: number;
  reason?: string;
}

interface AnchorVerifyResponse {
  matched: boolean;
  confidence?: number;
  trim_start?: number;
  ocr_text?: string;
}

async function readLocalFile(path?: string | null): Promise<Buffer | null> {
  if (!path) {
    return null;
  }
  try {
    return await fsPromises.readFile(path);
  } catch (error) {
    console.warn('[pipeline] 无法读取文件', {
      path,
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function callPipelinePreprocess(
  taskId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<PipelineArtifactsResponse | null> {
  if (!SHOULD_USE_PIPELINE) {
    return null;
  }
  const endpoint = `${PIPELINE_BASE_URL}/api/preprocess/upload`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PIPELINE_TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append('task_id', taskId);
    form.append('file', new Blob([fileBuffer]) as any, fileName);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: form,
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }

    return (await response.json()) as PipelineArtifactsResponse;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[pipeline] preprocess 超时', { taskId, endpoint });
    } else {
      console.warn('[pipeline] preprocess 请求失败', {
        taskId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callCoordinateRefiner(params: {
  roughBox: NormalizedBox;
  binaryPath: string;
  imageMeta: { width: number; height: number };
}): Promise<CoordinateRefineResponse | null> {
  if (!SHOULD_USE_PIPELINE) {
    return null;
  }
  const endpoint = new URL(`${PIPELINE_BASE_URL}/api/refine-bbox`);
  params.roughBox.forEach(value => {
    endpoint.searchParams.append('rough_bbox', String(value));
  });

  const form = new FormData();
  form.append('binary_path', params.binaryPath);
  form.append('image_width', String(params.imageMeta.width));
  form.append('image_height', String(params.imageMeta.height));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: form
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }
    return (await response.json()) as CoordinateRefineResponse;
  } catch (error) {
    console.warn('[pipeline] refine-bbox 请求失败', {
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function callAnchorVerification(params: {
  anchorTextPrev: string;
  imagePath: string;
  stripRatio?: number;
}): Promise<AnchorVerifyResponse | null> {
  if (!SHOULD_USE_PIPELINE) {
    return null;
  }
  const endpoint = `${PIPELINE_BASE_URL}/api/anchor-verify`;
  const form = new FormData();
  form.append('anchor_text_prev', params.anchorTextPrev);
  form.append('image_path', params.imagePath);
  if (typeof params.stripRatio === 'number') {
    form.append('strip_ratio', String(params.stripRatio));
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: form
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }
    return (await response.json()) as AnchorVerifyResponse;
  } catch (error) {
    console.warn('[pipeline] anchor-verify 请求失败', {
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'segment';
}

async function ensureAnchorDir() {
  await fsPromises.mkdir(TMP_ANCHOR_DIR, { recursive: true });
}

async function persistAnchorTempFile(
  buffer: Buffer,
  taskId: string,
  questionNumber: string,
  regionIndex: number
): Promise<string> {
  await ensureAnchorDir();
  const safeTask = sanitizeFileSegment(taskId);
  const safeQuestion = sanitizeFileSegment(questionNumber);
  const fileName = `${safeTask}-${safeQuestion}-${regionIndex + 1}-${Date.now()}.png`;
  const filePath = join(TMP_ANCHOR_DIR, fileName);
  await fsPromises.writeFile(filePath, buffer);
  return filePath;
}

async function trimBufferFromTop(
  buffer: Buffer,
  trimStart: number
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return null;
    }
    const safeTrim = Math.min(Math.max(trimStart, 0), Math.max(metadata.height - 1, 1));
    if (safeTrim <= 0) {
      return null;
    }
    const finalHeight = Math.max(metadata.height - safeTrim, 1);
    if (finalHeight === metadata.height) {
      return null;
    }

    const trimmed = await sharp(buffer)
      .extract({
        left: 0,
        top: safeTrim,
        width: metadata.width,
        height: finalHeight
      })
      .png()
      .toBuffer();

    return {
      buffer: trimmed,
      width: metadata.width,
      height: finalHeight
    };
  } catch (error) {
    console.warn('[anchor] 裁剪缓冲失败', {
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function refineGeminiImageRegions(
  questions: GeminiQuestion[],
  options: { binaryPath?: string | null; imageMeta?: { width: number; height: number } | null }
): Promise<GeminiQuestion[]> {
  if (
    !options.binaryPath ||
    !options.imageMeta?.width ||
    !options.imageMeta?.height ||
    !SHOULD_USE_PIPELINE
  ) {
    return questions;
  }

  const refined: GeminiQuestion[] = [];

  for (const question of questions) {
    const regions = question.image_regions ?? [];
    if (!regions.length) {
      refined.push(question);
      continue;
    }

    const updatedRegions: GeminiImageRegion[] = [];

    for (const region of regions) {
      const fallbackBox =
        (Array.isArray(region.rough_bbox) && region.rough_bbox.length === 4
          ? (region.rough_bbox as NormalizedBox)
          : undefined) ??
        (Array.isArray(region.box_2d) && region.box_2d.length === 4
          ? (region.box_2d as NormalizedBox)
          : undefined);

      if (!fallbackBox) {
        updatedRegions.push(region);
        continue;
      }

      try {
        const allowUpgrade = process.env.AUTO_SCALE_LEGACY_BOX === 'true';
        const { box: normalizedBox, upgraded } = allowUpgrade
          ? upgradeLegacyBox(fallbackBox)
          : { box: fallbackBox, upgraded: false };

        if (upgraded) {
          console.warn('[pipeline] upgraded legacy box scale 0-100 -> 0-1000', {
            question: question.number,
            regionIndex: regions.indexOf(region),
            original: fallbackBox,
            upgraded: normalizedBox
          });
        }

        const response = await callCoordinateRefiner({
          roughBox: normalizedBox,
          binaryPath: options.binaryPath,
          imageMeta: options.imageMeta
        });

        if (response?.status === 'ok' && Array.isArray(response.refined_bbox)) {
          updatedRegions.push({
            ...region,
            rough_bbox: normalizedBox,
            box_2d: response.refined_bbox as NormalizedBox,
            source: 'cv'
          });
        } else {
          updatedRegions.push({
            ...region,
            rough_bbox: normalizedBox
          });
        }
      } catch (error) {
        console.warn('[pipeline] refine-bbox 处理单个区域失败', {
          message: error instanceof Error ? error.message : String(error)
        });
        updatedRegions.push({
          ...region,
          rough_bbox: fallbackBox
        });
      }
    }

    refined.push({
      ...question,
      image_regions: updatedRegions,
      images: updatedRegions
    });
  }

  return refined;
}

type AnchorHook = (context: CropHookContext) => Promise<CropHookResult | void>;

function upgradeLegacyBox(
  box: NormalizedBox
): { box: NormalizedBox; upgraded: boolean } {
  const maxVal = Math.max(...box);
  // 认为 max <=120 为旧 0-100 制式
  if (maxVal <= 120) {
    const scaled = box.map((v) => Math.round(v * 10)) as NormalizedBox;
    return { box: scaled, upgraded: true };
  }
  return { box, upgraded: false };
}

function createAnchorHook(config: { taskId: string }): AnchorHook | undefined {
  if (!SHOULD_USE_PIPELINE) {
    return undefined;
  }

  return async function anchorHook(context: CropHookContext): Promise<CropHookResult | void> {
    const verifyEnabled = process.env.ANCHOR_VERIFY_ENABLED === 'true';
    const anchorText = context.regionMeta?.anchor_text_prev?.trim();
    const minLength =
      Number.parseInt(process.env.ANCHOR_VERIFY_MIN_LENGTH || '5', 10) || 5;

    const shouldVerify =
      verifyEnabled &&
      Boolean(anchorText) &&
      (context.regionIndex > 0 || (anchorText?.length || 0) >= minLength);

    if (!shouldVerify) {
      return undefined;
    }

    let tempPath: string | null = null;
    try {
      tempPath = await persistAnchorTempFile(
        context.buffer,
        config.taskId,
        context.questionNumber,
        context.regionIndex
      );
      const anchorResult = await callAnchorVerification({
        anchorTextPrev: anchorText!, // 已在 shouldVerify 中验证非空
        imagePath: tempPath,
        stripRatio: 0.12
      });

      if (!anchorResult) {
        return {
          assetOverrides: {
            anchor_verification: {
              matched: false,
              ocr_text: undefined
            }
          }
        };
      }

      let replacementBuffer: Buffer | undefined;
      let trimmedSize: { width: number; height: number } | undefined;

      if (anchorResult.matched && typeof anchorResult.trim_start === 'number') {
        const trimmed = await trimBufferFromTop(context.buffer, anchorResult.trim_start);
        if (trimmed) {
          replacementBuffer = trimmed.buffer;
          trimmedSize = {
            width: trimmed.width,
            height: trimmed.height
          };
        }
      }

      const verification = {
        matched: Boolean(anchorResult.matched),
        ocr_text: anchorResult.ocr_text,
        confidence: anchorResult.confidence
      };

      return {
        buffer: replacementBuffer,
        assetOverrides: {
          anchor_verification: verification,
          ...(trimmedSize ? { trimmedSize } : {})
        }
      };
    } catch (error) {
      console.warn('[anchor] inclusion-rejection 失败', {
        question: context.questionNumber,
        regionIndex: context.regionIndex + 1,
        message: error instanceof Error ? error.message : String(error)
      });
      return undefined;
    } finally {
      if (tempPath) {
        fsPromises.unlink(tempPath).catch(() => {});
      }
    }
  };
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

  // P0修复: 兜底全页框跳过 fullImageThreshold 检查
  const isFallback = (region as any)?.source === 'fallback';
  if (!isFallback && !isValidImageBox(rect, imageMeta)) {
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
  type: 'choice' | 'fill' | 'essay' | 'proof';
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
  let ingestUploadLatencyMs: number | null = null;
  let supabaseBandwidthMb: number | null = null;
  let pythonProcessingMs: number | null = null;

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
    const downloadedBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);
    downloadCompletedAt = Date.now();
    downloadedFileBytes = downloadedBuffer.length;
    console.log('文件下载完成', { size: downloadedBuffer.length });

    let originalImageBuffer: Buffer = downloadedBuffer;
    let geminiInputBuffer: Buffer = downloadedBuffer;
    let binaryImagePath: string | null = null;
    let imageMeta: { width: number; height: number } | null = null;

    const pipelineArtifacts = await callPipelinePreprocess(taskId, downloadedBuffer, fileName);
    if (pipelineArtifacts?.meta?.width && pipelineArtifacts.meta?.height) {
      imageMeta = {
        width: pipelineArtifacts.meta.width,
        height: pipelineArtifacts.meta.height
      };
    }

    if (pipelineArtifacts?.artifacts?.original_path) {
      const buffer = await readLocalFile(pipelineArtifacts.artifacts.original_path);
      if (buffer) {
        originalImageBuffer = buffer;
      }
    }

    if (pipelineArtifacts?.artifacts?.grid_path) {
      const buffer = await readLocalFile(pipelineArtifacts.artifacts.grid_path);
      if (buffer) {
        geminiInputBuffer = buffer;
      }
    } else {
      geminiInputBuffer = originalImageBuffer;
    }

    if (pipelineArtifacts?.artifacts?.binary_path) {
      binaryImagePath = pipelineArtifacts.artifacts.binary_path;
    }

    if (!imageMeta) {
      try {
        const metadata = await sharp(originalImageBuffer).metadata();
        if (metadata.width && metadata.height) {
          imageMeta = {
            width: metadata.width,
            height: metadata.height
          };
        }
      } catch (error) {
        console.warn('[数据转换] 读取原图尺寸失败', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const { parseQuestionWithCascadingFromBuffer } = await import('./gemini-vision-client');
    console.log('[Gemini级联] 开始解析试卷（从Buffer）', { taskId, fileUrl });
    await supabase
      .from('upload_tasks')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const geminiResult = await parseQuestionWithCascadingFromBuffer(geminiInputBuffer, fileUrl || undefined);

    const validationReasons = geminiResult.validation?.reasons ?? [];
    const blockingReasons = validationReasons.filter(reason => reason !== '缺少配图标注');
    if (!geminiResult.validation?.passed && blockingReasons.length > 0) {
      throw new Error(`Gemini 数据校验失败: ${blockingReasons.join('；')}`);
    }
    if (!geminiResult.validation?.passed && blockingReasons.length === 0) {
      console.warn('[Gemini校验] 缺少配图标注，继续处理（降级无图模式）', {
        taskId,
        fileUrl
      });
    }

    if (!geminiResult.questions.length) {
      throw new Error('Gemini 未识别到任何题目');
    }

    const refinedGeminiQuestions = await refineGeminiImageRegions(geminiResult.questions, {
      binaryPath: binaryImagePath,
      imageMeta
    });

    const invalidRegionQuestions: string[] = [];
    const regionMetaByQuestion: Record<string, RegionMeta[]> = {};

    const processedQuestions: ProcessedQuestion[] = refinedGeminiQuestions.map((question) => {
      const resolvedType = question.meta?.type ?? inferQuestionType(question);
      const resolvedDifficulty = question.meta?.difficulty ?? 'medium';
      const resolvedTags = question.meta?.tags ?? [];

      const normalizedRegions: ImageRegion[] = [];
      const channelMeta: RegionMeta[] = [];

      for (const region of question.image_regions ?? []) {
        const normalized = normalizeRegion(region, imageMeta, { taskId, questionNumber: question.number });
        if (!normalized) {
          continue;
        }
        normalizedRegions.push(normalized);
        channelMeta.push({
          anchor_text_prev: region.anchor_text_prev ?? undefined,
          anchor_text_next: region.anchor_text_next ?? undefined,
          rough_bbox:
            (Array.isArray(region.rough_bbox) && region.rough_bbox.length === 4
              ? (region.rough_bbox as NormalizedBox)
              : undefined) ??
            (Array.isArray(region.box_2d) && region.box_2d.length === 4
              ? (region.box_2d as NormalizedBox)
              : undefined)
        });
      }

      if (channelMeta.length) {
        regionMetaByQuestion[question.number] = channelMeta;
      }

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
      console.warn('[upload-process] 部分题目配图坐标无效，降级为无图', {
        taskId,
        invalid: invalidRegionQuestions.slice(0, 5)
      });
    }

    await supabase
      .from('upload_tasks')
      .update({ progress: 50, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const cropInput: QuestionWithRegions[] = processedQuestions.map(q => ({
      number: q.number,
      image_regions: q.image_regions,
      region_meta: regionMetaByQuestion[q.number] ?? []
    }));

    await supabase
      .from('upload_tasks')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const anchorHook = createAnchorHook({ taskId });
    const cropSummary = await cropAndUploadQuestionImages(
      taskId,
      originalImageBuffer,
      cropInput,
      anchorHook
        ? {
            onBeforeUpload: anchorHook
          }
        : undefined
    );
    const questionsWithImages = processedQuestions.filter(q => q.image_regions.length > 0);
    const questionsWithAssets = questionsWithImages.filter(q => (cropSummary.assetsByQuestion[q.number]?.length ?? 0) > 0);

    if (questionsWithImages.length > 0 && questionsWithAssets.length === 0) {
      console.warn('[upload-process] 检测到配图题目，但裁剪结果全部为空，降级为无图', {
        taskId,
        questionNumbers: questionsWithImages.map(q => q.number)
      });
    }

    const missingAssets = questionsWithImages.filter(q => !(cropSummary.assetsByQuestion[q.number]?.length));
    if (missingAssets.length > 0) {
      console.warn('[upload-process] 部分配图裁剪失败（将继续处理）', {
        taskId,
        failedQuestions: missingAssets.map(q => q.number),
        totalWithImages: questionsWithImages.length,
        successCount: questionsWithAssets.length,
        failureRate: `${Math.round((missingAssets.length / questionsWithImages.length) * 100)}%`
      });

      // 如果失败率 > 80%，仅记录告警，不再中断整个任务
      if (missingAssets.length / questionsWithImages.length > 0.8) {
        console.warn('[upload-process] 配图裁剪失败率过高（跳过中断）', {
          taskId,
          failed: missingAssets.map(q => q.number).slice(0, 5),
          totalWithImages: questionsWithImages.length
        });
      }
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

    if (downloadCompletedAt != null) {
      ingestUploadLatencyMs = uploadCreatedAt
        ? downloadCompletedAt - uploadCreatedAt.getTime()
        : downloadCompletedAt - processingStartTime;
    }

    if (downloadedFileBytes != null) {
      supabaseBandwidthMb = Number((downloadedFileBytes / (1024 * 1024)).toFixed(3));
    }

    pythonProcessingMs = Date.now() - processingStartTime;

    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      progress: 100,
      total_questions: totalQuestions,
      image_questions: imageQuestionCount,
      image_success_rate: imageSuccessRate,
      ingest_upload_latency_ms: ingestUploadLatencyMs,
      supabase_bandwidth_mb: supabaseBandwidthMb,
      python_processing_ms: pythonProcessingMs,
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
    if (pythonProcessingMs == null) {
      pythonProcessingMs = Date.now() - processingStartTime;
    }
    if (supabaseBandwidthMb == null) {
      supabaseBandwidthMb =
        downloadedFileBytes != null
          ? Number((downloadedFileBytes / (1024 * 1024)).toFixed(3))
          : null;
    }
    if (ingestUploadLatencyMs == null) {
      ingestUploadLatencyMs =
        downloadCompletedAt != null
          ? uploadCreatedAt
            ? downloadCompletedAt - uploadCreatedAt.getTime()
            : downloadCompletedAt - processingStartTime
          : null;
    }

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
