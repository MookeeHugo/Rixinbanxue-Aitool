'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { MarkdownRenderer } from './markdown-renderer'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { ExternalLink, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react'
import type { QuestionImageAsset } from '@/lib/ai-question-bank'
import { Badge } from './ui/badge'

interface QuestionContentRendererProps {
  content: string
  imageUrl?: string | null
  questionImageUrl?: string | null
  imageAssets?: QuestionImageAsset[] | null
  className?: string
  onDeleteImage?: (imageId: string) => void
  onEnhanceImage?: (imageId: string) => void
  showImageActions?: boolean
}

/**
 * 题目内容渲染组件，支持 Markdown/LaTeX 以及配图展示
 */
export function QuestionContentRenderer({
  content,
  imageUrl,
  questionImageUrl,
  imageAssets,
  className = '',
  onDeleteImage,
  onEnhanceImage,
  showImageActions = false
}: QuestionContentRendererProps) {
  const isDev = process.env.NODE_ENV !== 'production'
  const [originalImageLoadError, setOriginalImageLoadError] = useState(false)
  const [assetErrors, setAssetErrors] = useState<Record<string, boolean>>({})

  const proxyImageUrl = imageUrl ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}` : null

  const normalizedAssets = useMemo(() => {
    const prepared =
      imageAssets
        ?.filter((asset): asset is QuestionImageAsset & { url: string } => Boolean(asset?.url))
        .map((asset, index) => {
          const order = asset.order ?? index + 1
          const id = asset.id ?? `${asset.url}-${order}`
          return {
            id,
            order,
            label: asset.placeholder || `配图 ${order}`,
            proxyUrl: `/api/image-proxy?url=${encodeURIComponent(asset.url)}`,
            rawUrl: asset.url,
            region: asset.region ?? null,
            source: asset.source ?? 'ai'
          }
        }) ?? []

    if (prepared.length === 0 && questionImageUrl) {
      return [
        {
          id: 'legacy-question-image',
          order: 1,
          label: '配图 1',
          proxyUrl: `/api/image-proxy?url=${encodeURIComponent(questionImageUrl)}`,
          rawUrl: questionImageUrl,
          region: null,
          source: 'ai' as const
        }
      ]
    }

    return prepared
  }, [imageAssets, questionImageUrl])

  const hasAnyImage = normalizedAssets.length > 0

  useEffect(() => {
    if (isDev) {
      console.log('[QuestionContentRenderer] 渲染调试', {
        preview: content.substring(0, 80),
        imageUrl,
        questionImageUrl,
        assetCount: imageAssets?.length ?? 0
      })
    }
  }, [content, imageUrl, questionImageUrl, imageAssets, isDev])

  const markAssetError = (assetId: string) =>
    setAssetErrors((prev) => ({ ...prev, [assetId]: true }))

  return (
    <div className={`space-y-3 ${className}`}>
      <MarkdownRenderer content={content} className="min-h-[50px]" />

      {hasAnyImage ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {normalizedAssets.length > 1 ? `共有 ${normalizedAssets.length} 张配图` : '配图'}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {normalizedAssets.map((asset) => {
              const hasError = assetErrors[asset.id]
              return (
                <figure
                  key={asset.id}
                  className="snap-start min-w-[220px] max-w-[260px] flex-shrink-0 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-muted/20 p-3 flex flex-col gap-2"
                >
                  <div className="relative h-40 rounded-lg bg-background flex items-center justify-center overflow-hidden group">
                    {!hasError ? (
                      <Image
                        src={asset.proxyUrl}
                        alt={asset.label}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 220px, 260px"
                        className="object-contain"
                        onError={() => markAssetError(asset.id)}
                      />
                    ) : (
                      <span className="text-xs text-red-500 font-medium">配图加载失败</span>
                    )}
                    {showImageActions && !hasError && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEnhanceImage && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEnhanceImage(asset.id)
                            }}
                            title="增强图片"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                          </Button>
                        )}
                        {onDeleteImage && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteImage(asset.id)
                            }}
                            title="删除图片"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <figcaption className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground">{asset.label}</div>
                      <Badge
                        variant={asset.source === 'manual' ? 'outline' : 'primary'}
                        className={asset.source === 'manual' ? 'border-primary-500 text-primary-700' : ''}
                      >
                        {asset.source === 'manual' ? '人工修复' : 'AI 截图'}
                      </Badge>
                    </div>
                    {asset.region && (
                      <div>
                        尺寸：{asset.region.width} × {asset.region.height}
                      </div>
                    )}
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-muted/20 p-4 text-xs text-muted-foreground">
          暂无可展示的配图，可点击下方按钮查看整页原图。
        </div>
      )}

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
                <DialogTitle>题目原图</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <div className="relative w-full min-h-[360px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Image
                    src={proxyImageUrl}
                    alt="题目原图"
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 1024px"
                    className="object-contain"
                    onLoad={() => {
                      setOriginalImageLoadError(false)
                      if (isDev) {
                        console.log('[QuestionContentRenderer] ✅ 原图加载成功', {
                          proxyUrl: proxyImageUrl,
                          originalUrl: imageUrl
                        })
                      }
                    }}
                    onError={(event) => {
                      setOriginalImageLoadError(true)
                      console.error('[QuestionContentRenderer] ❌ 原图加载失败', {
                        proxyUrl: proxyImageUrl,
                        originalUrl: imageUrl,
                        error: event.nativeEvent.type,
                        timestamp: new Date().toISOString()
                      })
                    }}
                  />
                </div>
                {originalImageLoadError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <svg className="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 font-semibold mb-2">原图加载失败</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md break-all px-4 mb-3">{imageUrl}</p>
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
                提示：此处展示的是上传时的整页原图，可用于对照 AI 解析结果。
              </p>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
