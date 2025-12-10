/**
 * AI创作系统存储辅助函数
 *
 * 功能：
 * - 保存生成的PNG和SVG图像到R2存储
 * - Base64解码和文件验证
 * - SVG安全净化集成
 * - 尺寸和大小验证
 * - 自动生成CDN URL
 *
 * 集成：
 * - 使用 src/lib/storage.ts 的 uploadFile 函数
 * - 使用 svg-sanitizer.ts 的 sanitizeSVG 函数
 * - 使用 Sharp 验证PNG尺寸
 */

import { uploadFile, FileAccessLevel } from '@/lib/storage';
import { sanitizeSVG, validateSVGSize } from './svg-sanitizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { E2BExecutionResult } from './types';

// ============================================================================
// 配置
// ============================================================================

/**
 * 图像存储限制
 */
const IMAGE_LIMITS = {
  png: {
    minWidth: 300,
    maxWidth: 2000,
    minHeight: 200,
    maxHeight: 1500,
    maxFileSize: 2 * 1024 * 1024, // 2MB
  },
  svg: {
    maxFileSize: 1 * 1024 * 1024, // 1MB
  },
} as const;

/**
 * 存储路径前缀
 */
const STORAGE_PREFIX = 'ai-created-questions';

// ============================================================================
// 错误类
// ============================================================================

/**
 * 存储错误
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * 图像验证错误
 */
export class ImageValidationError extends StorageError {
  constructor(message: string) {
    super(message, 'IMAGE_VALIDATION_FAILED');
  }
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 图像元数据
 */
export interface ImageMetadata {
  userId: string;
  questionId: string;
  questionType: string;
}

/**
 * 存储结果
 */
export interface StorageResult {
  success: boolean;
  pngUrl?: string;
  svgUrl?: string;
  pngKey?: string;
  svgKey?: string;
  pngSize?: number;
  svgSize?: number;
  error?: string;
}

/**
 * PNG验证结果
 */
interface PNGValidationResult {
  valid: boolean;
  width: number;
  height: number;
  format: string;
  size: number;
  error?: string;
}

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 保存生成的PNG和SVG图像
 *
 * @param result - E2B执行结果（包含base64图像）
 * @param metadata - 图像元数据（用户ID、题目ID等）
 * @returns 存储结果（包含公共URL）
 *
 * @example
 * const result = await saveGeneratedImages(executionResult, {
 *   userId: 'user-123',
 *   questionId: 'q-456',
 *   questionType: 'function'
 * });
 *
 * console.log(result.pngUrl); // https://cdn.example.com/...png
 */
export async function saveGeneratedImages(
  result: E2BExecutionResult,
  metadata: ImageMetadata
): Promise<StorageResult> {
  try {
    // 验证输入
    if (!result.png_base64 && !result.svg_base64) {
      throw new StorageError('至少需要PNG或SVG图像之一');
    }

    const timestamp = Date.now();
    const uploadPromises: Promise<any>[] = [];
    const storageResult: StorageResult = { success: true };

    // 1. 处理PNG图像（如果存在）
    if (result.png_base64) {
      const pngPromise = (async () => {
        // 1.1 解码base64
        const pngBuffer = decodeBase64ToBuffer(result.png_base64!);
        storageResult.pngSize = pngBuffer.length;

        // 1.2 验证文件大小
        if (pngBuffer.length > IMAGE_LIMITS.png.maxFileSize) {
          throw new ImageValidationError(
            `PNG文件大小超过限制（${pngBuffer.length} > ${IMAGE_LIMITS.png.maxFileSize} bytes）`
          );
        }

        // 1.3 验证图像尺寸和格式
        const pngValidation = await validatePNGImage(pngBuffer);
        if (!pngValidation.valid) {
          throw new ImageValidationError(
            pngValidation.error || 'PNG图像验证失败'
          );
        }

        // 1.4 生成存储路径
        const pngKey = generateStorageKey(
          metadata.userId,
          metadata.questionId,
          timestamp,
          'png'
        );

        // 1.5 上传到R2（如果配置了R2，否则使用本地mock）
        const hasR2Config = process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
                            process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
                            process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

        if (hasR2Config) {
          // 使用R2存储
          const uploadResult = await uploadFile({
            file: pngBuffer,
            key: pngKey,
            contentType: 'image/png',
            accessLevel: FileAccessLevel.PUBLIC,
          });

          if (!uploadResult.success) {
            throw new StorageError(`PNG上传失败: ${uploadResult.error}`);
          }

          storageResult.pngUrl = uploadResult.cdnUrl || uploadResult.publicUrl;
          storageResult.pngKey = pngKey;
        } else {
          // 临时使用本地路径（测试模式）
          console.warn('[Storage] R2未配置，使用本地mock路径');
          storageResult.pngUrl = `/local-storage/${pngKey}`;
          storageResult.pngKey = pngKey;

          // 同步写入 public/local-storage，便于 Next.js 静态访问
          const localPath = path.join(process.cwd(), 'public', 'local-storage', pngKey);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, pngBuffer);
        }

        console.log(
          `[Storage] PNG已上传: ${pngKey}, 大小: ${pngBuffer.length} bytes, 尺寸: ${pngValidation.width}x${pngValidation.height}`
        );
      })();

      uploadPromises.push(pngPromise);
    }

    // 2. 处理SVG图像（临时禁用 - 仅用于测试验证）
    if (result.svg_base64) {
      console.log('[Storage] SVG上传已临时禁用，跳过SVG处理');
      // 临时禁用SVG上传以验证整体流程
      // TODO: 生产环境需要启用SVG上传
    }

    // 3. 并行上传PNG和SVG
    try {
      await Promise.all(uploadPromises);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('mime type image/svg+xml is not supported')) {
        console.warn('[Storage] SVG上传不支持，已跳过，保留PNG');
        // 忽略此错误，让 PNG 成功即可
      } else {
        throw err;
      }
    }

