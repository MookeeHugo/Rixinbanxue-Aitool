"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdvancedQuestionEditor } from "@/components/advanced-question-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles } from "lucide-react"

interface ImageBlock {
  id: string
  url: string
  pageIndex: number
  position: number
  width: number
  align: "left" | "center" | "right"
  caption?: string
  confidence: number
  used: boolean
}

interface Question {
  id: string
  type: "choice" | "fill" | "solve"
  content?: string
  options?: string[]
  answer: string
  difficulty?: "easy" | "medium" | "hard"
  hasImage?: boolean
  imageUrl?: string
  ocrText?: string
  rawOcrText?: string
  rawText?: string
  cleanText?: string
  images?: ImageBlock[]
  confidence?: number
  lowConfidenceRanges?: Array<{
    start: number
    end: number
    text: string
    originalText: string
    confidence: number
  }>
  imageBlocks?: Array<{
    id: string
    url: string
    width: number
    height: number
    caption: string
    isUsed: boolean
    insertedAt?: number
    alignment?: string
    suggestedPosition?: number
  }>
  aiSuggestions?: {
    tags: {
      source: string[]
      textbook: string[]
      semester: string[]
      knowledgePoints: string[]
      thinkingMethod: string[]
      difficulty: string[]
    }
    confidence: number
  }
}

interface QuestionEditDialogProps {
  question: Question
  onSave: (question: Question) => void
  onClose: () => void
}

const typeLabels = {
  choice: "选择题",
  fill: "填空题",
  solve: "解答题",
}

export function QuestionEditDialog({ question, onSave, onClose }: QuestionEditDialogProps) {
  const [editedQuestion, setEditedQuestion] = useState(question)
  const hasAdvancedData = question.ocrText || question.imageBlocks || question.aiSuggestions

  const handleSave = () => {
    onSave(editedQuestion)
  }

  const handleAdvancedSave = (updatedQuestion: Question) => {
    setEditedQuestion(updatedQuestion)
    onSave(updatedQuestion)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            编辑题目
            <Badge variant="outline">{typeLabels[question.type]}</Badge>
            {question.confidence && question.confidence < 0.9 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Sparkles className="h-3 w-3 mr-1" />
                AI 识别 {Math.round(question.confidence * 100)}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {hasAdvancedData ? (
          <div className="flex-1 overflow-hidden">
            <AdvancedQuestionEditor
              question={editedQuestion}
              onSave={handleAdvancedSave}
              onCancel={onClose}
            />
          </div>
        ) : (
          // 简单编辑模式（保持原有功能）
          <div className="space-y-6 py-4 overflow-y-auto">
            <Tabs defaultValue="content" className="w-full">
              <TabsList>
                <TabsTrigger value="content">题目内容</TabsTrigger>
                {editedQuestion.type === "choice" && <TabsTrigger value="options">选项</TabsTrigger>}
                <TabsTrigger value="answer">答案</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <textarea
                  value={editedQuestion.content || ''}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, content: e.target.value })}
                  className="w-full min-h-[200px] p-4 border rounded-md font-mono text-sm"
                  placeholder="输入题目内容..."
                />
              </TabsContent>

              {editedQuestion.type === "choice" && (
                <TabsContent value="options" className="space-y-3">
                  {editedQuestion.options?.map((option, idx) => (
                    <input
                      key={idx}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editedQuestion.options!]
                        newOptions[idx] = e.target.value
                        setEditedQuestion({ ...editedQuestion, options: newOptions })
                      }}
                      className="w-full p-2 border rounded-md"
                    />
                  ))}
                </TabsContent>
              )}

              <TabsContent value="answer" className="space-y-4">
                <textarea
                  value={editedQuestion.answer}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, answer: e.target.value })}
                  className="w-full min-h-[150px] p-4 border rounded-md"
                  placeholder="输入参考答案..."
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                保存修改
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
