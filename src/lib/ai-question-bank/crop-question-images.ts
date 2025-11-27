/**
 * Question image cropping & upload helper
 * Crop figures detected by Gemini Vision and upload to Supabase Storage
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import type { ImageRegion, QuestionImageAsset } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QuestionWithRegions {
  number: string;
  image_regions?: ImageRegion[];
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
  questions: QuestionWithRegions[]
): Promise<CropSummary> {
  console.log('[image-crop] start', {
    taskId,
    questionCount: questions.length
  });

  const buffer = originalImageBuffer;
  const metadata = await sharp(buffer).metadata();
  const imageWidth = metadata.width || 0;
  const imageHeight = metadata.height || 0;

  console.log('[image-crop] image size', { imageWidth, imageHeight });

  const assetsByQuestion: Record<string, QuestionImageAsset[]> = {};
  let totalRegions = 0;
  let succeededRegions = 0;

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
          region
        });
        continue;
      }

      try {
        const PADDING = 10;
        let left = Math.round(x) - PADDING;
        let top = Math.round(y) - PADDING;
        let right = Math.round(x + width) + PADDING;
        let bottom = Math.round(y + height) + PADDING;

        left = Math.max(0, left);
        top = Math.max(0, top);
        right = Math.min(imageWidth, right);
        bottom = Math.min(imageHeight, bottom);

        const finalWidth = right - left;
        const finalHeight = bottom - top;

        if (finalWidth <= 0 || finalHeight <= 0) {
          console.warn(`[image-crop] q${question.number} region ${index + 1} adjusted invalid`, {
            originalRegion: region,
            adjusted: { left, top, width: finalWidth, height: finalHeight }
          });
          continue;
        }

        const croppedBuffer = await sharp(buffer)
          .extract({
            left,
            top,
            width: finalWidth,
            height: finalHeight
          })
          .png()
          .toBuffer();

        const uniqueId = `${taskId}-q${question.number}-${index + 1}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const fileName = `ai-question-bank/${taskId}/q${question.number}-${index + 1}-${uniqueId}.png`;

        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, croppedBuffer, {
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
          questionNumber: question.number,
          order: index + 1,
          placeholder: null,
          used: index === 0,
          region
        };

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
