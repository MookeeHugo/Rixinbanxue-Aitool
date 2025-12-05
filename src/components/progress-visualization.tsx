'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowQuestion } from '@/components/question-workflow-types'

interface ProgressVisualizationProps {
  currentIndex: number
  totalQuestions: number
  completedCount: number
  questions: WorkflowQuestion[]
  onSelectQuestion: (index: number) => void
}

export function ProgressVisualization({
  currentIndex,
  totalQuestions,
  completedCount,
  questions,
  onSelectQuestion
}: ProgressVisualizationProps) {
  const progress = totalQuestions === 0 ? 0 : Math.round((completedCount / totalQuestions) * 100)
  const circumference = 2 * Math.PI * 24

  return (
    <Card className="p-4 shadow-lg bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-slate-800/60 border-slate-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0">
            <svg className="h-16 w-16 -rotate-90 text-slate-700">
              <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" fill="none" />
              <circle
                cx="32"
                cy="32"
                r="24"
                stroke="#38bdf8"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (progress / 100) * circumference}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-sky-300">
              {progress}%
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">当前进度</p>
            <p className="text-2xl font-semibold text-white">
              {completedCount}/{totalQuestions}
            </p>
            <p className="text-xs text-slate-400">已完成标注（包含知识点与难度标签）</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-xs font-medium text-slate-400">快速跳转</p>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {questions.map((question, index) => {
              const isCompleted =
                question.tags.some((tag) => tag.category === 'knowledge') &&
                question.tags.some((tag) => tag.category === 'difficulty')
              const isCurrent = index === currentIndex

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onSelectQuestion(index)}
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all duration-200',
                    isCurrent
                      ? 'border-sky-400 bg-slate-900 text-white shadow-lg shadow-sky-500/30'
                      : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-400 hover:text-white',
                    isCompleted && 'border-emerald-500 text-emerald-100 hover:border-emerald-400'
                  )}
                >
                  {index + 1}
                  {isCompleted && (
                    <CheckCircle2 className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-slate-900 text-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">当前正在标注第 {currentIndex + 1} 道题目</p>
        </div>
      </div>
    </Card>
  )
}
