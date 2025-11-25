'use client'

import { useEffect } from 'react'
import { MarkdownRenderer } from './markdown-renderer'

interface QuestionContentRendererProps {
  content: string
  imageUrl?: string | null
  className?: string
}

/**
 * 题目内容渲染器 - KaTeX专业版
 *
 * 特性：
 * - 使用 KaTeX 进行专业的 LaTeX 数学公式渲染
 * - 支持行内公式 $...$  和块级公式 $$...$$
 * - 支持 Markdown 格式
 * - 显示原始上传图片（服务端已生成签名URL）
 */
export function QuestionContentRenderer({
  content,
  imageUrl,
  className = ''
}: QuestionContentRendererProps) {
  const isDev = process.env.NODE_ENV !== 'production'

  useEffect(() => {
    if (isDev) {
      console.log('[QuestionContentRenderer] 渲染内容:', { content, imageUrl })
    }
  }, [content, imageUrl, isDev])

  return (
    <div className={`relative ${className}`}>
      {/* 原始图片（右侧浮动） */}
      {imageUrl && (
        <div
          className="float-right ml-4 mb-4 mt-2 rounded-lg overflow-hidden border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 shadow-lg"
          style={{
            maxWidth: '400px',
            width: 'auto'
          }}
        >
          <img
            src={imageUrl}
            alt="题目原图"
            className="w-full h-auto max-h-[400px] object-contain p-2"
            loading="lazy"
            onLoad={() => {
              if (isDev) {
                console.log('[QuestionContentRenderer] ✅ 图片加载成功', { imageUrl })
              }
            }}
            onError={(e) => {
              console.error('❌ [QuestionContentRenderer] 图片加载失败', {
                imageUrl,
                error: e.type,
                timestamp: new Date().toISOString()
              })
              // 显示错误占位符
              const target = e.currentTarget
              target.style.display = 'none'
              const errorDiv = document.createElement('div')
              errorDiv.className = 'p-4 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded'
              errorDiv.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                  <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="font-semibold">图片加载失败</span>
                  <span class="text-xs text-gray-600 dark:text-gray-400 break-all max-w-[300px]">${imageUrl.substring(0, 100)}...</span>
                  <button
                    onclick="window.open('${imageUrl}', '_blank')"
                    class="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    在新窗口打开
                  </button>
                </div>
              `
              target.parentElement?.appendChild(errorDiv)
            }}
          />
          <div className="px-2 pb-1 text-xs text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-900">
            原始题目图片
          </div>
        </div>
      )}

      {/* 题目内容（使用 KaTeX 渲染 LaTeX 公式） */}
      <MarkdownRenderer content={content} className="min-h-[100px]" />

      {/* 清除浮动 */}
      <div className="clear-both" />
    </div>
  )
}
