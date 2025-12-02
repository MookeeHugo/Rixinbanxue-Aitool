"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

type QuestionRecord = Question & {
  knowledge_points?: string[]
  options?: string[] | null
  analysis_content?: string | null
  analysis?: string | null
  image_url?: string | null
  province?: string | null
  year?: number | null
  source?: string | null
  is_public?: boolean
}

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<QuestionRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft')

  const questionId = useMemo(() => {
    const raw = params?.id
    if (!raw) return null
    if (Array.isArray(raw)) return raw[0]
    return raw
  }, [params])

  useEffect(() => {
    if (!questionId) return
    loadQuestion(questionId)
  }, [questionId])

  const loadQuestion = async (id: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setQuestion(null)
        return
      }
      setQuestion(data as QuestionRecord)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setDeleteMode('soft')
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!questionId) return
    try {
      setDeleting(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch('/api/questions/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          questionId,
          hard: deleteMode === 'hard',
          deleteAssets: true,
          imageUrls: question?.image_url ? [question.image_url] : [],
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '删除失败')
      }
      toast({
        title: '删除成功',
        description: deleteMode === 'hard' ? '已彻底删除' : '已归档',
      })
      router.push('/questions')
    } catch (err: any) {
      logger.error('Error occurred', { error: err })
      toast({
        title: '删除失败',
        description: err.message || '删除失败，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteModalOpen(false)
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
      )
    }

    if (!question) {
      return (
        <Card className="p-8 text-center">
          <div className="text-xl font-semibold mb-2">未找到题目</div>
          <p className="text-muted-foreground mb-6">题目不存在或已被删除</p>
          <Link href="/questions">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Button>
          </Link>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">题目详情</h1>
            <p className="text-muted-foreground mt-1">
              查看题干、答案与解析，并可进行编辑或删除
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/questions">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回列表
              </Button>
            </Link>
            <Link href={`/questions/${question.id}/edit`}>
              <Button variant="outline">
                <Edit3 className="mr-2 h-4 w-4" />
                编辑
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex items-center flex-wrap gap-3">
            <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
            <Badge variant="outline">{getDifficultyLabel(question.difficulty)}</Badge>
            {question.is_public === false && (
              <Badge variant="error">私有</Badge>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">题干</h2>
            <p className="leading-7 whitespace-pre-wrap text-foreground">
              {question.content}
            </p>
          </section>

          {question.type === 'choice' && Array.isArray(question.options) && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">选项</h2>
              <div className="space-y-2">
                {question.options.map((opt: string, idx: number) => (
                  <div
                    key={`${opt}-${idx}`}
                    className="rounded-lg border border-border/80 bg-background-secondary px-4 py-3"
                  >
                    {String.fromCharCode(65 + idx)}. {opt}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">答案</h3>
              <div className="rounded-lg border border-border/80 bg-background-secondary px-4 py-3 leading-7 whitespace-pre-wrap">
                {question.answer}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">解析</h3>
              <div className="rounded-lg border border-border/80 bg-background-secondary px-4 py-3 leading-7 whitespace-pre-wrap">
                {question.analysis_content || question.analysis || '暂无解析'}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">知识点与元信息</h3>
            <div className="flex flex-wrap gap-2">
              {question.knowledge_points?.length ? (
                question.knowledge_points.map((kp) => (
                  <Badge key={kp} variant="outline">
                    {kp}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">暂无知识点</span>
              )}
              {question.province && (
                <Badge variant="outline">省份：{question.province}</Badge>
              )}
              {question.year && (
                <Badge variant="outline">年份：{question.year}</Badge>
              )}
              {question.source && (
                <Badge variant="outline">来源：{question.source}</Badge>
              )}
            </div>
          </section>

          {question.image_url ? (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">图片</h3>
              <Card className="p-3 flex items-center justify-center">
                <img
                  src={question.image_url}
                  alt="题目图片"
                  className="max-h-72 object-contain"
                />
              </Card>
            </section>
          ) : null}
        </Card>
      </div>
    )
  }

  const getTypeLabel = (type?: string) => {
    const map: Record<string, string> = {
      choice: '选择题',
      fill: '填空题',
      essay: '解答题',
    }
    return map[type || ''] || '题目'
  }

  const getDifficultyLabel = (difficulty?: string) => {
    const map: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    }
    return map[difficulty || ''] || '未设置'
  }

  return (
    <>
      <div className="space-y-6">{renderContent()}</div>
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除题目</DialogTitle>
            <DialogDescription>
              软删除会保留题目数据并仅对作者隐藏；硬删除将彻底移除题目及图片。
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={deleteMode} onValueChange={(value: 'soft' | 'hard') => setDeleteMode(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="soft" id="soft" />
              <Label htmlFor="soft">软删除（可在数据库恢复）</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hard" id="hard" />
              <Label htmlFor="hard">硬删除（不可恢复）</Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              取消
            </Button>
            <Button
              variant={deleteMode === 'hard' ? 'destructive' : 'default'}
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? '删除中...' : deleteMode === 'hard' ? '硬删除' : '软删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
