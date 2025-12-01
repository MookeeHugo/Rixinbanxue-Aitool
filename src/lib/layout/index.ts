/**
 * 排版引擎模块
 *
 * 提供智能排版算法，用于：
 * - 选项布局（1列/2列/4列）
 * - 图片尺寸计算
 * - 题型差异化布局
 */

// 类型导出
export type {
  QuestionType,
  ImagePosition,
  OptionLayoutResult,
  OptionAnalysis,
  ImageSizeConfig,
  ImageSizeResult,
  QuestionLayoutConfig,
  QuestionLayoutResult
} from './types'

// 选项布局
export {
  analyzeOptions,
  calculateOptionLayout,
  getOptionGridClass
} from './option-layout'

// 图片尺寸
export {
  calculateImageSize,
  calculateQuestionLayout,
  getImageContainerClass,
  getResponsiveImageWidth
} from './image-sizing'
