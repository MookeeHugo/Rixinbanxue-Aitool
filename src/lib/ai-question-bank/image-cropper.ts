/**
 * 图片裁剪工具 - 使用sharp库裁剪题目配图
 * @description 根据AI识别的配图区域坐标，从原图中裁剪出单独的配图
 */

import { uploadFile, FileAccessLevel } from '@/lib/storage';
import type { ImageRegion } from './types';

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
): Promise<string> {
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

    console.log('[图片裁剪] 裁剪完成', {
      originalSize: originalBuffer.length,
      croppedSize: croppedBuffer.length,
      reduction: `${((1 - croppedBuffer.length / originalBuffer.length) * 100).toFixed(1)}%`
    });

    // 上传到存储
    const uploadResult = await uploadFile({
      file: croppedBuffer,
      key: targetPath,
      accessLevel: FileAccessLevel.PRIVATE,
      contentType: 'image/png'
    });

    console.log('[图片裁剪] 上传成功', {
      path: uploadResult.key,
      url: uploadResult.url
    });

    return uploadResult.key; // 返回相对路径，用于存储在数据库

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
  questions: Array<{ number: string; image_region?: ImageRegion }>,
  userId: string,
  taskId: string
): Promise<Record<string, string>> {
  const imageUrls: Record<string, string> = {};

  for (const question of questions) {
    if (!question.image_region) {
      console.log('[图片裁剪] 跳过无配图的题目', { number: question.number });
      continue;
    }

    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const targetPath = `ai-question-bank/${userId}/question-${taskId}-${question.number}-${timestamp}-${random}.png`;

      const croppedUrl = await cropAndUploadImage(
        originalBuffer,
        question.image_region,
        targetPath
      );

      imageUrls[question.number] = croppedUrl;

      console.log('[图片裁剪] 题目配图处理完成', {
        questionNumber: question.number,
        croppedUrl
      });

    } catch (error) {
      console.error('[图片裁剪] 题目配图处理失败', {
        questionNumber: question.number,
        error: error instanceof Error ? error.message : String(error)
      });
      // 继续处理下一题，不中断整个流程
    }
  }

  console.log('[图片裁剪] 批量处理完成', {
    totalQuestions: questions.length,
    croppedImages: Object.keys(imageUrls).length
  });

  return imageUrls;
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
  imageWidth: number,
  imageHeight: number
): boolean {
  // 检查坐标是否在图片范围内
  if (region.x < 0 || region.y < 0) {
    return false;
  }

  if (region.x + region.width > imageWidth || region.y + region.height > imageHeight) {
    return false;
  }

  // 检查区域大小是否合理（至少50x50像素）
  if (region.width < 50 || region.height < 50) {
    return false;
  }

  return true;
}
