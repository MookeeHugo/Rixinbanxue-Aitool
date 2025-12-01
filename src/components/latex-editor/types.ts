export interface LatexEditorProps {
  /** 当前 LaTeX 值 */
  value: string
  /** 值变化回调 */
  onChange: (value: string) => void
  /** 占位符文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 编辑器高度 */
  height?: number | string
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 插入公式回调 */
  onInsert?: (latex: string) => void
}

export interface FormulaPreviewProps {
  /** LaTeX 公式字符串 */
  latex: string
  /** 自定义类名 */
  className?: string
  /** 是否显示边框 */
  bordered?: boolean
  /** 显示模式：inline 行内 | block 块级 */
  displayMode?: 'inline' | 'block'
}

export interface FormulaToolbarProps {
  /** 点击符号时的回调 */
  onInsert: (latex: string) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

/** 常用数学符号分类 */
export interface FormulaCategory {
  name: string
  label: string
  symbols: FormulaSymbol[]
}

export interface FormulaSymbol {
  /** LaTeX 代码 */
  latex: string
  /** 显示标签 */
  label: string
  /** 描述说明 */
  description?: string
}
