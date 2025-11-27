'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckSquare, Square, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ParsedQuestionRecord, UploadTask } from '@/lib/ai-question-bank'
import { normalizeFileName } from '@/lib/ai-question-bank/utils'
import { QuestionReviewCard } from '@/components/question-review-card'
import { submitQuestions } from '@/app/actions/question-upload'
import { useToast } from '@/hooks/use-toast'

interface ClientPageProps {
  task: UploadTask
  initialQuestions: ParsedQuestionRecord[]
  imageUrls: Record<string, string>
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ClientReviewPage({ task, initialQuestions, imageUrls }: ClientPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const displayFileName = normalizeFileName(task.file_name)

  console.log('[ClientReviewPage] props 快照', {
    taskId: task.id,
    totalQuestions: initialQuestions.length,
    imageUrlCount: Object.keys(imageUrls).length
  })

  const unsubmittedQuestions = initialQuestions.filter((q) => !q.is_submitted)
  const submittedCount = initialQuestions.filter((q) => q.is_submitted).length

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(unsubmittedQuestions.map((q) => q.id)))
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleInvertSelection = () => {
    const next = new Set<string>()
    unsubmittedQuestions.forEach((q) => {
      if (!selectedIds.has(q.id)) {
        next.add(q.id)
      }
    })
    setSelectedIds(next)
  }

  const openSubmitDialog = () => {
    if (selectedIds.size === 0) {
      toast({
        title: '请选择题目',
        description: '请先勾选至少一道题目再提交',
        variant: 'destructive'
      })
      return
    }
    setSubmitDialogOpen(true)
  }

  const handleBatchSubmit = async () => {
    setIsSubmitting(true)
    try {
      const result = await submitQuestions(task.id, Array.from(selectedIds))
      if (!result.success) {
        throw new Error(result.error || '未知错误')
      }

      toast({
        title: '提交成功',
        description: `已提交 ${result.data?.submittedCount ?? selectedIds.size} 道题目`
      })
      setSelectedIds(new Set())
      setSubmitDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '提交失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">解析任务详情</p>
          <h1 className="text-3xl font-bold">{displayFileName}</h1>
          <p className="text-sm text-muted-foreground">创建于 {formatDate(task.created_at)}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/tools/ingest">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回上传列表
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>解析结果</CardTitle>
          <CardDescription>
            共识别 {initialQuestions.length} 道题，已提交 {submittedCount} 道，剩余 {unsubmittedQuestions.length} 道待处理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {unsubmittedQuestions.length > 0 && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium">
                      已选 {selectedIds.size} / {unsubmittedQuestions.length} 道题
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        <CheckSquare className="w-4 h-4 mr-1" />
                        全选
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedIds.size === 0}>
                        <Square className="w-4 h-4 mr-1" />
                        清空
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleInvertSelection}>
                        反选
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={openSubmitDialog}
                    disabled={selectedIds.size === 0 || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isSubmitting ? '提交中...' : `批量提交 (${selectedIds.size})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {initialQuestions.length === 0 ? (
            <div className="text-muted-foreground">暂未得到解析结果，请稍后重试。</div>
          ) : (
            <div className="space-y-6">
              {initialQuestions.map((question, index) => (
                <div key={question.id} className="flex gap-3 items-start">
                  {!question.is_submitted && (
                    <div className="pt-6">
                      <Checkbox
                        checked={selectedIds.has(question.id)}
                        onCheckedChange={() => handleToggleSelect(question.id)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <QuestionReviewCard
                      question={question}
                      index={index}
                      imageUrl={question.original_image_url ? imageUrls[question.original_image_url] : undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认提交选中的题目？</DialogTitle>
            <DialogDescription>
              即将提交 {selectedIds.size} 道题至题库，提交后不可撤销，请确保题目内容准确无误。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleBatchSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? '提交中...' : '确认提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
