"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChevronDown, ChevronUp, Edit, Copy, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdvancedQuestionEditor } from "./advanced-question-editor"

interface Question {
  id: string
  type: "choice" | "fill" | "solve"
  content: string
  answer: string
  tags?: Array<{ category: string; value: string; id?: string }>
  createdAt?: string
}

interface QuestionLibraryCardProps {
  question: Question
  isSelected: boolean
  onToggle: () => void
}

const typeLabels = {
  choice: "选择题",
  fill: "填空题",
  solve: "解答题",
}

export function QuestionLibraryCard({ question, isSelected, onToggle }: QuestionLibraryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const convertToEditorFormat = () => {
    return {
      id: question.id,
      content: question.content,
      answer: question.answer,
      type: question.type,
      tags: question.tags || [],
      images: [], // Library questions may not have images, use empty array
      confidence: 100, // Library questions are already reviewed, high confidence
      ocrText: question.content, // Use content as OCR text
      lowConfidenceRegions: [], // No low confidence regions for library questions
    }
  }

  const handleEditorSave = (updatedQuestion: any) => {
    console.log("[v0] Saving updated question:", updatedQuestion)
    // TODO: Implement actual save logic
    setIsEditorOpen(false)
  }

  return (
    <>
      <Card className={cn("overflow-hidden transition-all", isSelected ? "border-primary/50 bg-white" : "bg-white")}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{typeLabels[question.type]}</Badge>
                  {question.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {tag.value}
                    </Badge>
                  ))}
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">{question.createdAt}</span>
              </div>

              {/* Content Preview */}
              <div className="text-text-primary mb-3">
                {isExpanded ? (
                  <div className="space-y-3">
                    <div className="whitespace-pre-wrap leading-relaxed">{question.content}</div>
                    <div className="rounded-lg bg-primary-light p-4 border border-primary/20">
                      <div className="text-sm font-semibold text-primary mb-1">参考答案</div>
                      <div className="text-text-primary whitespace-pre-wrap">{question.answer}</div>
                    </div>
                  </div>
                ) : (
                  <div className="line-clamp-2">{question.content}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      收起
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      展开
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(true)}>
                  <Edit className="mr-1 h-4 w-4" />
                  编辑
                </Button>
                <Button variant="ghost" size="sm">
                  <Copy className="mr-1 h-4 w-4" />
                  复制
                </Button>
                <Button variant="ghost" size="sm" className="text-error hover:text-error">
                  <Trash2 className="mr-1 h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <AdvancedQuestionEditor
            question={convertToEditorFormat()}
            onSave={handleEditorSave}
            onCancel={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
