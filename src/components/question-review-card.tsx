'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { QuestionContentRenderer } from './question-content-renderer'
import type { ParsedQuestionRecord, DifficultyLevel } from '@/lib/ai-question-bank'
import { updateQuestion, deleteQuestion } from '@/app/actions/question-upload'
import {
  formatConfidence,
  getDifficultyColor,
  getDifficultyLabel,
  getQuestionTypeLabel,
  isLowConfidence
} from '@/lib/ai-question-bank/display-helpers'
import { AlertCircle, CheckCircle2, Edit, Plus, Trash2, X } from 'lucide-react'

interface QuestionReviewCardProps {
  question: ParsedQuestionRecord
  index: number
  imageUrl?: string
}

export function QuestionReviewCard({ question, index, imageUrl }: QuestionReviewCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [editedData, setEditedData] = useState({
    type: question.type,
    content: question.content,
    options: question.options || [],
    answer: question.answer || '',
    tags: {
      ...question.tags,
      difficulty: (question.tags?.difficulty as DifficultyLevel) || 'medium',
      knowledge: question.tags?.knowledge || []
    }
  })

  const lowConfidence = isLowConfidence(question.confidence)
  const difficultyColor = getDifficultyColor(editedData.tags.difficulty)
  const questionNumber = question.number || index + 1

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateQuestion(question.id, editedData)
      if (!result.success) {
        throw new Error(result.error || '未知错误')
      }

      toast({
        title: '保存成功',
        description: '题目信息已更新'
      })
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteQuestion(question.id)
      if (!result.success) {
        throw new Error(result.error || '未知错误')
      }

      toast({
        title: '已删除',
        description: `第 ${questionNumber} 题已移出列表`
      })
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddOption = () => {
    setEditedData((prev) => ({
      ...prev,
      options: [...prev.options, '']
    }))
  }

  const handleRemoveOption = (idx: number) => {
    setEditedData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx)
    }))
  }

  const handleOptionChange = (idx: number, value: string) => {
    setEditedData((prev) => {
      const next = [...prev.options]
      next[idx] = value
      return { ...prev, options: next }
    })
  }

  const handleAddKnowledgePoint = () => {
    setEditedData((prev) => ({
      ...prev,
      tags: { ...prev.tags, knowledge: [...prev.tags.knowledge, ''] }
    }))
  }

  const handleRemoveKnowledgePoint = (idx: number) => {
    setEditedData((prev) => ({
      ...prev,
      tags: {
        ...prev.tags,
        knowledge: prev.tags.knowledge.filter((_, i) => i !== idx)
      }
    }))
  }

  const handleKnowledgePointChange = (idx: number, value: string) => {
    setEditedData((prev) => {
      const next = [...prev.tags.knowledge]
      next[idx] = value
      return {
        ...prev,
        tags: {
          ...prev.tags,
          knowledge: next
        }
      }
    })
  }

  return (
    <>
      <Card className={`border rounded-xl ${lowConfidence ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{`第 ${questionNumber} 题`}</Badge>
            <Badge>{getQuestionTypeLabel(question.type)}</Badge>
            <Badge variant="outline" className={difficultyColor}>
              {getDifficultyLabel(editedData.tags.difficulty)}
            </Badge>
            <span className={`text-xs ${lowConfidence ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}`}>
              置信度 {formatConfidence(question.confidence)}
            </span>
            {lowConfidence && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                建议人工复核
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {question.is_selected && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" /> 已选中
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuestionContentRenderer
            content={question.content}
            imageUrl={imageUrl}
            questionImageUrl={question.question_image_url}
            imageAssets={question.image_assets}
          />

          {question.options && question.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">选项</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {question.options.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
            </div>
          )}

          {question.answer && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">答案</p>
              <div className="text-muted-foreground">{question.answer}</div>
            </div>
          )}

          {question.steps && question.steps.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">AI 解题步骤</p>
              <ul className="list-decimal list-inside space-y-1 text-muted-foreground">
                {question.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {question.tags?.knowledge?.length ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">知识点</p>
              <div className="flex flex-wrap gap-2">
                {question.tags.knowledge.map((tag, i) => (
                  <Badge variant="outline" key={i}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑题目</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">题目类型</Label>
              <Select
                value={editedData.type}
                onValueChange={(value) => setEditedData({ ...editedData, type: value as typeof editedData.type })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="请选择题型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="choice">选择题</SelectItem>
                  <SelectItem value="fill">填空题</SelectItem>
                  <SelectItem value="essay">解答题</SelectItem>
                  <SelectItem value="proof">证明题</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">题干</Label>
              <Textarea
                id="content"
                value={editedData.content}
                onChange={(e) => setEditedData({ ...editedData, content: e.target.value })}
                className="min-h-[150px] font-mono text-sm"
                placeholder="请输入题干，支持 Markdown/LaTeX，例如：$x^2+1$"
              />
              <p className="text-xs text-muted-foreground">提示：LaTeX 行内使用 $表达式$，块级使用 $$表达式$$</p>
            </div>

            {editedData.type === 'choice' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选项</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                    <Plus className="w-4 h-4 mr-1" />
                    添加选项
                  </Button>
                </div>
                <div className="space-y-2">
                  {editedData.options.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveOption(idx)}
                        disabled={editedData.options.length <= 2}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {editedData.options.length === 0 && (
                    <p className="text-xs text-muted-foreground">请至少填写两个选项</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="answer">答案/解析</Label>
              <Textarea
                id="answer"
                value={editedData.answer}
                onChange={(e) => setEditedData({ ...editedData, answer: e.target.value })}
                className="min-h-[100px]"
                placeholder="可输入答案或简要解析"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">难度</Label>
              <Select
                value={editedData.tags.difficulty}
                onValueChange={(value) =>
                  setEditedData({
                    ...editedData,
                    tags: { ...editedData.tags, difficulty: value as DifficultyLevel }
                  })
                }
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="请选择难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">适中</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>知识点</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddKnowledgePoint}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加知识点
                </Button>
              </div>
              <div className="space-y-2">
                {editedData.tags.knowledge.map((kp, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={kp}
                      onChange={(e) => handleKnowledgePointChange(idx, e.target.value)}
                      placeholder="请输入知识点，如：函数图像"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveKnowledgePoint(idx)}
                      disabled={editedData.tags.knowledge.length <= 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {editedData.tags.knowledge.length === 0 && (
                  <p className="text-xs text-muted-foreground">暂无知识点，可点击上方按钮添加</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除这道题？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            删除后将无法恢复，系统也不会再展示第 {questionNumber} 题的内容。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
