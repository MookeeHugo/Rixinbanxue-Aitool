/**
 * 图片处理 Server Actions
 * @description 使用 Sharp 实现图片处理功能：降噪、锐化、旋转、透明背景等
 */

'use server'

import sharp from 'sharp'
import { uploadFile, downloadFile, FileAccessLevel, getSignedUrl } from '@/lib/storage'
import { generateFileKey } from '@/lib/ai-question-bank/utils'
import { createAuthenticatedSupabaseClient } from '@/lib/server/auth'
import type { ActionResult } from '@/lib/ai-question-bank/types'

// ============================================================================
// 类型定义
// ============================================================================

export interface ImageProcessingOptions {
  /** 降噪强度 (0-100) */
  denoise?: number
  /** 锐化强度 (0-100) */
  sharpen?: number
  /** 旋转角度 (0, 90, 180, 270) */
  rotate?: 0 | 90 | 180 | 270
  /** 是否移除背景使其透明 */
  removeBackground?: boolean
  /** 背景透明度阈值 (0-255)，用于移除接近白色的背景 */
  backgroundThreshold?: number
  /** 亮度调整 (-100 到 100) */
  brightness?: number
  /** 对比度调整 (-100 到 100) */
  contrast?: number
  /** 灰度化 */
  grayscale?: boolean
  /** 翻转 */
  flip?: 'horizontal' | 'vertical' | 'both'
  /** 裁剪区域 */
  crop?: {
    left: number
    top: number
    width: number
    height: number
  }
  /** 调整尺寸 */
  resize?: {
    width?: number
    height?: number
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  }
  /** 输出格式 */
  format?: 'jpeg' | 'png' | 'webp'
  /** 输出质量 (1-100) */
  quality?: number
}

export interface ProcessedImageResult {
  /** 处理后的图片 URL */
  url: string
  /** 存储路径 */
  path: string
  /** 图片宽度 */
  width: number
  /** 图片高度 */
  height: number
  /** 文件大小（字节） */
  size: number
  /** 文件格式 */
  format: string
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 将 Base64 数据转换为 Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  // 移除 data URL 前缀（如果存在）
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

/**
 * 应用亮度和对比度调整
 */
function applyBrightnessContrast(
  pipeline: sharp.Sharp,
  brightness?: number,
  contrast?: number
): sharp.Sharp {
  if (brightness === undefined && contrast === undefined) {
    return pipeline
  }

  // 计算线性变换参数
  // brightness: -100 到 100 映射到 -1 到 1
  // contrast: -100 到 100 映射到 0 到 2
  const b = ((brightness ?? 0) / 100)
  const c = 1 + ((contrast ?? 0) / 100)

  return pipeline.linear(c, b * 255)
}

/**
 * 移除白色/浅色背景使其透明
 */
async function removeWhiteBackground(
  buffer: Buffer,
  threshold: number = 240
): Promise<Buffer> {
  const image = sharp(buffer)
  const { width, height, channels } = await image.metadata()

  if (!width || !height) {
    throw new Error('无法获取图片尺寸')
  }

  // 确保图片有 alpha 通道
  const rawBuffer = await image
    .ensureAlpha()
    .raw()
    .toBuffer()

  // 处理每个像素
  const pixelCount = width * height
  const processedBuffer = Buffer.alloc(pixelCount * 4) // RGBA

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4
    const r = rawBuffer[offset]
    const g = rawBuffer[offset + 1]
    const b = rawBuffer[offset + 2]

    // 复制 RGB 值
    processedBuffer[offset] = r
    processedBuffer[offset + 1] = g
    processedBuffer[offset + 2] = b

    // 判断是否为白色/浅色背景
    if (r >= threshold && g >= threshold && b >= threshold) {
      // 设置为透明
      processedBuffer[offset + 3] = 0
    } else {
      // 保持不透明
      processedBuffer[offset + 3] = 255
    }
  }