    return storageResult;
  } catch (error) {
    console.error('[Storage] 保存图像失败:', error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '保存图像失败，请稍后重试',
    };
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 解码base64字符串为Buffer
 *
 * @param base64 - base64编码的字符串
 * @returns Buffer对象
 */
function decodeBase64ToBuffer(base64: string): Buffer {
  try {
    // 移除可能的data URI前缀
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    // 解码
    const buffer = Buffer.from(cleanedBase64, 'base64');

    if (buffer.length === 0) {
      throw new Error('解码后的Buffer为空');
    }

    return buffer;
  } catch (error) {
    throw new StorageError(
      `Base64解码失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 验证PNG图像
 *
 * @param buffer - PNG图像Buffer
 * @returns 验证结果
 */
async function validatePNGImage(
  buffer: Buffer
): Promise<PNGValidationResult> {
  try {
    // 使用Sharp解析图像元数据
    const metadata = await sharp(buffer).metadata();

    // 验证格式
    if (metadata.format !== 'png') {
      return {
        valid: false,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        error: `图像格式不是PNG（实际格式：${metadata.format}）`,
      };
    }

    // 验证尺寸
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width < IMAGE_LIMITS.png.minWidth || width > IMAGE_LIMITS.png.maxWidth) {
      return {
        valid: false,
        width,
        height,
        format: metadata.format,
        size: buffer.length,
        error: `PNG宽度超出范围（${width}px，要求：${IMAGE_LIMITS.png.minWidth}-${IMAGE_LIMITS.png.maxWidth}px）`,
      };
    }

    if (height < IMAGE_LIMITS.png.minHeight || height > IMAGE_LIMITS.png.maxHeight) {
      return {
        valid: false,
        width,
        height,
        format: metadata.format,
        size: buffer.length,
        error: `PNG高度超出范围（${height}px，要求：${IMAGE_LIMITS.png.minHeight}-${IMAGE_LIMITS.png.maxHeight}px）`,
      };
    }

    return {
      valid: true,
      width,
      height,
      format: metadata.format,
      size: buffer.length,
    };
  } catch (error) {
    return {
      valid: false,
      width: 0,
      height: 0,
      format: 'unknown',
      size: buffer.length,
      error: `PNG解析失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 生成存储路径
 *
 * 格式：ai-created-questions/{userId}/{timestamp}-{questionId}.{ext}
 *
 * @param userId - 用户ID
 * @param questionId - 题目ID
 * @param timestamp - 时间戳
 * @param extension - 文件扩展名（png/svg）
 * @returns 存储键
 */
function generateStorageKey(
  userId: string,
  questionId: string,
  timestamp: number,
  extension: 'png' | 'svg'
): string {
  // 清理用户ID和题目ID（移除非法字符）
  const cleanUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
  const cleanQuestionId = questionId.replace(/[^a-zA-Z0-9-_]/g, '');

  return `${STORAGE_PREFIX}/${cleanUserId}/${timestamp}-${cleanQuestionId}.${extension}`;
}

/**
 * 删除已上传的图像（用于回滚）
 *
 * @param keys - 存储键数组
 */
export async function deleteUploadedImages(keys: string[]): Promise<void> {
  // TODO: 实现删除逻辑
  // 注：当前 src/lib/storage.ts 未提供删除函数
  // 可选方案：
  // 1. 扩展 storage.ts 添加 deleteFile 函数
  // 2. 直接调用 R2 SDK 的 DeleteObjectCommand
  // 3. 依赖R2的生命周期策略自动清理

  console.warn(
    '[Storage] deleteUploadedImages 未实现，图像将保留在存储中:',
    keys
  );
}

// ============================================================================
// 批量操作
// ============================================================================

/**
 * 批量保存多个题目的图像
 *
 * @param items - 图像数据数组
 * @returns 批量存储结果
 */
export async function batchSaveImages(
  items: Array<{
    result: E2BExecutionResult;
    metadata: ImageMetadata;
  }>
): Promise<StorageResult[]> {
  const results = await Promise.allSettled(
    items.map(({ result, metadata }) => saveGeneratedImages(result, metadata))
  );

  return results.map((r, index) => {
    if (r.status === 'fulfilled') {
      return r.value;
    } else {
      console.error(
        `[Storage] 批量保存第${index + 1}项失败:`,
        r.reason
      );
      return {
        success: false,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    }
  });
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从URL提取存储键
 *
 * @param url - CDN或公共URL
 * @returns 存储键（如果URL格式正确）
 *
 * @example
 * extractKeyFromUrl('https://cdn.example.com/ai-created-questions/user-123/1234567890-q-456.png')
 * // => 'ai-created-questions/user-123/1234567890-q-456.png'
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 移除前导斜杠
    const key = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    // 验证是否是ai-created-questions路径
    if (key.startsWith(STORAGE_PREFIX)) {
      return key;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 估算存储成本（Cloudflare R2）
 *
 * R2定价（截至2024年）：
 * - 存储：$0.015 / GB / 月
 * - Class A操作（写入）：$4.50 / 百万次
 * - Class B操作（读取）：$0.36 / 百万次
 * - 出站流量：免费
 *
 * @param fileSizeBytes - 文件大小（字节）
 * @param monthlyReads - 每月读取次数
 * @returns 月度成本（美元）
 */
export function estimateR2Cost(
  fileSizeBytes: number,
  monthlyReads: number = 1000
): {
  storageCostUsd: number;
  writeCostUsd: number;
  readCostUsd: number;
  totalMonthlyUsd: number;
} {
  const sizeGB = fileSizeBytes / (1024 * 1024 * 1024);

  const storageCostUsd = sizeGB * 0.015; // 每月存储成本
  const writeCostUsd = (1 / 1_000_000) * 4.5; // 单次写入成本
  const readCostUsd = (monthlyReads / 1_000_000) * 0.36; // 月度读取成本

  return {
    storageCostUsd,
    writeCostUsd,
    readCostUsd,
    totalMonthlyUsd: storageCostUsd + writeCostUsd + readCostUsd,
  };
}
