'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormulaPreview } from './formula-preview'
import { FormulaToolbar } from './formula-toolbar'
import type { LatexEditorProps } from './types'
import { Code, Eye, Keyboard } from 'lucide-react'

interface MathfieldElement extends HTMLElement {
  value: string
  setValue: (value: string) => void
}

export function LatexEditor({
  value,
  onChange,
  placeholder = '输入 LaTeX 公式...',
  disabled = false,
  className,
  height = 120,
  showToolbar = true,
  onInsert
}: LatexEditorProps) {
  const mathfieldRef = useRef<MathfieldElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const latestValueRef = useRef(value)
  const latestOnChangeRef = useRef(onChange)
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual')
  const [mathLiveLoaded, setMathLiveLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  useEffect(() => {
    latestOnChangeRef.current = onChange
  }, [onChange])

  // 动态加载 MathLive
  useEffect(() => {
    let mounted = true

    const loadMathLive = async () => {
      try {
        // 动态导入 mathlive
        const mathlive = await import('mathlive')

        if (!mounted) return

        // 确保自定义元素已注册
        if (!customElements.get('math-field')) {
          // MathLive 会自动注册 math-field 元素
          await mathlive.renderMathInDocument?.()
        }

        setMathLiveLoaded(true)
        setLoadError(null)
      } catch (err) {
        if (!mounted) return
        console.error('Failed to load MathLive:', err)
        setLoadError('加载数学编辑器失败，请使用代码模式')
        setActiveTab('code')
      }
    }

    loadMathLive()

    return () => {
      mounted = false
    }
  }, [])

  // 初始化 mathfield
  useEffect(() => {
    if (!mathLiveLoaded || activeTab !== 'visual' || !containerRef.current) return

    const container = containerRef.current

    const initMathfield = async () => {
      try {
        // 清除现有内容
        if (container) {
          container.innerHTML = ''
        }

        // 创建 math-field 元素
        const mathfield = document.createElement('math-field') as MathfieldElement
        mathfield.value = latestValueRef.current
        mathfield.style.width = '100%'
        mathfield.style.minHeight = typeof height === 'number' ? `${height}px` : height
        mathfield.style.fontSize = '18px'
        mathfield.style.padding = '8px'
        mathfield.style.border = '1px solid hsl(var(--border))'
        mathfield.style.borderRadius = 'calc(var(--radius) - 2px)'
        mathfield.style.backgroundColor = disabled ? 'hsl(var(--muted))' : 'hsl(var(--background))'

        if (disabled) {
          mathfield.setAttribute('read-only', 'true')
        }

        // 监听值变化
        mathfield.addEventListener('input', () => {
          latestOnChangeRef.current(mathfield.value)
        })

        container?.appendChild(mathfield)
        mathfieldRef.current = mathfield

      } catch (err) {
        console.error('Failed to initialize mathfield:', err)
        setLoadError('初始化数学编辑器失败')
        setActiveTab('code')
      }
    }

    initMathfield()

    return () => {
      if (container) {
        container.innerHTML = ''
      }
      mathfieldRef.current = null
    }
  }, [mathLiveLoaded, activeTab, disabled, height])

  // 同步外部值变化到 mathfield
  useEffect(() => {
    if (mathfieldRef.current && activeTab === 'visual') {
      if (mathfieldRef.current.value !== value) {
        mathfieldRef.current.value = value
      }
    }
  }, [value, activeTab])

  // 处理符号插入
  const handleInsert = useCallback((latex: string) => {
    if (activeTab === 'code' && textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.slice(0, start) + latex + value.slice(end)
      onChange(newValue)

      // 恢复光标位置
      requestAnimationFrame(() => {
        const cursorPos = start + latex.length
        textarea.setSelectionRange(cursorPos, cursorPos)
        textarea.focus()
      })
    } else if (mathfieldRef.current) {
      // 在 mathfield 中插入
      const currentValue = mathfieldRef.current.value
      const newValue = currentValue + latex
      mathfieldRef.current.value = newValue
      onChange(newValue)
    }

    onInsert?.(latex)
  }, [activeTab, value, onChange, onInsert])

  // 处理代码模式下的文本变化
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }, [onChange])

  // 切换标签时同步值
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab as 'visual' | 'code')
  }, [])

  return (
    <div className={cn('space-y-2 w-full overflow-x-hidden', className)}>
      {showToolbar && (
        <FormulaToolbar
          onInsert={handleInsert}
          disabled={disabled}
        />
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="visual"
            disabled={!!loadError}
            className="gap-1"
          >
            <Keyboard className="h-4 w-4" />
            可视化
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1">
            <Code className="h-4 w-4" />
            代码
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1">
            <Eye className="h-4 w-4" />
            预览
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-2 w-full">
          {loadError ? (
            <div className="text-sm text-muted-foreground p-4 border rounded-md">
              {loadError}
            </div>
          ) : !mathLiveLoaded ? (
            <div className="flex items-center justify-center p-4 border rounded-md">
              <div className="text-sm text-muted-foreground">加载数学编辑器...</div>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="math-field-container w-full overflow-x-auto"
              style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
            />
          )}
        </TabsContent>

        <TabsContent value="code" className="mt-2 w-full">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder}
            disabled={disabled}
            className="font-mono text-sm"
            style={{
              minHeight: typeof height === 'number' ? `${height}px` : height
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-2 w-full">
          <FormulaPreview
            latex={value}
            displayMode="block"
            className={cn(
              'min-h-[120px]',
              typeof height === 'number' && `min-h-[${height}px]`
            )}
          />
        </TabsContent>
      </Tabs>

      {/* 常用公式模板 */}
      <div className="flex flex-wrap gap-1 text-xs">
        <span className="text-muted-foreground py-1">常用模板：</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleInsert('\\frac{a}{b}')}
          disabled={disabled}
        >
          分数
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleInsert('\\sqrt{x}')}
          disabled={disabled}
        >
          根号
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleInsert('x^{2}')}
          disabled={disabled}
        >
          平方
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleInsert('\\sum_{i=1}^{n} x_i')}
          disabled={disabled}
        >
          求和
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleInsert('\\int_{a}^{b} f(x) dx')}
          disabled={disabled}
        >
          积分
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleInsert('\\lim_{x \\to \\infty}')}
          disabled={disabled}
        >
          极限
        </Button>
      </div>
    </div>
  )
}
