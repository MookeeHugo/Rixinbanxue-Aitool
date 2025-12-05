'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Edit2, Check, X, ZoomIn, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  type: 'choice' | 'fill' | 'solve'
  content: string
  options?: string[]
  answer: string
  tags: any[]
  image?: string
}

interface QuestionEditCardProps {
  question: Question
  index: number
  onUpdateTags: (tags: any[]) => void
  isActive?: boolean
  isCompleted?: boolean
}

const typeLabels = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题',
}

export function QuestionEditCard({ question, index, onUpdateTags, isActive = false, isCompleted = false }: QuestionEditCardProps) {
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editedContent, setEditedContent] = useState(question.content)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isLongContent = question.content.length > 200

  const handleSaveContent = () => {
    setIsEditingContent(false)
  }

  return (
    <>
      <Card className={cn(
        'p-6 transition-all duration-300',
        isActive 
          ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-50/30' 
          : isCompleted
            ? 'border-2 border-green-400 shadow-md'
            : 'border border-gray-200 shadow-md hover:shadow-lg',
        !isCompleted && !isActive && 'ring-2 ring-amber-400/30'
      )}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-lg font-semibold transition-all duration-300',
                isActive ? 'text-blue-700 scale-105' : 'text-gray-900'
              )}>
                第 {index} 题
              </span>
              <Badge variant="outline" className={cn(
                isActive && 'border-blue-500 text-blue-700 bg-blue-50'
              )}>
                {typeLabels[question.type]}
              </Badge>
              {isCompleted ? (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  已完成
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  待标注
                </Badge>
              )}
              {isActive && (
                <Badge className="bg-blue-600 text-white animate-pulse">
                  正在编辑
                </Badge>
              )}
            </div>
            {!isEditingContent ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingContent(true)}
                className="hover:bg-blue-50"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                编辑题目
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingContent(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveContent}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  保存
                </Button>
              </div>
            )}
          </div>

          {isEditingContent ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[120px] font-mono"
            />
          ) : (
            <div className="space-y-2">
              <div className={cn(
                "text-gray-900 whitespace-pre-wrap leading-relaxed transition-all",
                isLongContent && !isExpanded && "line-clamp-3"
              )}>
                {question.content}
              </div>
              {isLongContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-600 hover:text-blue-700 text-xs"
                >
                  {isExpanded ? '收起' : '展开全部'}
                </Button>
              )}
            </div>
          )}

          {question.image && (
            <div
              className="relative rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setZoomImage(question.image ?? null)}
            >
              <img 
                src={question.image || "/placeholder.svg"} 
                alt="题目图片" 
                className="w-full h-auto transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {question.type === 'choice' && question.options && (
            <div className="space-y-2 pl-4 border-l-2 border-blue-300">
              {question.options.map((option, idx) => (
                <div key={idx} className="text-gray-700">
                  {option}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <div className="text-sm font-semibold text-green-700 mb-1">参考答案</div>
            <div className="text-gray-900">{question.answer}</div>
          </div>

          {question.tags.length > 0 && (
            <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-2 border-blue-200">
              <div className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Badge className="bg-blue-600">已添加标签</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-sm py-1 px-3 bg-white border-blue-300 text-blue-700 shadow-sm"
                  >
                    {tag.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-4xl">
          <img src={zoomImage || ''} alt="放大查看" className="w-full h-auto" />
          <DialogClose className="absolute top-4 right-4" />
        </DialogContent>
      </Dialog>
    </>
  )
}
