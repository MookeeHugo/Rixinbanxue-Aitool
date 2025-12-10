/**
 * Question image cropping & upload helper
 * Crop figures detected by Gemini Vision and upload to Supabase Storage
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import type {
  ImageRegion,
  NormalizedBox,
  QuestionImageAsset
} from './types';
import { isValidImageBox } from './coordinates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RegionMeta {
  anchor_text_prev?: string;
  anchor_text_next?: string;
  rough_bbox?: NormalizedBox;
}

export interface QuestionWithRegions {
  number: string;
  image_regions?: ImageRegion[];
  region_meta?: RegionMeta[];
}

export interface CropHookContext {
  questionNumber: string;
  regionIndex: number;
  region: ImageRegion;
  regionMeta?: RegionMeta;
  buffer: Buffer;
}

export interface CropHookResult {
  buffer?: Buffer;
  assetOverrides?: Partial<QuestionImageAsset>;
}

export interface CropOptions {
  onBeforeUpload?: (context: CropHookContext) => Promise<CropHookResult | void>;
}

export interface CropSummary {
  assetsByQuestion: Record<string, QuestionImageAsset[]>;
  totalRegions: number;
  succeededRegions: number;
  failedRegions: number;
}

export async function cropAndUploadQuestionImages(
  taskId: string,
  originalImageBuffer: Buffer,
  questions: QuestionWithRegions[],
  options?: CropOptions
): Promise<CropSummary> {
  console.log('[image-crop] start', {
    taskId,
    questionCount: questions.length
  });

  const buffer = originalImageBuffer;
  const metadata = await sharp(buffer).metadata();
  const imageWidth = metadata.width || 0;
  const imageHeight = metadata.height || 0;

  // P0修复: 检查图片元数据有效性
  if (!imageWidth || !imageHeight || imageWidth === 0 || imageHeight === 0) {
    throw new Error(`无效的图片元数据: width=${imageWidth}, height=${imageHeight}`);
  }

  console.log('[image-crop] image size', { imageWidth, imageHeight });

  const assetsByQuestion: Record<string, QuestionImageAsset[]> = {};
  let totalRegions = 0;
  let succeededRegions = 0;
  let filteredRegions = 0;
  let invalidRegions = 0;

  const paddingPx = Math.max(
    20,
    Math.round(Math.min(imageWidth || 0, imageHeight || 0) * 0.02)
  );

  for (const question of questions) {
    const regions = question.image_regions ?? [];
    if (regions.length === 0) {
      continue;
    }

    for (let index = 0; index < regions.length; index++) {
      const region = regions[index];
      totalRegions += 1;

      const { x, y, width, height } = region;
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        console.warn(`[image-crop] q${question.number} region ${index + 1} invalid`, {
          taskId,
          region
        });
        invalidRegions += 1;
        continue;
      }

      try {
        let left = Math.round(x) - paddingPx;
        let top = Math.round(y) - paddingPx;
        let right = Math.round(x + width) + paddingPx;
        let bottom = Math.round(y + height) + paddingPx;

        left = Math.max(0, left);
        top = Math.max(0, top);
        right = Math.min(imageWidth, right);
        bottom = Math.min(imageHeight, bottom);

        const finalWidth = right - left;
        const finalHeight = bottom - top;

        // Sharp 要求 left + width < imageWidth（严格小于），所以如果触及边界要留1px余量
        if (left + finalWidth >= imageWidth && finalWidth > 1) {
          const adjustedWidth = imageWidth - left - 1;
          console.warn(`[image-crop] 调整宽度避免触及右边界: ${finalWidth} -> ${adjustedWidth}`);
          right = left + adjustedWidth;
        }
        if (top + finalHeight >= imageHeight && finalHeight > 1) {
          const adjustedHeight = imageHeight - top - 1;
          console.warn(`[image-crop] 调整高度避免触及下边界: ${finalHeight} -> ${adjustedHeight}`);
          bottom = top + adjustedHeight;
        }

        const safeWidth = right - left;
        const safeHeight = bottom - top;

        if (safeWidth <= 0 || safeHeight <= 0) {
          console.warn(`[image-crop] q${question.number} region ${index + 1} adjusted invalid`, {
            taskId,
            originalRegion: region,
            adjusted: { left, top, width: safeWidth, height: safeHeight }
          });
          continue;
        }

        const pixelRect = { left, top, width: safeWidth, height: safeHeight };
        const imageMeta = { width: imageWidth, height: imageHeight };

        // P0修复: 检测是否为全页兜底框（coverage >= 95%），如果是则跳过 isValidImageBox 检查
        const widthCoverage = safeWidth / imageWidth;
        const heightCoverage = safeHeight / imageHeight;
        const isFallbackFullPage = widthCoverage >= 0.95 && heightCoverage >= 0.95;

        if (!isFallbackFullPage && !isValidImageBox(pixelRect, imageMeta)) {
          // 使用与 isValidImageBox 相同的阈值
          const minDimensionRatio = Number.parseFloat(process.env.CROP_MIN_DIMENSION_RATIO || '0.006');
          const maxAspectRatio = Number.parseFloat(process.env.CROP_MAX_ASPECT_RATIO || '18');
          const fullImageThreshold = Number.parseFloat(process.env.CROP_FULL_IMAGE_THRESHOLD || '0.99');

          const minDim = Math.max(20, Math.round(Math.min(imageWidth, imageHeight) * minDimensionRatio));
          const ratio = safeWidth / Math.max(1, safeHeight);

          let rejectReason = '未知原因';
          if (safeWidth < minDim || safeHeight < minDim) {
            rejectReason = `尺寸过小 (${safeWidth}x${safeHeight} < ${minDim}px, 阈值=${(minDimensionRatio * 100).toFixed(1)}%)`;
          } else if (ratio > maxAspectRatio || ratio < 1/maxAspectRatio) {
            rejectReason = `宽高比极端 (${ratio.toFixed(2)}, 限制=${(1/maxAspectRatio).toFixed(2)}~${maxAspectRatio})`;
          } else if (widthCoverage >= fullImageThreshold && heightCoverage >= fullImageThreshold) {
            rejectReason = `几乎覆盖全图 (宽=${(widthCoverage*100).toFixed(1)}%, 高=${(heightCoverage*100).toFixed(1)}%, 阈值=${(fullImageThreshold*100).toFixed(0)}%)`;
          }

          console.warn(`[image-crop] ❌ q${question.number} region ${index + 1} filtered by validation`, {
            taskId,
            questionNumber: question.number,
            regionIndex: index + 1,
            originalRegion: region,
            adjustedPixels: pixelRect,
            imageMeta,
            reason: rejectReason,
            metrics: {
              size: `${safeWidth}x${safeHeight}`,
              ratio: ratio.toFixed(2),
              coverage: `${(widthCoverage*100).toFixed(1)}% x ${(heightCoverage*100).toFixed(1)}%`,
              minDimension: minDim
            }
          });
          filteredRegions += 1;
          continue;
        }

        // 确保所有 sharp 参数都是整数
        const intLeft = Math.floor(left);
        const intTop = Math.floor(top);
        const intWidth = Math.floor(safeWidth);
        const intHeight = Math.floor(safeHeight);

        // P0修复: 检测NaN和Infinity
        if (!Number.isFinite(intLeft) || !Number.isFinite(intTop) ||
            !Number.isFinite(intWidth) || !Number.isFinite(intHeight)) {
          console.error(`[image-crop] q${question.number} region ${index + 1} 包含无效坐标`, {
            taskId,
            intLeft,
            intTop,
            intWidth,
            intHeight,
            originalRegion: region
          });
          continue;
        }

        console.log(`[image-crop] 准备提取 q${question.number} region ${index + 1}`, {
          taskId,
          sharp_params: { left: intLeft, top: intTop, width: intWidth, height: intHeight },
          image_size: { imageWidth, imageHeight },
          verification: {
            left_plus_width: intLeft + intWidth,
            top_plus_height: intTop + intHeight,
            within_bounds: intLeft + intWidth <= imageWidth && intTop + intHeight <= imageHeight
          }
        });

        const { data: croppedBuffer, info } = await sharp(buffer)
          .extract({
            left: intLeft,
            top: intTop,
            width: intWidth,
            height: intHeight
          })
          .png()
          .toBuffer({ resolveWithObject: true });

        let uploadBuffer = croppedBuffer;
        let hookOverrides: Partial<QuestionImageAsset> | undefined;
        const regionMeta = question.region_meta?.[index];

        if (options?.onBeforeUpload) {
          try {
            const hookResult = await options.onBeforeUpload({
              questionNumber: question.number,
              regionIndex: index,
              region,
              regionMeta,
              buffer: croppedBuffer
            });
            if (hookResult?.buffer) {
              uploadBuffer = hookResult.buffer;
            }
            if (hookResult?.assetOverrides) {
              hookOverrides = hookResult.assetOverrides;
            }
          } catch (hookError) {
            console.warn(
              `[image-crop] onBeforeUpload hook failed for q${question.number} region ${
                index + 1
              }`,
              {
                error: hookError instanceof Error ? hookError.message : String(hookError)
              }
            );
          }
        }

        const uniqueId = `${taskId}-q${question.number}-${index + 1}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const fileName = `ai-question-bank/${taskId}/q${question.number}-${index + 1}-${uniqueId}.png`;

        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, uploadBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`[image-crop] q${question.number} region ${index + 1} upload failed`, {
            error: uploadError.message,
            code: uploadError.name
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('question-images')
          .getPublicUrl(fileName);

        succeededRegions += 1;
        if (!assetsByQuestion[question.number]) {
          assetsByQuestion[question.number] = [];
        }

        const asset: QuestionImageAsset = {
          id: uniqueId,
          key: fileName,
          url: urlData.publicUrl,
          final_image_path: fileName,
          questionNumber: question.number,
          order: index + 1,
          placeholder: null,
          used: index === 0,
          region,
          source: 'ai',
          padding: {
            px: paddingPx,
            ratio: 0.02
          },
          trimOffset: {
            left: info.trimOffsetLeft ?? 0,
            top: info.trimOffsetTop ?? 0
          },
          trimmedSize: {
            width: info.width,
            height: info.height
          }
        };

        if (hookOverrides) {
          Object.assign(asset, hookOverrides);
        }

        assetsByQuestion[question.number].push(asset);
      } catch (error) {
        console.error(`[image-crop] q${question.number} region ${index + 1} failed`, {
          error: error instanceof Error ? error.message : String(error),
          region
        });
      }
    }
  }

  const failedRegions = totalRegions - succeededRegions;
  console.log('[image-crop] completed', {
    taskId,
    totalRegions,
    succeededRegions,
    failedRegions,
    filteredRegions,
    invalidRegions,
    successRate: totalRegions ? `${Math.round((succeededRegions / totalRegions) * 100)}%` : 'N/A'
  });

  return {
    assetsByQuestion,
    totalRegions,
    succeededRegions,
    failedRegions
  };
}

export async function deleteCroppedImagesForTask(taskId: string): Promise<void> {
  console.log('[image-delete] start', { taskId });

  try {
    const { data: files, error: listError } = await supabase.storage
      .from('question-images')
      .list(`ai-question-bank/${taskId}`);

    if (listError) {
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log('[image-delete] no files to delete');
      return;
    }

    const filePaths = files.map(file => `ai-question-bank/${taskId}/${file.name}`);

    const { error: deleteError } = await supabase.storage
      .from('question-images')
      .remove(filePaths);

    if (deleteError) {
      throw deleteError;
    }

    console.log('[image-delete] completed', {
      deletedCount: filePaths.length
    });

  } catch (error) {
    console.error('[image-delete] failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
