'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css' // 必须导入KaTeX样式

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Markdown + LaTeX 渲染组件
 *
 * 特性：
 * - 支持LaTeX公式（行内 $...$ 和块级 $$...$$）
 * - 完整的Markdown语法支持
 * - 自动渲染数学符号
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // 预处理：某些OCR工具返回的是 \( ... \) 格式，需要转换为 $ ... $
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
          // 自定义图片渲染
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="max-w-full h-auto rounded-lg my-2 border border-gray-200 dark:border-gray-700"
              loading="lazy"
            />
          ),
          // 自定义代码块渲染
          code: ({ node, inline, className, children, ...props }) => {
            return inline ? (
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  )
}
