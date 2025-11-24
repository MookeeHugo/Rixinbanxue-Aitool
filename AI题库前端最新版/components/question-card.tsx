"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, ImageIcon, Edit, RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Question {
  id: string
  type: "choice" | "fill" | "solve"
  content: string
  options?: string[]
  answer: string
  difficulty: "easy" | "medium" | "hard"
  hasImage: boolean
  imageUrl?: string
  reparseCount?: number
}

interface QuestionCardProps {
  question: Question
  index: number
  isSelected: boolean
  onToggle: () => void
  onEdit?: () => void
  onReparse?: () => void
  isReparsing?: boolean
  onReparseComplete?: () => void
  isAnyParsing?: boolean
}

const typeLabels = {
  choice: "选择题",
  fill: "填空题",
  solve: "解答题",
}

const difficultyLabels = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
}

const difficultyColors = {
  easy: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard: "bg-error/10 text-error border-error/20",
}

export function QuestionCard({
  question,
  index,
  isSelected,
  onToggle,
  onEdit,
  onReparse,
  isReparsing,
  onReparseComplete,
  isAnyParsing = false,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleReparseClick = () => {
    if (isAnyParsing && !isReparsing) {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 2000)
      return
    }
    if (onReparse) {
      onReparse()
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 bg-white",
        isSelected ? "border-blue-200 shadow-md" : "border-gray-200 opacity-75",
        isReparsing && "border-orange-300 bg-orange-50/50",
      )}
    >
      <div className="p-6 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 bg-white">
                <span className="font-semibold text-gray-900">第 {index} 题</span>
                <Badge variant="outline" className="text-xs">
                  {typeLabels[question.type]}
                </Badge>
                <Badge variant="outline" className={cn("text-xs border", difficultyColors[question.difficulty])}>
                  {difficultyLabels[question.difficulty]}
                </Badge>
                {question.hasImage && (
                  <Badge variant="outline" className="text-xs">
                    <ImageIcon className="mr-1 h-3 w-3" />
                    含图片
                  </Badge>
                )}
                {!isReparsing && question.reparseCount && question.reparseCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    已重解析 {question.reparseCount} 次
                  </Badge>
                )}
              </div>

              {isReparsing && (
                <div className="mb-4 space-y-3 bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-orange-600">正在重新解析此题...</div>
                      <div className="text-xs text-gray-500">请稍候</div>
                    </div>
                  </div>
                </div>
              )}

              {isExpanded && !isReparsing && (
                <div className="space-y-4">
                  <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">{question.content}</div>

                  {question.hasImage && question.imageUrl && (
                    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white p-4">
                      <img src={question.imageUrl || "/placeholder.svg"} alt="题目图片" className="max-w-full h-auto" />
                    </div>
                  )}

                  {question.type === "choice" && question.options && (
                    <div className="space-y-2 pl-4">
                      {question.options.map((option, idx) => (
                        <div key={idx} className="text-gray-900">
                          {option}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                    <div className="text-sm font-semibold text-blue-900 mb-1">参考答案</div>
                    <div className="text-gray-900 whitespace-pre-wrap">{question.answer}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onReparse && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReparseClick}
                  disabled={isReparsing}
                  className={cn(
                    "text-gray-600 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-50",
                    isAnyParsing && !isReparsing && "opacity-40 cursor-not-allowed",
                  )}
                  title="重新解析此题"
                >
                  <RefreshCw className={cn("h-4 w-4", isReparsing && "animate-spin")} />
                </Button>
                {showTooltip && isAnyParsing && !isReparsing && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                    正在解析中，请稍候
                    <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-gray-600">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
