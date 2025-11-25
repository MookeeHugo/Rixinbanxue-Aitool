'use client'

import { useEffect, useState } from 'react'
import { MarkdownRenderer } from './markdown-renderer'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Image as ImageIcon, ExternalLink } from 'lucide-react'

interface QuestionContentRendererProps {
  content: string
  imageUrl?: string | null  // 原始完整大图URL（用于Dialog查看）
  questionImageUrl?: string | null  // 题目配图URL（裁剪后的配图，嵌入content）
  className?: string
}

/**
 * 在content中嵌入配图（Markdown格式）
 */
function embedImageInContent(content: string, imageUrl: string): string {
  // 策略1：如果content中包含"如图"关键词，在其后插入图片
  const keywords = ['如图', '如下图', '如图所示', '见图', '下图'];

  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      const index = content.indexOf(keyword);
      const insertPosition = index + keyword.length;
      const before = content.substring(0, insertPosition);
      const after = content.substring(insertPosition);

      return `${before}\n\n![配图](${imageUrl})\n\n${after}`;
    }
  }

  // 策略2：如果没有"如图"关键词，在题目内容开头插入（几何题通常先看图）
  return `![题目配图](${imageUrl})\n\n${content}`;
}

/**
 * 题目内容渲染器 - KaTeX专业版
 *
 * 特性：
 * - 使用 KaTeX 进行专业的 LaTeX 数学公式渲染
 * - 支持行内公式 $...$  和块级公式 $$...$$
 * - 支持 Markdown 格式
 * - 题目配图自动嵌入content中（如几何图形）
 * - 原始图片弹窗查看（解决浏览器安全策略限制）
 */
export function QuestionContentRenderer({
  content,
  imageUrl,
  questionImageUrl,
  className = ''
}: QuestionContentRendererProps) {
  const isDev = process.env.NODE_ENV !== 'production'
  const [imageLoadError, setImageLoadError] = useState(false)

  // 使用API代理绕过CORS问题
  const proxyImageUrl = imageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : null

  // 题目配图（裁剪后的）也使用代理
  const proxyQuestionImageUrl = questionImageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(questionImageUrl)}`
    : null

  // 如果有题目配图，嵌入到content中
  const contentWithImage = proxyQuestionImageUrl
    ? embedImageInContent(content, proxyQuestionImageUrl)
    : content

  useEffect(() => {
    if (isDev) {
      console.log('[QuestionContentRenderer] 渲染内容:', {
        content: content.substring(0, 100) + '...',
        originalImageUrl: imageUrl,
        questionImageUrl,
        hasQuestionImage: !!questionImageUrl,
        proxyImageUrl,
        proxyQuestionImageUrl
      })
    }
  }, [content, imageUrl, questionImageUrl, proxyImageUrl, proxyQuestionImageUrl, isDev])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 题目内容（使用 KaTeX 渲染 LaTeX 公式，如有配图则已嵌入） */}
      <MarkdownRenderer content={contentWithImage} className="min-h-[50px]" />

      {/* 查看原图按钮（Dialog弹窗） */}
      {proxyImageUrl && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                查看完整原图
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>题目原始图片</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <img
                  src={proxyImageUrl}
                  alt="题目原图"
                  className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                  loading="lazy"
                  onLoad={() => {
                    setImageLoadError(false)
                    if (isDev) {
                      console.log('[QuestionContentRenderer] ✅ Dialog图片加载成功', {
                        proxyUrl: proxyImageUrl,
                        originalUrl: imageUrl
                      })
                    }
                  }}
                  onError={(e) => {
                    setImageLoadError(true)
                    console.error('❌ [QuestionContentRenderer] Dialog图片加载失败', {
                      proxyUrl: proxyImageUrl,
                      originalUrl: imageUrl,
                      error: e.type,
                      timestamp: new Date().toISOString()
                    })
                  }}
                />
                {imageLoadError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <svg className="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 font-semibold mb-2">图片加载失败</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md break-all px-4 mb-3">
                      {imageUrl}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imageUrl && window.open(imageUrl, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      在新窗口打开
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                提示：此为上传时的原始图片，可与AI解析的题目内容对照查看
              </p>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
