'use client'

import Image from 'next/image'
import { useState, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { ZoomIn, Edit, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ParsedQuestionRecord } from '@/lib/ai-question-bank'
import { MarkdownRenderer } from './markdown-renderer'
import {
  getQuestionTypeLabel,
  getDifficultyLabel,
  getDifficultyColor,
  formatConfidence,
  isLowConfidence
} from '@/lib/ai-question-bank/display-helpers'
import {
  calculateOptionLayout,
  calculateQuestionLayout
} from '@/lib/layout'
import { cn } from '@/lib/utils'

interface SmartQuestionCardProps {
  question: ParsedQuestionRecord
  index: number
  imageUrl?: string
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * 智能题目卡片组件 - Tier-1 Enterprise SaaS 设计
 *
 * 核心特性：
 * 1. 左文右图布局 - 图片永远在右侧，不会挤压选项
 * 2. 智能选项网格 - 根据选项长度自动调整列数
 * 3. 多图画廊 - 支持多张图片的优雅展示
 * 4. 响应式设计 - 适配不同屏幕尺寸
 * 5. Swiss Spa 美学 - 极简、呼吸感、专业
 */
export function SmartQuestionCard({
  question,
  index,
  imageUrl,
  onEdit,
  onDelete
}: SmartQuestionCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false)

  const lowConfidence = isLowConfidence(question.confidence)
  const difficultyColor = getDifficultyColor(question.tags?.difficulty || 'medium')

  // 判断是否有图片
  const hasImage = !!question.question_image_url

  // 使用API代理绕过CORS问题
  const proxyImageUrl = question.question_image_url
    ? `/api/image-proxy?url=${encodeURIComponent(question.question_image_url)}`
    : null

  // 原始图片URL（用于弹窗查看）
  const proxyOriginalImageUrl = imageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : null

  // 使用智能排版引擎计算选项布局
  const optionLayout = useMemo(() => {
    return calculateOptionLayout(question.options || [])
  }, [question.options])

  // 计算题型布局（用于后续题型差异化渲染）
  const questionLayout = useMemo(() => {
    return calculateQuestionLayout({
      type: question.type || 'choice',
      hasImage,
      imageCount: question.image_assets?.length || (hasImage ? 1 : 0),
      optionCount: question.options?.length || 0,
      contentLength: question.content?.length || 0
    })
  }, [question.type, hasImage, question.image_assets, question.options, question.content])

  // 计算图片容器宽度样式
  const imageContainerWidth = questionLayout.imageMaxWidthPercent > 0
    ? `w-[${questionLayout.imageMaxWidthPercent}%]`
    : 'w-[220px]'

  return (
    <Card className={cn(
      // Swiss Spa 美学：超柔和阴影、更大圆角、呼吸感边距
      'bg-white border border-gray-200/60 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]',
      'transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]',
      // 低置信度警告样式优化
      lowConfidence && 'border-amber-300/70 bg-amber-50/30'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 px-8 pt-6">
        {/* 左侧：元数据标签区 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 题号 Badge - 主要标识 */}
          <Badge
            variant="default"
            className="font-medium px-3 py-1"
          >
            第 {question.number || index + 1} 题
          </Badge>

          {/* 题型 Badge */}
          <Badge
            className="bg-primary-50 text-primary-700 border-primary-200/50 font-medium px-3 py-1"
          >
            {getQuestionTypeLabel(question.type)}
          </Badge>

          {/* 难度 Badge */}
          <Badge
            variant="outline"
            className={cn(
              'border font-medium px-3 py-1',
              difficultyColor
            )}
          >
            {getDifficultyLabel(question.tags?.difficulty || 'medium')}
          </Badge>

          {/* 置信度指示器 */}
          <span className={cn(
            'text-xs font-medium',
            lowConfidence ? 'text-amber-700' : 'text-gray-500'
          )}>
            置信度 {formatConfidence(question.confidence)}
          </span>

          {/* 低置信度警告 */}
          {lowConfidence && (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300/60 font-medium px-3 py-1"
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 stroke-[1.5px]" />
              需人工复核
            </Badge>
          )}
        </div>

        {/* 右侧：操作按钮区 */}
        <div className="flex items-center gap-2">
          {/* 已选择状态 */}
          {question.is_selected && (
            <Badge
              className="bg-emerald-600 text-white border-0 font-medium px-3 py-1 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 stroke-[1.5px]" />
              已选择
            </Badge>
          )}

          {/* 编辑按钮 */}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-1.5 stroke-[1.5px]" />
              编辑
            </Button>
          )}

          {/* 删除按钮 - 确保对比度 */}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1.5 stroke-[1.5px]" />
              删除
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-8 pb-8">
        {/* 核心布局：左文右图 - 增加呼吸感 */}
        <div className="flex gap-8">
          {/* 左侧：内容主区域（自动占据剩余空间） */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* 1. 题干区域 - 优化排版 */}
            <div className="text-gray-900 text-base leading-[1.75] break-words">
              <MarkdownRenderer content={question.content} />
            </div>

            {/* 2. 选项区域（智能网格） - 增强视觉层次 */}
            {question.options && question.options.length > 0 && (
              <div className={cn(
                'grid gap-3',
                optionLayout.className
              )}>
                {question.options.map((opt, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start px-4 py-3 rounded-lg',
                      'border border-gray-200/60 bg-gray-50/50',
                      'hover:bg-gray-100/50 hover:border-gray-300/60',
                      'transition-all duration-150',
                      'text-gray-700 text-sm font-medium'
                    )}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}

            {/* 3. 答案区域 - 优化视觉呈现 */}
            {question.answer && (
              <div className="space-y-2 mt-2">
                <p className="text-sm font-semibold text-gray-900">答案</p>
                <div className={cn(
                  'text-gray-700 bg-emerald-50/50 border border-emerald-200/60',
                  'px-4 py-3 rounded-lg text-sm leading-relaxed'
                )}>
                  {question.answer}
                </div>
              </div>
            )}

            {/* 4. 解题步骤 - 优化列表样式 */}
            {question.steps && question.steps.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-sm font-semibold text-gray-900">AI 解题步骤</p>
                <ul className="space-y-2">
                  {question.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. 知识点标签 - 优化标签样式 */}
            {question.tags?.knowledge?.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-sm font-semibold text-gray-900">知识点</p>
                <div className="flex flex-wrap gap-2">
                  {question.tags.knowledge.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-gray-50 text-gray-700 border-gray-200/60 font-medium px-3 py-1"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：图片吸附区（仅当有图片时渲染） */}
          {hasImage && proxyImageUrl && (
            <div className={cn("flex-shrink-0 flex flex-col gap-3 max-w-[280px]", imageContainerWidth)}>
              <ImageThumbnail
                src={proxyImageUrl}
                onError={() => setImageLoadError(true)}
                hasError={imageLoadError}
              />
            </div>
          )}
        </div>

        {/* 查看原图按钮 - 优化按钮样式 */}
        {proxyOriginalImageUrl && (
          <div className="mt-6 pt-6 border-t border-gray-200/60">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200 text-gray-700 gap-2"
                >
                  <ZoomIn className="w-4 h-4 stroke-[1.5px]" />
                  查看完整原图
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto bg-white">
                <div className="relative w-full min-h-[360px] rounded-lg border border-gray-200/60 overflow-hidden">
                  <Image
                    src={proxyOriginalImageUrl}
                    alt="题目原图"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  提示：此为上传时的原始图片，可与AI解析的题目内容对照查看
                </p>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 图片缩略图组件（带点击放大）- Tier-1 设计优化
 */
function ImageThumbnail({
  src,
  onError,
  hasError
}: {
  src: string
  onError: () => void
  hasError: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn(
          'relative group cursor-zoom-in min-h-[220px] max-h-[240px]',
          'border border-gray-200/60 rounded-xl overflow-hidden',
          'bg-gray-50/50 hover:border-gray-300/80',
          'transition-all duration-200',
          'shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
          'hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
        )}>
          {!hasError ? (
            <>
              <div className="absolute inset-0 p-2">
                <div className="relative w-full h-full">
                  <Image
                    src={src}
                    alt="题目配图"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 280px"
                    className="object-contain"
                    onError={() => onError()}
                  />
                </div>
              </div>
              {/* 悬停遮罩 - 优化交互反馈 */}
              <div className={cn(
                'absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/5',
                'transition-all duration-200',
                'flex items-center justify-center'
              )}>
                <div className={cn(
                  'opacity-0 group-hover:opacity-100',
                  'transition-all duration-200',
                  'bg-white/90 backdrop-blur-sm',
                  'rounded-full p-2.5 shadow-lg'
                )}>
                  <ZoomIn className="w-5 h-5 text-gray-700 stroke-[1.5px]" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-[220px] flex flex-col items-center justify-center gap-2 p-4">
              <AlertCircle className="w-8 h-8 text-red-400 stroke-[1.5px]" />
              <span className="text-red-600 text-xs font-medium text-center">
                配图加载失败
              </span>
            </div>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className={cn(
        'max-w-4xl bg-white border border-gray-200/60',
        'shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
        'p-0 overflow-hidden'
      )}>
        <div className="p-6">
          <div className="relative w-full min-h-[360px] rounded-lg border border-gray-200/60 overflow-hidden">
            <Image
              src={src}
              alt="大图预览"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
