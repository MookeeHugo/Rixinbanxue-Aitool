/**
 * 排版引擎类型定义
 */

// 题目类型
export type QuestionType = 'choice' | 'fill' | 'essay' | 'proof'

// 图片位置
export type ImagePosition = 'left' | 'right' | 'bottom' | 'inline'

// 选项布局结果
export interface OptionLayoutResult {
  columns: 1 | 2 | 4
  className: string
  reason: string
}

// 选项分析结果
export interface OptionAnalysis {
  avgLength: number
  maxLength: number
  containsLatex: boolean
  containsImage: boolean
  hasComplexFormula: boolean
  optionCount: number
}

// 图片尺寸配置
export interface ImageSizeConfig {
  originalWidth: number
  originalHeight: number
  containerWidth: number
  questionType: QuestionType
  position: ImagePosition
}

// 图片尺寸结果
export interface ImageSizeResult {
  width: number
  height: number
  maxWidth: string
  scale: number
}

// 题型布局配置
export interface QuestionLayoutConfig {
  type: QuestionType
  hasImage: boolean
  imageCount: number
  optionCount: number
  contentLength: number
}

// 题型布局结果
export interface QuestionLayoutResult {
  layout: 'left-right' | 'top-bottom' | 'full-width' | 'two-column'
  imagePosition: ImagePosition
  imageMaxWidthPercent: number
  contentClassName: string
}
