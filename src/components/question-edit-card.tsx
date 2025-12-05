'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, CheckCircle2, Edit2, Maximize2, Minimize2, X } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { WorkflowQuestion, WorkflowTag } from '@/components/question-workflow-types'

interface QuestionEditCardProps {
  question: WorkflowQuestion
  index: number
  isActive: boolean
  isCompleted: boolean
  onUpdateTags: (tags: WorkflowTag[]) => void
}

const TYPE_LABELS: Record<WorkflowQuestion['type'], string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}

export function QuestionEditCard({
  question,
  index,
  isActive,
  isCompleted,
  onUpdateTags
}: QuestionEditCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(question.content)
  const [isExpanded, setIsExpanded] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const isLongContent = useMemo(() => editedContent.length > 220, [editedContent])

  return (
    <Card
      className={cn(
        'space-y-4 border-slate-800 bg-slate-950/80 p-6 shadow-lg transition-all duration-300',
        isActive && 'ring-2 ring-sky-500 shadow-sky-700/20',
        !isCompleted && 'border-amber-400/40'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">第 {index} 题</span>
          <Badge variant="outline" className="border-slate-700 text-slate-200">
            {TYPE_LABELS[question.type]}
          </Badge>
          <Badge
            className={cn(
              'text-xs',
              isCompleted ? 'bg-emerald-500 text-white' : 'bg-amber-500/90 text-white'
            )}
          >
            {isCompleted ? '已完成' : '缺少标签'}
          </Badge>
          {isActive && <Badge className="bg-sky-600 text-white">正在编辑</Badge>}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant='ghost' size="sm" onClick={() => setIsEditing(false)} className="text-slate-300">
                <X className="mr-1 h-4 w-4" />
                取消
              </Button>
              <Button
                size="sm"
                onClick={() => setIsEditing(false)}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                <Check className="mr-1 h-4 w-4" />
                保存
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-slate-300 hover:text-white"
            >
              <Edit2 className="mr-1 h-4 w-4" />
              修改题干
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(event) => setEditedContent(event.target.value)}
          className="min-h-[160px] border-slate-700 bg-slate-900 text-slate-100"
        />
      ) : (
        <div className="space-y-2 text-slate-100">
          <div
            className={cn(
              'whitespace-pre-wrap leading-relaxed',
              isLongContent && !isExpanded && 'line-clamp-3'
            )}
          >
            {question.content}
          </div>
          {isLongContent && (
            <Button
              variant="ghost"
              size="sm"
              className="text-sky-400 hover:text-sky-300"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="mr-1 h-4 w-4" />
                  收起
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1 h-4 w-4" />
                  展开全部
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {question.image && (
        <button
          type="button"
          className="group relative w-full overflow-hidden rounded-lg border border-slate-800"
          onClick={() => setPreviewImage(question.image ?? null)}
        >
          <Image
            src={question.image}
            alt="题目配图"
            width={1200}
            height={600}
            className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white transition-all group-hover:bg-slate-900/30">
            <Maximize2 className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
      )}

      {question.type === 'choice' && question.options && (
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          {question.options.map((option) => (
            <div key={option} className="text-sm text-slate-200">
              {option}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-4">
        <p className="text-xs font-semibold text-emerald-200">参考答案</p>
        <p className="text-slate-50">{question.answer}</p>
      </div>

      {question.tags.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold text-slate-400">已添加标签</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {question.tags.map((tag, tagIndex) => (
              <Badge key={`${tag.category}-${tag.value}`} className="flex items-center gap-1 bg-slate-800 text-slate-200">
                {tag.value}
                <button
                  type="button"
                  className="rounded-full bg-slate-700/80 p-0.5 text-slate-300 hover:bg-slate-600"
                  onClick={() => {
                    const updated = question.tags.filter((_, idx) => idx !== tagIndex)
                    onUpdateTags(updated)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>题目配图</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <Image src={previewImage} alt="题目配图" width={1600} height={900} className="h-auto w-full rounded" />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
