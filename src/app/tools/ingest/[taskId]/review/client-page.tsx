'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckSquare, Square, Upload } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ParsedQuestionRecord, UploadTask } from '@/lib/ai-question-bank'
import { QuestionReviewCard } from '@/components/question-review-card'
import { submitQuestions } from '@/app/actions/question-upload'

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 调试：检查传入的数据
  console.log('[ClientReviewPage] 接收到的props:', {
    taskId: task.id,
    questionCount: initialQuestions.length,
    imageUrlsCount: Object.keys(imageUrls).length,
    imageUrls: Object.entries(imageUrls).map(([key, url]) => ({
      key,
      url: url.substring(0, 100) + '...'
    })),
    questionsWithImages: initialQuestions.filter(q => q.original_image_url).map(q => ({
      id: q.id,
      number: q.number,
      original_image_url: q.original_image_url,
      hasSignedUrl: q.original_image_url ? !!imageUrls[q.original_image_url] : false
    }))
  })

  // 未提交的题目
  const unsubmittedQuestions = initialQuestions.filter(q => !q.is_submitted)

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(unsubmittedQuestions.map(q => q.id)))
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleInvertSelection = () => {
    const newSet = new Set<string>()
    unsubmittedQuestions.forEach(q => {
      if (!selectedIds.has(q.id)) {
        newSet.add(q.id)
      }
    })
    setSelectedIds(newSet)
  }

  const handleBatchSubmit = async () => {
    if (selectedIds.size === 0) {
      alert('请至少选择一道题目')
      return
    }

    if (!confirm(`确定要提交选中的 ${selectedIds.size} 道题目到题库吗？`)) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitQuestions(task.id, Array.from(selectedIds))

      if (result.success) {
        alert(`成功提交 ${result.data?.submittedCount} 道题目！`)
        setSelectedIds(new Set())
        router.refresh() // 刷新数据
      } else {
        alert(`提交失败: ${result.error}`)
      }
    } catch (error) {
      alert(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">解析任务详情</p>
          <h1 className="text-3xl font-bold">{task.file_name}</h1>
          <p className="text-sm text-muted-foreground">
            创建于 {formatDate(task.created_at)}
          </p>
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
            共识别 {initialQuestions.length} 道题目，已提交 {initialQuestions.filter(q => q.is_submitted).length} 道，
            还有 {unsubmittedQuestions.length} 道待提交。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 批量操作栏 */}
          {unsubmittedQuestions.length > 0 && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      已选择 {selectedIds.size} / {unsubmittedQuestions.length} 道题目
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        <CheckSquare className="w-4 h-4 mr-1" />
                        全选
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                        disabled={selectedIds.size === 0}
                      >
                        <Square className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleInvertSelection}
                      >
                        反选
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={handleBatchSubmit}
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

          {/* 题目列表 */}
          {initialQuestions.length === 0 ? (
            <div className="text-muted-foreground">暂无解析结果，请稍后重试。</div>
          ) : (
            <div className="space-y-6">
              {initialQuestions.map((question, index) => (
                <div key={question.id} className="flex gap-3 items-start">
                  {/* 选择框 */}
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
    </div>
  )
}
