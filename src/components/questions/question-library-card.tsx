"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MarkdownRenderer } from '../markdown-renderer'

export type QuestionLibraryCardType = 'choice' | 'fill' | 'solve' | 'essay' | 'proof'

export interface QuestionLibraryCardData {
  id: string
  type: QuestionLibraryCardType
  content: string
  answer: string
  imageUrl?: string | null
  createdAt?: string
  tags?: Array<{ id?: string; category?: string; value: string }>
}

interface QuestionLibraryCardProps {
  question: QuestionLibraryCardData
  isSelected?: boolean
  onToggle?: (nextValue: boolean) => void
  onView?: (question: QuestionLibraryCardData) => void
  onEdit?: (question: QuestionLibraryCardData) => void
  onDuplicate?: (question: QuestionLibraryCardData) => void
  onDelete?: (question: QuestionLibraryCardData) => void
  className?: string
}

const typeLabels: Record<QuestionLibraryCardType, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题',
  essay: '解答题',
  proof: '证明题',
}

export function QuestionLibraryCard({
  question,
  isSelected = false,
  onToggle,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: QuestionLibraryCardProps) {
  const [expanded, setExpanded] = useState(false)

  const proxyImageUrl = question.imageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(question.imageUrl)}`
    : null

  return (
    <Card className={cn('transition-all bg-white', isSelected && 'border-primary/50 shadow-sm', className)}>
      <div className="p-5 flex gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggle?.(Boolean(checked))}
          aria-label={`选择题目 ${question.id}`}
          className="mt-2"
        />

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{typeLabels[question.type] ?? question.type}</Badge>
              {question.tags?.map((tag) => (
                <Badge
                  key={`${tag.category ?? 'tag'}-${tag.value}`}
                  variant="outline"
                  className="bg-primary/10 border-primary/20 text-primary"
                >
                  {tag.value}
                </Badge>
              ))}
            </div>
            {question.createdAt && (
              <span className="text-xs text-muted-foreground">{question.createdAt}</span>
            )}
          </div>

          <div className="text-sm text-slate-900 leading-relaxed">
            {expanded ? (
              <div className="space-y-3">
                <MarkdownRenderer content={question.content} className="prose-sm" />
                {proxyImageUrl && (
                  <div className="relative w-40 h-40">
                    <Image
                      src={proxyImageUrl}
                      alt="题目配图"
                      fill
                      sizes="160px"
                      className="object-contain rounded border"
                    />
                  </div>
                )}
                <div className="rounded border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="text-xs font-semibold text-primary mb-1">参考答案</p>
                  <MarkdownRenderer content={question.answer} className="prose-sm" />
                </div>
              </div>
            ) : (
              <div className="line-clamp-2">
                <MarkdownRenderer content={question.content} className="prose-sm" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onView && (
              <Button variant="ghost" size="sm" onClick={() => onView(question)}>
                查看
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  展开
                </>
              )}
            </Button>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(question)}>
                编辑
              </Button>
            )}
            {onDuplicate && (
              <Button variant="ghost" size="sm" onClick={() => onDuplicate(question)}>
                加入题篮
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onDelete(question)}
              >
                删除
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