  return sharp(processedBuffer, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png()
    .toBuffer()
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 处理图片
 * @param imageData - 图片数据（Base64 或 URL）
 * @param options - 处理选项
 * @returns 处理后的图片数据（Base64）
 */
export async function processImage(
  imageData: string,
  options: ImageProcessingOptions
): Promise<ActionResult<{ base64: string; width: number; height: number }>> {
  try {
    // 验证用户身份
    const supabase = createAuthenticatedSupabaseClient()
    if (!supabase) {
      return { success: false, error: '未登录，请先登录' }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: '未登录，请先登录' }
    }

    // 获取图片数据
    let buffer: Buffer
    if (imageData.startsWith('data:')) {
      buffer = base64ToBuffer(imageData)
    } else if (imageData.startsWith('http')) {
      // 从 URL 下载图片
      const response = await fetch(imageData)
      if (!response.ok) {
        return { success: false, error: '无法下载图片' }
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // 假设是存储路径，从存储下载
      const downloadResult = await downloadFile(imageData)
      if (!downloadResult) {
        return { success: false, error: '无法获取图片' }
      }
      buffer = downloadResult
    }

    // 创建 Sharp 实例
    let pipeline = sharp(buffer)

    // 获取原始元数据
    const metadata = await pipeline.metadata()

    // 1. 裁剪
    if (options.crop) {
      pipeline = pipeline.extract({
        left: Math.round(options.crop.left),
        top: Math.round(options.crop.top),
        width: Math.round(options.crop.width),
        height: Math.round(options.crop.height)
      })
    }

    // 2. 旋转
    if (options.rotate) {
      pipeline = pipeline.rotate(options.rotate)
    }

    // 3. 翻转
    if (options.flip) {
      if (options.flip === 'horizontal' || options.flip === 'both') {
        pipeline = pipeline.flop()
      }
      if (options.flip === 'vertical' || options.flip === 'both') {
        pipeline = pipeline.flip()
      }
    }

    // 4. 调整尺寸
    if (options.resize) {
      pipeline = pipeline.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'inside',
        withoutEnlargement: true
      })
    }

    // 5. 灰度化
    if (options.grayscale) {
      pipeline = pipeline.grayscale()
    }

    // 6. 亮度和对比度
    pipeline = applyBrightnessContrast(pipeline, options.brightness, options.contrast)

    // 7. 降噪（使用 median 滤波）
    if (options.denoise && options.denoise > 0) {
      // 根据降噪强度计算 median 窗口大小 (1-5)
      const medianSize = Math.max(1, Math.min(5, Math.ceil(options.denoise / 20)))
      // median 必须是奇数
      const oddMedianSize = medianSize % 2 === 0 ? medianSize + 1 : medianSize
      pipeline = pipeline.median(oddMedianSize)
    }

    // 8. 锐化
    if (options.sharpen && options.sharpen > 0) {
      // 根据锐化强度计算参数
      const sigma = 0.5 + (options.sharpen / 100) * 1.5 // 0.5 - 2.0
      const m1 = options.sharpen / 100 // 0 - 1
      const m2 = 0.5 + (options.sharpen / 200) // 0.5 - 1
      pipeline = pipeline.sharpen({
        sigma,
        m1,
        m2
      })
    }

    // 9. 移除背景
    if (options.removeBackground) {
      const intermediateBuffer = await pipeline.png().toBuffer()
      buffer = await removeWhiteBackground(
        intermediateBuffer,
        options.backgroundThreshold ?? 240
      )
      pipeline = sharp(buffer)
    }

    // 10. 输出格式和质量
    const format = options.format || 'png'
    const quality = options.quality || 90

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality })
        break
      case 'webp':
        pipeline = pipeline.webp({ quality })
        break
      case 'png':
      default:
        pipeline = pipeline.png({ quality: Math.round(quality / 10) })
        break
    }

    // 执行处理
    const outputBuffer = await pipeline.toBuffer()
    const outputMetadata = await sharp(outputBuffer).metadata()

    // 转换为 Base64
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
    const base64 = `data:${mimeType};base64,${outputBuffer.toString('base64')}`

    return {
      success: true,
      data: {
        base64,
        width: outputMetadata.width || 0,
        height: outputMetadata.height || 0
      }
    }
  } catch (error) {
    console.error('Image processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '图片处理失败'
    }
  }
}

