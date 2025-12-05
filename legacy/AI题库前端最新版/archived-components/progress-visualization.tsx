'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressVisualizationProps {
  currentIndex: number
  totalQuestions: number
  completedCount: number
  questions: any[]
  onSelectQuestion: (index: number) => void
}

export function ProgressVisualization({ 
  currentIndex, 
  totalQuestions, 
  completedCount,
  questions,
  onSelectQuestion 
}: ProgressVisualizationProps) {
  const progress = (completedCount / totalQuestions) * 100
  const circumference = 2 * Math.PI * 24 // 减小圆环半径

  return (
    <Card className="p-3 shadow-lg bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Circular Progress and Info */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (progress / 100) * circumference}
                className="text-blue-600 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-base font-bold text-blue-600">{Math.round(progress)}%</div>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-base font-bold text-gray-900">
              已标注 {completedCount}/{totalQuestions} 题
            </div>
            <div className="text-xs text-gray-600">
              当前编辑：第 {currentIndex + 1} 题
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle className="h-3 w-3 text-green-600" />
              已完成（包含知识点和难度标签）
            </div>
          </div>
        </div>

        {/* Right: Question Navigator */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="text-xs font-medium text-gray-700">快速跳转</div>
          <div className="flex flex-wrap gap-1.5 max-w-md justify-end">
            {questions.map((q, idx) => {
              const isCompleted = q.tags.some((t: any) => t.category === 'knowledge') && 
                                q.tags.some((t: any) => t.category === 'difficulty')
              const isCurrent = idx === currentIndex
              
              return (
                <button
                  key={q.id}
                  onClick={() => onSelectQuestion(idx)}
                  className={cn(
                    'w-8 h-8 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center relative text-xs',
                    isCurrent && 'ring-2 ring-blue-500 ring-offset-2 scale-110',
                    isCompleted 
                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-md' 
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-400',
                    !isCurrent && 'hover:scale-105'
                  )}
                >
                  {idx + 1}
                  {isCompleted && (
                    <CheckCircle className="absolute -top-0.5 -right-0.5 h-3 w-3 text-white bg-green-600 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
