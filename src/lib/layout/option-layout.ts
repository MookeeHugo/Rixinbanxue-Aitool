/**
 * 选项智能布局算法
 *
 * 根据选项内容特征（长度、是否含LaTeX、是否含图片）智能计算最佳布局
 */

import type { OptionLayoutResult, OptionAnalysis } from './types'

// LaTeX 模式检测正则
const LATEX_INLINE_PATTERN = /\$[^$]+\$/
const LATEX_BLOCK_PATTERN = /\$\$[^$]+\$\$/
const COMPLEX_FORMULA_PATTERN = /\\(frac|sqrt|int|sum|prod|lim|matrix|begin|end)/

// 图片占位符检测
const IMAGE_PATTERN = /!\[.*\]\(.*\)|<<IMG|<<配图/

/**
 * 分析选项内容特征
 */
export function analyzeOptions(options: string[]): OptionAnalysis {
  if (!options || options.length === 0) {
    return {
      avgLength: 0,
      maxLength: 0,
      containsLatex: false,
      containsImage: false,
      hasComplexFormula: false,
      optionCount: 0
    }
  }

  const lengths = options.map(opt => opt.length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / options.length
  const maxLength = Math.max(...lengths)

  const containsLatex = options.some(opt =>
    LATEX_INLINE_PATTERN.test(opt) || LATEX_BLOCK_PATTERN.test(opt)
  )

  const containsImage = options.some(opt => IMAGE_PATTERN.test(opt))

  const hasComplexFormula = options.some(opt => COMPLEX_FORMULA_PATTERN.test(opt))

  return {
    avgLength,
    maxLength,
    containsLatex,
    containsImage,
    hasComplexFormula,
    optionCount: options.length
  }
}

/**
 * 计算选项的最佳布局
 *
 * 规则优先级：
 * 1. 含图片 → 1列
 * 2. 含复杂公式且选项较长 → 1列
 * 3. 含简单LaTeX且选项短 → 2列
 * 4. 纯文本极短选项 → 4列
 * 5. 纯文本中等选项 → 2列
 * 6. 其他 → 1列
 */
export function calculateOptionLayout(options: string[]): OptionLayoutResult {
  const analysis = analyzeOptions(options)

  // 无选项
  if (analysis.optionCount === 0) {
    return {
      columns: 1,
      className: '',
      reason: '无选项'
    }
  }

  // 规则1: 含图片 → 强制1列
  if (analysis.containsImage) {
    return {
      columns: 1,
      className: 'grid-cols-1',
      reason: '选项含图片，单列展示'
    }
  }

  // 规则2: 含复杂公式且较长 → 1列
  if (analysis.hasComplexFormula && analysis.avgLength > 30) {
    return {
      columns: 1,
      className: 'grid-cols-1',
      reason: '含复杂公式，单列展示'
    }
  }

  // 规则3: 最长选项超过80字符 → 1列
  if (analysis.maxLength > 80) {
    return {
      columns: 1,
      className: 'grid-cols-1',
      reason: '选项过长，单列展示'
    }
  }

  // 规则4: 含LaTeX但选项中等长度 → 2列
  if (analysis.containsLatex) {
    if (analysis.avgLength < 40) {
      return {
        columns: 2,
        className: 'grid-cols-1 sm:grid-cols-2',
        reason: '含LaTeX公式，双列展示'
      }
    } else {
      return {
        columns: 1,
        className: 'grid-cols-1',
        reason: '含较长LaTeX公式，单列展示'
      }
    }
  }

  // 规则5: 纯文本极短选项 → 4列
  if (analysis.avgLength < 10 && analysis.maxLength < 20) {
    return {
      columns: 4,
      className: 'grid-cols-2 sm:grid-cols-4',
      reason: '极短选项，四列展示'
    }
  }

  // 规则6: 纯文本短选项 → 4列响应式
  if (analysis.avgLength < 15 && analysis.maxLength < 30) {
    return {
      columns: 4,
      className: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      reason: '短选项，响应式四列'
    }
  }

  // 规则7: 纯文本中等选项 → 2列
  if (analysis.avgLength < 40) {
    return {
      columns: 2,
      className: 'grid-cols-1 sm:grid-cols-2',
      reason: '中等选项，双列展示'
    }
  }

  // 默认: 1列
  return {
    columns: 1,
    className: 'grid-cols-1',
    reason: '长选项，单列展示'
  }
}

/**
 * 获取选项网格样式类名（兼容旧API）
 */
export function getOptionGridClass(options?: string[]): string {
  if (!options || options.length === 0) return ''
  return calculateOptionLayout(options).className
}
