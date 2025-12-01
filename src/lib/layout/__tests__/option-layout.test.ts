/**
 * 选项智能布局算法单元测试
 */

import { analyzeOptions, calculateOptionLayout, getOptionGridClass } from '../option-layout'

describe('analyzeOptions', () => {
  test('空选项数组返回默认值', () => {
    const result = analyzeOptions([])
    expect(result).toEqual({
      avgLength: 0,
      maxLength: 0,
      containsLatex: false,
      containsImage: false,
      hasComplexFormula: false,
      optionCount: 0
    })
  })

  test('正确计算选项长度统计', () => {
    const options = ['A', 'BB', 'CCC', 'DDDD']
    const result = analyzeOptions(options)
    expect(result.avgLength).toBe(2.5) // (1+2+3+4)/4
    expect(result.maxLength).toBe(4)
    expect(result.optionCount).toBe(4)
  })

  test('检测行内LaTeX公式', () => {
    const options = ['$x^2$', '无公式', '$\\frac{1}{2}$']
    const result = analyzeOptions(options)
    expect(result.containsLatex).toBe(true)
  })

  test('检测块级LaTeX公式', () => {
    const options = ['$$x^2 + y^2 = 1$$', '选项B']
    const result = analyzeOptions(options)
    expect(result.containsLatex).toBe(true)
  })

  test('检测复杂公式', () => {
    const options = ['$\\frac{a}{b}$', '$\\sqrt{2}$', '$\\int_0^1 x dx$']
    const result = analyzeOptions(options)
    expect(result.hasComplexFormula).toBe(true)
  })

  test('检测图片占位符', () => {
    const options = ['![图片](url)', '无图片', '<<IMG>>']
    const result = analyzeOptions(options)
    expect(result.containsImage).toBe(true)
  })
})

describe('calculateOptionLayout', () => {
  test('无选项返回1列', () => {
    const result = calculateOptionLayout([])
    expect(result.columns).toBe(1)
    expect(result.className).toBe('')
    expect(result.reason).toBe('无选项')
  })

  test('含图片选项强制1列', () => {
    const options = ['![图片](url)', 'B', 'C', 'D']
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(1)
    expect(result.className).toBe('grid-cols-1')
    expect(result.reason).toContain('含图片')
  })

  test('含复杂公式且较长选项使用1列', () => {
    // avgLength must be > 30 for complex formula rule to apply
    const options = [
      '$\\frac{a^2 + b^2}{c^2} = 1$，这是一个很长很长的选项内容，需要换行展示',
      '$\\sqrt{a^2 + b^2}$，另一个较长较长的选项，也需要换行展示以确保可读性',
      '$\\int_0^1 x dx$，第三个较长的选项内容，继续写一些文字来增加长度',
      '$\\sum_{i=1}^{n} x_i$，第四个选项内容也要足够长，确保平均长度超过阈值'
    ]
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(1)
    expect(result.reason).toContain('复杂公式')
  })

  test('最长选项超过80字符使用1列', () => {
    const longOption = 'A'.repeat(85)
    const options = [longOption, 'B', 'C', 'D']
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(1)
    expect(result.reason).toContain('过长')
  })

  test('短LaTeX选项使用2列', () => {
    const options = ['$x$', '$y$', '$z$', '$w$']
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(2)
    expect(result.className).toContain('sm:grid-cols-2')
  })

  test('极短纯文本选项使用4列', () => {
    // avgLength < 10 && maxLength < 20
    const options = ['A', 'B', 'C', 'D']
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(4)
    expect(result.className).toBe('grid-cols-2 sm:grid-cols-4')
  })

  test('短纯文本选项使用响应式4列', () => {
    // avgLength >= 10 && avgLength < 15 && maxLength >= 20 && maxLength < 30
    // This hits rule 6 (short options) instead of rule 5 (ultra-short)
    const options = [
      '选项A内容', // 5 chars
      '选项B内容', // 5 chars
      '选项C内容', // 5 chars
      '选项D的内容需要超过二十个字符才能触发这个规则' // 22 chars, maxLength >= 20
    ]
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(4)
    expect(result.className).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')
  })

  test('中等长度纯文本选项使用2列', () => {
    // avgLength >= 15 && avgLength < 40, maxLength < 80
    const options = [
      '这是一个中等长度的选项A内容，需要一定的长度来测试',
      '这是一个中等长度的选项B内容，需要一定的长度来测试',
      '这是一个中等长度的选项C内容，需要一定的长度来测试',
      '这是一个中等长度的选项D内容，需要一定的长度来测试'
    ]
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(2)
    expect(result.className).toContain('sm:grid-cols-2')
  })

  test('长纯文本选项使用1列', () => {
    // avgLength >= 40 to trigger the default 1-column rule
    const options = [
      '这是一个非常非常长的选项A内容，需要使用单列展示以确保可读性和排版美观，继续写一些文字来增加长度',
      '这是一个非常非常长的选项B内容，需要使用单列展示以确保可读性和排版美观，继续写一些文字来增加长度',
      '这是一个非常非常长的选项C内容，需要使用单列展示以确保可读性和排版美观，继续写一些文字来增加长度',
      '这是一个非常非常长的选项D内容，需要使用单列展示以确保可读性和排版美观，继续写一些文字来增加长度'
    ]
    const result = calculateOptionLayout(options)
    expect(result.columns).toBe(1)
    expect(result.className).toBe('grid-cols-1')
  })
})

describe('getOptionGridClass', () => {
  test('空选项返回空字符串', () => {
    expect(getOptionGridClass([])).toBe('')
    expect(getOptionGridClass(undefined)).toBe('')
  })

  test('返回正确的CSS类名', () => {
    const shortOptions = ['A', 'B', 'C', 'D']
    const result = getOptionGridClass(shortOptions)
    expect(result).toContain('grid-cols')
  })
})
