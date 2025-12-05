'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react'
import { ProgressVisualization } from '@/components/progress-visualization'
import { QuestionEditCard } from '@/components/question-edit-card'
import { SubmissionSuccessDialog } from '@/components/submission-success-dialog'
import { StickyTagBar } from '@/components/sticky-tag-bar'
import { QuestionTagSelector } from '@/components/questions/tag-selector'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import type { WorkflowQuestion, WorkflowTag } from '@/components/question-workflow-types'

const INITIAL_QUESTIONS: WorkflowQuestion[] = [
  {
    id: 'q-1',
    type: 'choice',
    content:
      '已知集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，若 C 满足 A ⊂ C ⊂ B，则集合 C 的个数为多少？',
    options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
    answer: 'D',
    tags: []
  },
  {
    id: 'q-2',
    type: 'choice',
    content:
      '函数 f(x) = sin(ωx + φ)(ω > 0, |φ| < π/2) 的最小正周期为 π，且图像关于直线 x = π/3 对称，以下判断正确的是？',
    options: [
      'A. 图像关于点 (π/4, 0) 对称',
      'B. 图像关于点 (5π/12, 0) 对称',
      'C. 在区间 (0, π/6) 上单调递增',
      'D. 在区间 (π/6, π/3) 上单调递减'
    ],
    answer: 'B',
    tags: []
  },
  {
    id: 'q-3',
    type: 'fill',
    content: '已知向量 a = (1, 2)，b = (x, 1)，若 a + 2b 与 2a - b 平行，则 x = ______。',
    answer: '1/2',
    tags: []
  }
]

export function QuestionEditor() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentTask, completeTask } = useAppStore()
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoTagging, setIsAutoTagging] = useState(false)
  const [hasAutoTagged, setHasAutoTagged] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [activeQuestionId, setActiveQuestionId] = useState(questions[0]?.id)
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const currentQuestion = questions[currentIndex]
  const completedCount = questions.filter(
    (question) =>
      question.tags.some((tag) => tag.category === 'knowledge') &&
      question.tags.some((tag) => tag.category === 'difficulty')
  ).length

  useEffect(() => {
    if (!activeQuestionId) return
    const index = questions.findIndex((question) => question.id === activeQuestionId)
    if (index !== -1 && index !== currentIndex) {
      setCurrentIndex(index)
    }
  }, [activeQuestionId, questions, currentIndex])

  const scrollToQuestion = (index: number) => {
    const target = questions[index]
    if (!target) return
    setCurrentIndex(index)
    setActiveQuestionId(target.id)
    const element = questionRefs.current[target.id]
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 140
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const handleAddTag = (tag: WorkflowTag) => {
    if (!currentQuestion) return
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === currentIndex
          ? {
              ...question,
              tags: [...question.tags.filter((item) => item.category !== tag.category), tag]
            }
          : question
      )
    )
  }

  const handleRemoveTag = (tag: WorkflowTag) => {
    if (!currentQuestion) return
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === currentIndex
          ? {
              ...question,
              tags: question.tags.filter((item) => !(item.category === tag.category && item.value === tag.value))
            }
          : question
      )
    )
  }

  const handleAutoTagAll = async () => {
    setIsAutoTagging(true)
    await new Promise((resolve) => setTimeout(resolve, 1600))
    setQuestions((prev) =>
      prev.map((question) => ({
        ...question,
        tags: [
          { category: 'knowledge', value: '函数综合' },
          { category: 'difficulty', value: '中等' },
          { category: 'source', value: '联考真题' }
        ]
      }))
    )
    setHasAutoTagged(true)
    setIsAutoTagging(false)
    toast({
      title: 'AI 标注完成',
      description: '已为全部题目补全知识点与难度，可继续微调标签。',
      duration: 3000
    })
  }

  const handleUpdateTags = (index: number, tags: WorkflowTag[]) => {
    setQuestions((prev) => prev.map((question, idx) => (idx === index ? { ...question, tags } : question)))
  }

  const validateBeforeSubmit = () => {
    const invalid = questions.filter(
      (question) =>
        !question.tags.some((tag) => tag.category === 'knowledge') ||
        !question.tags.some((tag) => tag.category === 'difficulty')
    )
    if (invalid.length > 0) {
      toast({
        variant: 'destructive',
        title: '尚有题目缺少标签',
        description: `还有 ${invalid.length} 道题目未标注知识点或难度。`
      })
      return false
    }
    return true
  }

  const handleSubmitAll = () => {
    if (!validateBeforeSubmit()) return
    setSubmittedCount(questions.length)
    setShowSuccessDialog(true)
    if (currentTask?.taskId) {
      completeTask(currentTask.taskId)
    }
  }

  const handleSubmitCurrent = () => {
    if (currentIndex < questions.length - 1) {
      scrollToQuestion(currentIndex + 1)
    } else if (validateBeforeSubmit()) {
      setSubmittedCount(questions.length)
      setShowSuccessDialog(true)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) scrollToQuestion(currentIndex - 1)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) scrollToQuestion(currentIndex + 1)
  }

  const handleCreateQuestion = () => {
    router.push('/questions/create')
  }

  return (
    <div className="space-y-6 pb-24">
      <ProgressVisualization
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        completedCount={completedCount}
        questions={questions}
        onSelectQuestion={scrollToQuestion}
      />

      {currentQuestion && (
        <StickyTagBar
          currentQuestionIndex={currentIndex}
          totalQuestions={questions.length}
          currentTags={currentQuestion.tags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onSelectQuestion={scrollToQuestion}
          onSubmitCurrent={handleSubmitCurrent}
        />
      )}

      {currentQuestion && (
        <QuestionTagSelector
          selectedTags={currentQuestion.tags}
          onChange={(tags) => handleUpdateTags(currentIndex, tags)}
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        {questions.map((question, index) => {
          const containerId = question.id
          const isCompleted =
            question.tags.some((tag) => tag.category === 'knowledge') &&
            question.tags.some((tag) => tag.category === 'difficulty')
          return (
            <div
              key={containerId}
              ref={(element) => {
                questionRefs.current[containerId] = element
              }}
              className={cn(
                'rounded-xl border border-transparent transition-all duration-300',
                index === currentIndex && 'border-sky-600/40'
              )}
            >
              <QuestionEditCard
                question={question}
                index={index + 1}
                isActive={index === currentIndex}
                isCompleted={isCompleted}
                onUpdateTags={(tags) => handleUpdateTags(index, tags)}
              />
            </div>
          )
        })}
      </div>

      <Card className="sticky bottom-4 border-slate-800 bg-slate-950/80 p-4 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="border-slate-800 text-slate-200"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              上一题
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex >= questions.length - 1}
              className="border-slate-800 text-slate-200"
            >
              下一题
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={handleCreateQuestion}>
              继续录题
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-sky-600 text-sky-300"
              disabled={isAutoTagging}
              onClick={handleAutoTagAll}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {isAutoTagging ? 'AI 标注中...' : 'AI 自动标注'}
            </Button>
            <Button
              onClick={handleSubmitAll}
              disabled={!hasAutoTagged && completedCount !== questions.length}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Save className="mr-1 h-4 w-4" />
              提交全部
            </Button>
          </div>
        </div>
      </Card>

      {showSuccessDialog && (
        <SubmissionSuccessDialog count={submittedCount} onClose={() => setShowSuccessDialog(false)} />
      )}
    </div>
  )
}
