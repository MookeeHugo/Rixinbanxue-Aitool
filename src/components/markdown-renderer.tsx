"use client"

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { CanvasImage } from '@/components/canvas-image'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Markdown + LaTeX 渲染组件
 *
 * 特性：
 * - 支持 LaTeX 公式
 * - 使用 CanvasImage 渲染图片，保持尺寸自适应并复用统一懒加载策略
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const formattedContent = content
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ src, alt }) => {
            const resolvedSrc = typeof src === 'string' ? src : ''
            if (!resolvedSrc) {
              return <span className="text-xs text-muted-foreground">（图片缺失）</span>
            }
            return (
              <CanvasImage
                src={resolvedSrc}
                alt={alt || 'Markdown image'}
                className="my-2"
                loadingFallback="图片加载中…"
                errorFallback={<span className="text-xs text-destructive">图片加载失败</span>}
              />
            )
          },
          code: ({ node, inline, className: codeClassName, children, ...props }: any) => {
            return inline ? (
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm" {...props}>
                {children}
              </code>
            ) : (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  )
}