/**
 * 处理并保存图片到存储
 * @param imageData - 图片数据（Base64）
 * @param options - 处理选项
 * @param fileName - 文件名（可选）
 * @returns 处理后的图片信息
 */
export async function processAndSaveImage(
  imageData: string,
  options: ImageProcessingOptions,
  fileName?: string
): Promise<ActionResult<ProcessedImageResult>> {
  try {
    // 验证用户身份
    const supabase = createAuthenticatedSupabaseClient()
    if (!supabase) {
      return { success: false, error: '未登录，请先登录' }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: '未登录，请先登录' }
    }

    // 处理图片
    const processResult = await processImage(imageData, options)
    if (!processResult.success || !processResult.data) {
      return { success: false, error: processResult.error || '图片处理失败' }
    }

    // 转换为 Buffer
    const buffer = base64ToBuffer(processResult.data.base64)

    // 确定文件格式和名称
    const format = options.format || 'png'
    const extension = format === 'jpeg' ? 'jpg' : format
    const baseName = fileName || `processed-${Date.now()}`
    const finalFileName = baseName.includes('.') ? baseName : `${baseName}.${extension}`

    // 生成存储路径
    const filePath = generateFileKey(user.id, finalFileName)

    // 上传到存储
    const uploadResult = await uploadFile({
      file: buffer,
      key: filePath,
      contentType: `image/${format}`,
      accessLevel: FileAccessLevel.PUBLIC
    })

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || '保存图片失败' }
    }

    // 获取图片 URL
    let imageUrl = uploadResult.publicUrl || uploadResult.cdnUrl
    if (!imageUrl && uploadResult.needsSignedUrl && uploadResult.key) {
      try {
        imageUrl = await getSignedUrl(uploadResult.key)
      } catch {
        return { success: false, error: '无法获取图片签名URL' }
      }
    }

    if (!imageUrl) {
      return { success: false, error: '无法获取图片URL' }
    }

    return {
      success: true,
      data: {
        url: imageUrl,
        path: filePath,
        width: processResult.data.width,
        height: processResult.data.height,
        size: buffer.length,
        format
      }
    }
  } catch (error) {
    console.error('Process and save image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '处理并保存图片失败'
    }
  }
}

/**
 * 批量处理图片
 * @param images - 图片数据数组
 * @param options - 处理选项（应用于所有图片）
 * @returns 处理结果数组
 */
export async function batchProcessImages(
  images: string[],
  options: ImageProcessingOptions
): Promise<ActionResult<Array<{ base64: string; width: number; height: number } | { error: string }>>> {
  try {
    // 验证用户身份
    const supabase = createAuthenticatedSupabaseClient()
    if (!supabase) {
      return { success: false, error: '未登录，请先登录' }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: '未登录，请先登录' }
    }

    // 限制批量处理数量
    const MAX_BATCH_SIZE = 10
    if (images.length > MAX_BATCH_SIZE) {
      return { success: false, error: `最多支持同时处理 ${MAX_BATCH_SIZE} 张图片` }
    }

    // 并行处理所有图片
    const results = await Promise.all(
      images.map(async (imageData) => {
        const result = await processImage(imageData, options)
        if (result.success && result.data) {
          return result.data
        }
        return { error: result.error || '处理失败' }
      })
    )

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error('Batch process images error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '批量处理图片失败'
    }
  }
}

/**
 * 获取图片信息
 * @param imageData - 图片数据（Base64 或 URL）
 * @returns 图片元数据
 */
export async function getImageInfo(
  imageData: string
): Promise<ActionResult<{
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
}>> {
  try {
    // 获取图片数据
    let buffer: Buffer
    if (imageData.startsWith('data:')) {
      buffer = base64ToBuffer(imageData)
    } else if (imageData.startsWith('http')) {
      const response = await fetch(imageData)
      if (!response.ok) {
        return { success: false, error: '无法下载图片' }
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      const downloadResult = await downloadFile(imageData)
      if (!downloadResult) {
        return { success: false, error: '无法获取图片' }
      }
      buffer = downloadResult
    }

    const metadata = await sharp(buffer).metadata()

    return {
      success: true,
      data: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false
      }
    }
  } catch (error) {
    console.error('Get image info error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取图片信息失败'
    }
  }
}
