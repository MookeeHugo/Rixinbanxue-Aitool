'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, Edit, Trash2, AlertCircle, Plus, X } from 'lucide-react'
import type { ParsedQuestionRecord, DifficultyLevel } from '@/lib/ai-question-bank'
import { updateQuestion, deleteQuestion } from '@/app/actions/question-upload'
import { useRouter } from 'next/navigation'
import { QuestionContentRenderer } from './question-content-renderer'
import {
  getQuestionTypeLabel,
  getDifficultyLabel,
  getDifficultyColor,
  formatConfidence,
  isLowConfidence
} from '@/lib/ai-question-bank/display-helpers'

interface QuestionReviewCardProps {
  question: ParsedQuestionRecord
  index: number
  imageUrl?: string
}

export function QuestionReviewCard({ question, index, imageUrl }: QuestionReviewCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 编辑状态
  const [editedData, setEditedData] = useState({
    type: question.type,
    content: question.content,
    options: question.options || [],
    answer: question.answer,
    tags: question.tags
  })

  const lowConfidence = isLowConfidence(question.confidence)
  const difficultyColor = getDifficultyColor(question.tags?.difficulty || 'medium')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateQuestion(question.id, editedData)

      if (result.success) {
        setIsEditing(false)
        router.refresh() // 刷新服务端数据
      } else {
        alert(`保存失败: ${result.error}`)
      }
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这道题目吗？')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteQuestion(question.id)

      if (result.success) {
        router.refresh() // 刷新服务端数据
      } else {
        alert(`删除失败: ${result.error}`)
      }
    } catch (error) {
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddOption = () => {
    setEditedData({
      ...editedData,
      options: [...editedData.options, '']
    })
  }

  const handleRemoveOption = (idx: number) => {
    setEditedData({
      ...editedData,
      options: editedData.options.filter((_, i) => i !== idx)
    })
  }

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = [...editedData.options]
    newOptions[idx] = value
    setEditedData({
      ...editedData,
      options: newOptions
    })
  }

  const handleAddKnowledgePoint = () => {
    setEditedData({
      ...editedData,
      tags: {
        ...editedData.tags,
        knowledge: [...(editedData.tags.knowledge || []), '']
      }
    })
  }

  const handleRemoveKnowledgePoint = (idx: number) => {
    setEditedData({
      ...editedData,
      tags: {
        ...editedData.tags,
        knowledge: editedData.tags.knowledge.filter((_, i) => i !== idx)
      }
    })
  }

  const handleKnowledgePointChange = (idx: number, value: string) => {
    const newKnowledge = [...editedData.tags.knowledge]
    newKnowledge[idx] = value
    setEditedData({
      ...editedData,
      tags: {
        ...editedData.tags,
        knowledge: newKnowledge
      }
    })
  }

  return (
    <>
      <Card className={`border rounded-xl ${lowConfidence ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{`第 ${question.number || index + 1} 题`}</Badge>
            <Badge>{getQuestionTypeLabel(question.type)}</Badge>
            <Badge variant="outline" className={difficultyColor}>
              {getDifficultyLabel(question.tags?.difficulty || 'medium')}
            </Badge>
            <span className={`text-xs ${lowConfidence ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}`}>
              置信度 {formatConfidence(question.confidence)}
            </span>
            {lowConfidence && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                需人工复核
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {question.is_selected && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" /> 已选择
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 使用 QuestionContentRenderer 显示题目内容和图片 */}
          <QuestionContentRenderer
            content={question.content}
            imageUrl={imageUrl}
          />

          {question.options && question.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">选项：</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {question.options.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1 text-sm">
            <p className="font-medium">答案：</p>
            <div className="text-muted-foreground">{question.answer}</div>
          </div>

          {question.steps && question.steps.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">AI 解题步骤：</p>
              <ul className="list-decimal list-inside space-y-1 text-muted-foreground">
                {question.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {question.tags?.knowledge?.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">知识点：</p>
              <div className="flex flex-wrap gap-2">
                {question.tags.knowledge.map((tag, i) => (
                  <Badge variant="outline" key={i}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑题目</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 题目类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">题目类型</Label>
              <Select
                value={editedData.type}
                onValueChange={(value) => setEditedData({ ...editedData, type: value as any })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="choice">选择题</SelectItem>
                  <SelectItem value="fill">填空题</SelectItem>
                  <SelectItem value="essay">简答题</SelectItem>
                  <SelectItem value="proof">证明题</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 题目内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">题目内容</Label>
              <Textarea
                id="content"
                value={editedData.content}
                onChange={(e) => setEditedData({ ...editedData, content: e.target.value })}
                className="min-h-[150px] font-mono text-sm"
                placeholder="输入题目内容... 支持LaTeX公式，如 $x^2 + 1$"
              />
              <p className="text-xs text-muted-foreground">
                提示：LaTeX公式使用 $公式$ (行内) 或 $$公式$$ (块级)
              </p>
            </div>

            {/* 选项（选择题） */}
            {editedData.type === 'choice' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选项</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                  >
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
                </div>
              </div>
            )}

            {/* 答案 */}
            <div className="space-y-2">
              <Label htmlFor="answer">答案</Label>
              <Textarea
                id="answer"
                value={editedData.answer}
                onChange={(e) => setEditedData({ ...editedData, answer: e.target.value })}
                className="min-h-[100px]"
                placeholder="输入参考答案..."
              />
            </div>

            {/* 难度 */}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 知识点标签 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>知识点</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddKnowledgePoint}
                >
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
                      placeholder="输入知识点，如：二次函数"
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
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
