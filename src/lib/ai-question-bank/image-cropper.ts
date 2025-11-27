/**
 * 图片裁剪工具 - 使用sharp库裁剪题目配图
 * @description 根据AI识别的配图区域坐标，从原图中裁剪出单独的配图
 */

import { uploadFile, FileAccessLevel } from '@/lib/storage';
import type { ImageRegion, QuestionImageAsset, QuestionImagePlaceholder } from './types';

interface CropUploadResult {
  url: string;
  isBlank: boolean;
  key?: string;
  stats?: {
    brightness?: number;
    contrast?: number;
    bufferSize: number;
  };
}

/**
 * 动态导入Sharp（避免在action-browser环境中加载native模块）
 */
async function loadSharp() {
  const sharpModule = await import('sharp');
  return sharpModule.default;
}

/**
 * 裁剪图片并上传到存储
 * @param originalBuffer 原始图片Buffer
 * @param region 裁剪区域坐标
 * @param targetPath 目标存储路径（如 ai-question-bank/{userId}/question-1-image.png）
 * @returns 裁剪后的图片URL
 */
export async function cropAndUploadImage(
  originalBuffer: Buffer,
  region: ImageRegion,
  targetPath: string
): Promise<CropUploadResult> {
  try {
    console.log('[图片裁剪] 开始裁剪', {
      targetPath,
      region: `(${region.x}, ${region.y}) ${region.width}x${region.height}`
    });

    // 动态加载sharp
    const sharp = await loadSharp();

    // 使用sharp裁剪图片
    const croppedBuffer = await sharp(originalBuffer)
      .extract({
        left: Math.max(0, Math.round(region.x)),
        top: Math.max(0, Math.round(region.y)),
        width: Math.round(region.width),
        height: Math.round(region.height)
      })
      .png() // 统一转换为PNG格式
      .toBuffer();

    const stats = await sharp(croppedBuffer)
      .stats()
      .catch(() => null);

    let brightness: number | undefined;
    let contrast: number | undefined;
    let isBlank = false;

    if (stats && stats.channels.length >= 3) {
      const rgbChannels = stats.channels.slice(0, 3);
      brightness = rgbChannels.reduce((sum, channel) => sum + channel.mean, 0) / rgbChannels.length;
      contrast = rgbChannels.reduce((sum, channel) => sum + channel.stdev, 0) / rgbChannels.length;
      isBlank = brightness > 245 && contrast < 10;
    }

    console.log('[图片裁剪] 裁剪完成', {
      originalSize: originalBuffer.length,
      croppedSize: croppedBuffer.length,
      reduction: `${((1 - croppedBuffer.length / originalBuffer.length) * 100).toFixed(1)}%`,
      brightness,
      contrast,
      isBlank
    });

    // 上传到存储（使用PUBLIC访问级别，题目配图无需保密）
    const uploadResult = await uploadFile({
      file: croppedBuffer,
      key: targetPath,
      accessLevel: FileAccessLevel.PUBLIC,
      contentType: 'image/png'
    });

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || '上传裁剪图片失败');
    }

    const publicUrl = uploadResult.publicUrl ?? uploadResult.cdnUrl;
    if (!publicUrl) {
      throw new Error('裁剪图片缺少可公开访问的URL');
    }

    console.log('[图片裁剪] 上传成功', {
      path: uploadResult.key,
      url: publicUrl
    });

    return {
      url: publicUrl,
      isBlank,
      key: uploadResult.key || targetPath,
      stats: {
        brightness,
        contrast,
        bufferSize: croppedBuffer.length
      }
    };

  } catch (error) {
    console.error('[图片裁剪] 失败', {
      targetPath,
      region,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`图片裁剪失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 批量裁剪题目配图
 * @param originalBuffer 原始图片Buffer
 * @param questions 包含配图区域的题目列表
 * @param userId 用户ID
 * @param taskId 任务ID
 * @returns 题目ID到裁剪图片URL的映射
 */
export async function cropQuestionImages(
  originalBuffer: Buffer,
  questions: Array<{ number: string; image_region?: ImageRegion; images?: QuestionImagePlaceholder[] }>,
  userId: string,
  taskId: string
): Promise<Record<string, QuestionImageAsset[]>> {
  const imageAssets: Record<string, QuestionImageAsset[]> = {};
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  try {
    const sharp = await loadSharp();
    const metadata = await sharp(originalBuffer).metadata();
    imageWidth = metadata.width ?? undefined;
    imageHeight = metadata.height ?? undefined;
  } catch (error) {
    console.warn('[图片裁剪] 无法读取原图尺寸，使用OCR坐标推算', error);
  }

  const dimensionForPadding = Math.max(imageWidth ?? 0, imageHeight ?? 0, 800);
  const paddingCandidates = [
    0,
    Math.round(dimensionForPadding * 0.02),
    Math.round(dimensionForPadding * 0.035)
  ];

  for (const question of questions) {
    if (!question.image_region) {
      console.log('[图片裁剪] 跳过无配图的题目', { number: question.number });
      continue;
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const targetPath = `ai-question-bank/${userId}/question-${taskId}-${question.number}-${timestamp}-${random}.png`;

    let croppedAsset: QuestionImageAsset | null = null;
    let lastError: string | null = null;

    for (const padding of paddingCandidates) {
      const expandedRegion = expandImageRegion(
        question.image_region,
        padding,
        imageWidth,
        imageHeight
      );

      if (!validateImageRegion(expandedRegion, imageWidth, imageHeight)) {
        continue;
      }

      try {
        const result = await cropAndUploadImage(originalBuffer, expandedRegion, targetPath);

        if (result.isBlank && padding !== paddingCandidates[paddingCandidates.length - 1]) {
          console.warn('[图片裁剪] 裁剪结果疑似空白，尝试更大区域', {
            questionNumber: question.number,
            padding,
            stats: result.stats
          });
          continue;
        }

        const existingCount = imageAssets[question.number]?.length ?? 0;
        croppedAsset = {
          id: result.key || targetPath,
          key: result.key || targetPath,
          url: result.url,
          questionNumber: question.number,
          order: existingCount + 1,
          placeholder: question.images?.[existingCount]?.placeholder ?? null,
          used: false
        };
        console.log('[图片裁剪] 配图裁剪成功', {
          questionNumber: question.number,
          croppedUrl: croppedAsset.url,
          padding,
          stats: result.stats
        });
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error('[图片裁剪] 尝试裁剪失败', {
          questionNumber: question.number,
          padding,
          error: lastError
        });
      }
    }

    if (croppedAsset) {
      if (!imageAssets[question.number]) {
        imageAssets[question.number] = [];
      }
      imageAssets[question.number].push(croppedAsset);
    } else {
      console.error('[图片裁剪] 题目配图处理失败', {
        questionNumber: question.number,
        lastError
      });
    }
  }

  const croppedCount = Object.values(imageAssets).reduce(
    (sum, list) => sum + list.length,
    0
  );

  console.log('[图片裁剪] 裁剪结果统计', {
    totalQuestions: questions.length,
    croppedImages: croppedCount
  });

  return imageAssets;
}

/**
 * 验证配图区域坐标的合理性
 * @param region 配图区域
 * @param imageWidth 原图宽度
 * @param imageHeight 原图高度
 * @returns 是否有效
 */
export function validateImageRegion(
  region: ImageRegion,
  imageWidth?: number,
  imageHeight?: number
): boolean {
  if (region.x < 0 || region.y < 0) {
    return false;
  }

  if (imageWidth && region.x + region.width > imageWidth) {
    return false;
  }

  if (imageHeight && region.y + region.height > imageHeight) {
    return false;
  }

  if (region.width < 50 || region.height < 50) {
    return false;
  }

  return true;
}

function expandImageRegion(
  region: ImageRegion,
  padding: number,
  imageWidth?: number,
  imageHeight?: number
): ImageRegion {
  if (padding <= 0) {
    return region;
  }

  const safeWidth = imageWidth ?? region.x + region.width + padding;
  const safeHeight = imageHeight ?? region.y + region.height + padding;

  const newX = Math.max(0, Math.round(region.x - padding));
  const newY = Math.max(0, Math.round(region.y - padding));
  const maxWidth = Math.max(0, safeWidth - newX);
  const maxHeight = Math.max(0, safeHeight - newY);

  return {
    x: newX,
    y: newY,
    width: Math.min(Math.round(region.width + padding * 2), maxWidth),
    height: Math.min(Math.round(region.height + padding * 2), maxHeight)
  };
}
