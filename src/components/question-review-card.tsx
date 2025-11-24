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
import { CheckCircle2, Edit, Trash2, AlertCircle } from 'lucide-react'
import type { ParsedQuestionRecord } from '@/lib/ai-question-bank'
import { updateQuestion, deleteQuestion } from '@/app/actions/question-upload'
import { useRouter } from 'next/navigation'

interface QuestionReviewCardProps {
  question: ParsedQuestionRecord
  index: number
}

function renderQuestionContent(content: string) {
  return (
    <div
      className="prose prose-sm prose-slate dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
    />
  )
}

export function QuestionReviewCard({ question, index }: QuestionReviewCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 编辑状态
  const [editedData, setEditedData] = useState({
    type: question.type,
    content: question.content,
    options: question.options || [],
    answer: question.answer
  })

  const isLowConfidence = question.confidence < 0.8

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

  return (
    <>
      <Card className={`border rounded-xl ${isLowConfidence ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{`第 ${question.number || index + 1} 题`}</Badge>
            <Badge>{question.type}</Badge>
            <Badge variant="outline">{question.tags?.difficulty || 'unknown'}</Badge>
            <span className={`text-xs ${isLowConfidence ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}`}>
              置信度 {(question.confidence * 100).toFixed(0)}%
            </span>
            {isLowConfidence && (
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
          {renderQuestionContent(question.content)}

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
                {question.tags.knowledge.map(tag => (
                  <Badge variant="outline" key={tag}>
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
                onValueChange={(value) => setEditedData({ ...editedData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单选题</SelectItem>
                  <SelectItem value="multiple">多选题</SelectItem>
                  <SelectItem value="judge">判断题</SelectItem>
                  <SelectItem value="fill">填空题</SelectItem>
                  <SelectItem value="short">简答题</SelectItem>
                  <SelectItem value="essay">论述题</SelectItem>
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
                placeholder="输入题目内容..."
              />
            </div>

            {/* 选项（单选/多选题） */}
            {(editedData.type === 'single' || editedData.type === 'multiple') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选项</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                  >
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
                        <Trash2 className="w-4 h-4" />
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
