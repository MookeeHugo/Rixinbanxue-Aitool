/**
 * 图片自动缩放算法
 *
 * 根据题型和图片位置智能计算最佳图片尺寸
 */

import type {
  QuestionType,
  ImagePosition,
  ImageSizeConfig,
  ImageSizeResult,
  QuestionLayoutConfig,
  QuestionLayoutResult
} from './types'

/**
 * 题型对应的图片最大宽度百分比配置
 */
const IMAGE_WIDTH_CONFIG: Record<QuestionType, Record<ImagePosition, number>> = {
  choice: {
    right: 30,    // 选择题右侧配图不超过30%
    left: 25,
    bottom: 50,
    inline: 40
  },
  fill: {
    right: 35,
    left: 30,
    bottom: 50,
    inline: 45
  },
  essay: {
    right: 40,
    left: 35,
    bottom: 60,
    inline: 55
  },
  proof: {
    right: 45,    // 证明题几何图可以更大
    left: 40,
    bottom: 70,
    inline: 60
  }
}

/**
 * 图片最大高度限制（像素）
 */
const MAX_IMAGE_HEIGHTS: Record<ImagePosition, number> = {
  right: 280,     // 右侧吸附区高度限制
  left: 280,
  bottom: 400,    // 底部可以更高
  inline: 320
}

/**
 * 计算图片的最佳尺寸
 */
export function calculateImageSize(config: ImageSizeConfig): ImageSizeResult {
  const {
    originalWidth,
    originalHeight,
    containerWidth,
    questionType,
    position
  } = config

  // 获取最大宽度百分比
  const maxWidthPercent = IMAGE_WIDTH_CONFIG[questionType]?.[position] ?? 40
  const maxHeightPx = MAX_IMAGE_HEIGHTS[position] ?? 300

  // 计算最大宽度（像素）
  const maxWidthPx = (containerWidth * maxWidthPercent) / 100

  // 计算宽度缩放比例
  const widthScale = Math.min(1, maxWidthPx / originalWidth)

  // 计算高度缩放比例
  const heightScale = Math.min(1, maxHeightPx / originalHeight)

  // 取较小的缩放比例，保持宽高比
  const scale = Math.min(widthScale, heightScale)

  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
    maxWidth: `${maxWidthPercent}%`,
    scale
  }
}

/**
 * 根据题型和内容特征计算布局方案
 */
export function calculateQuestionLayout(config: QuestionLayoutConfig): QuestionLayoutResult {
  const { type, hasImage, imageCount, optionCount, contentLength } = config

  // 选择题：左文右图
  if (type === 'choice') {
    if (hasImage) {
      return {
        layout: 'left-right',
        imagePosition: 'right',
        imageMaxWidthPercent: 30,
        contentClassName: 'flex gap-8'
      }
    }
    return {
      layout: 'full-width',
      imagePosition: 'inline',
      imageMaxWidthPercent: 0,
      contentClassName: ''
    }
  }

  // 填空题：根据内容长度决定
  if (type === 'fill') {
    if (hasImage && contentLength < 200) {
      return {
        layout: 'left-right',
        imagePosition: 'right',
        imageMaxWidthPercent: 35,
        contentClassName: 'flex gap-6'
      }
    }
    return {
      layout: 'top-bottom',
      imagePosition: 'bottom',
      imageMaxWidthPercent: 50,
      contentClassName: 'flex flex-col gap-4'
    }
  }

  // 证明题：双栏布局（条件 | 图形）
  if (type === 'proof') {
    if (hasImage) {
      return {
        layout: 'two-column',
        imagePosition: 'right',
        imageMaxWidthPercent: 45,
        contentClassName: 'grid grid-cols-1 md:grid-cols-2 gap-6'
      }
    }
    return {
      layout: 'full-width',
      imagePosition: 'inline',
      imageMaxWidthPercent: 0,
      contentClassName: ''
    }
  }

  // 解答题：全宽布局
  if (type === 'essay') {
    if (hasImage && imageCount > 1) {
      // 多图：图片画廊
      return {
        layout: 'top-bottom',
        imagePosition: 'bottom',
        imageMaxWidthPercent: 60,
        contentClassName: 'flex flex-col gap-6'
      }
    }
    if (hasImage) {
      // 单图：可以左文右图
      return {
        layout: 'left-right',
        imagePosition: 'right',
        imageMaxWidthPercent: 40,
        contentClassName: 'flex gap-8'
      }
    }
    return {
      layout: 'full-width',
      imagePosition: 'inline',
      imageMaxWidthPercent: 0,
      contentClassName: ''
    }
  }

  // 默认：全宽
  return {
    layout: 'full-width',
    imagePosition: 'inline',
    imageMaxWidthPercent: 50,
    contentClassName: ''
  }
}

/**
 * 获取图片容器的样式类名
 */
export function getImageContainerClass(
  position: ImagePosition,
  maxWidthPercent: number
): string {
  const baseClasses = 'flex-shrink-0 flex flex-col gap-3'

  switch (position) {
    case 'right':
      return `${baseClasses} w-[${maxWidthPercent}%] max-w-[280px]`
    case 'left':
      return `${baseClasses} w-[${maxWidthPercent}%] max-w-[280px] order-first`
    case 'bottom':
      return 'w-full mt-4'
    case 'inline':
      return 'inline-block max-w-full'
    default:
      return baseClasses
  }
}

/**
 * 计算图片在不同屏幕尺寸下的响应式宽度
 */
export function getResponsiveImageWidth(
  questionType: QuestionType,
  position: ImagePosition
): {
  mobile: string
  tablet: string
  desktop: string
} {
  const config = IMAGE_WIDTH_CONFIG[questionType][position]

  return {
    mobile: '100%',                           // 移动端全宽
    tablet: `${Math.min(config + 10, 60)}%`,  // 平板稍大
    desktop: `${config}%`                     // 桌面按配置
  }
}
