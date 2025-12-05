"use client"

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ParsedQuestionRecord } from '@/lib/ai-question-bank/types'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface QuestionCardProps {
  question: ParsedQuestionRecord
  index: number
  isSelected: boolean
  onToggle?: (nextValue: boolean) => void
  onEdit?: (question: ParsedQuestionRecord) => void
  onReparse?: (question: ParsedQuestionRecord) => Promise<void> | void
  isReparsing?: boolean
  isAnyParsing?: boolean
  className?: string
}

const typeLabels: Record<ParsedQuestionRecord['type'], string> = {
  choice: '选择题',
  fill: '填空题',
  essay: '解答题',
  proof: '证明题',
}

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const difficultyStyles = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function QuestionCard({
  question,
  index,
  isSelected,
  onToggle,
  onEdit,
  onReparse,
  isReparsing = false,
  isAnyParsing = false,
  className,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const imageUrl = useMemo(() => {
    if (question.question_image_url) {
      return `/api/image-proxy?url=${encodeURIComponent(question.question_image_url)}`
    }
    const assetUrl = question.image_assets?.[0]?.url
    if (assetUrl) {
      return `/api/image-proxy?url=${encodeURIComponent(assetUrl)}`
    }
    if (question.original_image_url) {
      return `/api/image-proxy?url=${encodeURIComponent(question.original_image_url)}`
    }
    return undefined
  }, [question.image_assets, question.original_image_url, question.question_image_url])

  const hasImage = Boolean(imageUrl)
  const difficulty = question.tags?.difficulty ?? 'medium'
  const typeLabel = typeLabels[question.type] ?? question.type

  const handleReparse = async () => {
    if (!onReparse) return
    if (isAnyParsing && !isReparsing) {
      setTooltipVisible(true)
      setTimeout(() => setTooltipVisible(false), 1800)
      return
    }
    await onReparse(question)
  }

  return (
    <Card className={cn('overflow-hidden bg-white border border-gray-200', className)}>
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggle?.(Boolean(checked))}
            className="mt-1"
          />

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                题目 {index}
              </span>
              <Badge variant="outline">{typeLabel}</Badge>
              <Badge
                variant="outline"
                className={cn('border px-2 py-0.5 text-xs', difficultyStyles[difficulty as keyof typeof difficultyStyles])}
              >
                {difficultyLabels[difficulty as keyof typeof difficultyLabels] ?? difficulty}
              </Badge>
              {hasImage && (
                <Badge variant="outline" className="text-xs">
                  <ImageIcon className="mr-1 h-3 w-3" />
                  含配图
                </Badge>
              )}
              {!!question.reparse_count && !isReparsing && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  已重解析 {question.reparse_count} 次
                </Badge>
              )}
              {question.confidence !== undefined && (
                <Badge variant="outline" className="text-xs">
                  置信度 {(question.confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            {isReparsing && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700">正在重新解析…</p>
                  <p className="text-xs text-muted-foreground">预计数秒即可完成，请耐心等待</p>
                </div>
              </div>
            )}

            {isExpanded && !isReparsing && (
              <div className="space-y-4 text-sm leading-relaxed text-slate-800">
                <div className="whitespace-pre-wrap">{question.content}</div>

                {hasImage && imageUrl && (
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="relative mx-auto h-72 w-full max-w-2xl overflow-hidden rounded-md bg-white">
                      <Image
                        src={imageUrl}
                        alt="题目配图"
                        fill
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}

                {question.options?.length ? (
                  <div className="space-y-2">
                    {question.options.map((option, idx) => (
                      <div key={idx} className="text-slate-700">
                        {option}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4">
                  <p className="text-xs font-medium text-blue-700 mb-1">参考答案</p>
                  <div className="whitespace-pre-wrap text-slate-900">{question.answer || '（暂缺）'}</div>
                </div>

                {question.tags?.knowledge?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {question.tags.knowledge.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {onReparse && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReparse}
                  disabled={isReparsing}
                  className={cn(
                    'text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition',
                    isAnyParsing && !isReparsing && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <RefreshCw className={cn('h-4 w-4', isReparsing && 'animate-spin')} />
                </Button>
                {tooltipVisible && (
                  <div className="absolute bottom-full right-0 mb-1 rounded bg-slate-900 px-3 py-1 text-xs text-white shadow">
                    正在解析其他题目，请稍候
                  </div>
                )}
              </div>
            )}

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-blue-600"
                onClick={() => onEdit(question)}
              >
                编辑
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
