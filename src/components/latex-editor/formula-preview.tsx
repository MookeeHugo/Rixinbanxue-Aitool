'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { FormulaPreviewProps } from './types'

export function FormulaPreview({
  latex,
  className,
  bordered = true,
  displayMode = 'block'
}: FormulaPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current || !latex.trim()) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // 动态导入 KaTeX 以避免 SSR 问题
    import('katex').then((katex) => {
      if (!containerRef.current) return

      try {
        const html = katex.default.renderToString(latex, {
          displayMode: displayMode === 'block',
          throwOnError: false,
          errorColor: '#ef4444',
          trust: false,
          strict: 'warn',
          macros: {
            '\\R': '\\mathbb{R}',
            '\\N': '\\mathbb{N}',
            '\\Z': '\\mathbb{Z}',
            '\\Q': '\\mathbb{Q}',
            '\\C': '\\mathbb{C}'
          }
        })
        containerRef.current.innerHTML = html
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '公式渲染失败')
        containerRef.current.innerHTML = ''
      } finally {
        setIsLoading(false)
      }
    }).catch(() => {
      setError('加载 KaTeX 失败')
      setIsLoading(false)
    })
  }, [latex, displayMode])

  if (!latex.trim()) {
    return (
      <div
        className={cn(
          'text-muted-foreground text-sm italic p-3',
          bordered && 'border rounded-md',
          className
        )}
      >
        输入公式后预览
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-[40px] p-3 overflow-x-auto',
        bordered && 'border rounded-md bg-muted/30',
        displayMode === 'block' && 'text-center',
        className
      )}
    >
      {isLoading && (
        <div className="text-muted-foreground text-sm">渲染中...</div>
      )}
      {error && (
        <div className="text-destructive text-sm">
          <span className="font-medium">错误：</span>
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(
          'katex-preview',
          displayMode === 'inline' && 'inline'
        )}
      />
    </div>
  )
}
