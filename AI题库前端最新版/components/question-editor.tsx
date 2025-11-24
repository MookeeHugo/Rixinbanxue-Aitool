"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ProgressVisualization } from "@/components/progress-visualization"
import { QuestionEditCard } from "@/components/question-edit-card"
import { SubmissionSuccessDialog } from "@/components/submission-success-dialog"
import { StickyTagBar } from "@/components/sticky-tag-bar"
import { ChevronLeft, ChevronRight, Sparkles, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"

// Mock data
const mockQuestions = [
  {
    id: "1",
    type: "choice" as const,
    content: "若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为",
    options: ["A. 1", "B. 2", "C. 3", "D. 4"],
    answer: "D",
    tags: [],
  },
  {
    id: "2",
    type: "choice" as const,
    content: "已知函数 f(x) = sin(ωx + φ) (ω > 0, |φ| < π/2) 的最小正周期为 π，且其图象关于直线 x = π/3 对称，则",
    options: [
      "A. y = f(x) 的图象关于点 (π/4, 0) 对称",
      "B. y = f(x) 的图象关于点 (5π/12, 0) 对称",
      "C. y = f(x) 在区间 (0, π/6) 上单调递增",
      "D. y = f(x) 在区间 (π/6, π/3) 上单调递减",
    ],
    answer: "B",
    tags: [],
  },
  {
    id: "3",
    type: "fill" as const,
    content: "已知向量 a = (1, 2)，b = (x, 1)，若 a + 2b 与 2a - b 平行，则 x = ______。",
    answer: "1/2",
    tags: [],
  },
]

export function QuestionEditor() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentTask, completeTask } = useAppStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [questions, setQuestions] = useState(mockQuestions)
  const [isAutoTagging, setIsAutoTagging] = useState(false)
  const [hasAutoTagged, setHasAutoTagged] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [activeQuestionId, setActiveQuestionId] = useState("1")
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const isInitialMount = useRef(true)

  const currentQuestion = questions[currentIndex]

  const completedCount = questions.filter((q) => {
    const hasKnowledge = q.tags.some((t) => t.category === "knowledge")
    const hasDifficulty = q.tags.some((t) => t.category === "difficulty")
    return hasKnowledge && hasDifficulty
  }).length

  const progress = (completedCount / questions.length) * 100

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-180px 0px -50% 0px", // 顶部留出标签栏空间，底部留出50%确保中心题目被识别
      threshold: [0, 0.1, 0.5, 0.9, 1], // 多个阈值提高精确度
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // 找出最可见的题目（intersectionRatio 最大的）
      const visibleEntries = entries.filter((entry) => entry.isIntersecting)

      if (visibleEntries.length > 0) {
        const mostVisible = visibleEntries.reduce((prev, current) =>
          current.intersectionRatio > prev.intersectionRatio ? current : prev,
        )

        const questionId = mostVisible.target.getAttribute("data-question-id")
        if (questionId) {
          setActiveQuestionId(questionId)
          const index = questions.findIndex((q) => q.id === questionId)
          if (index !== -1 && index !== currentIndex) {
            setCurrentIndex(index)
          }
        }
      }
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // 观察所有题目元素
    Object.values(questionRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [questions, currentIndex])

  useEffect(() => {
    if (isInitialMount.current) {
      // 延迟执行确保DOM已渲染
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "instant", // 使用instant避免动画
        })

        // 然后滚动到第一题的正确位置
        const firstQuestionId = questions[0]?.id
        if (firstQuestionId) {
          const element = questionRefs.current[firstQuestionId]
          if (element) {
            const offset = 160
            const elementPosition = element.getBoundingClientRect().top + window.scrollY
            window.scrollTo({
              top: elementPosition - offset,
              behavior: "smooth",
            })
          }
        }

        isInitialMount.current = false
      }, 100)
    }
  }, [questions])

  useEffect(() => {
    if (isInitialMount.current) {
      return
    }

    const handleScroll = () => {
      const viewportCenter = window.scrollY + window.innerHeight / 2

      let closestQuestionId = questions[0]?.id
      let minDistance = Number.POSITIVE_INFINITY

      questions.forEach((question) => {
        const element = questionRefs.current[question.id]
        if (element) {
          const rect = element.getBoundingClientRect()
          const elementCenter = window.scrollY + rect.top + rect.height / 2
          const distance = Math.abs(elementCenter - viewportCenter)

          if (distance < minDistance) {
            minDistance = distance
            closestQuestionId = question.id
          }
        }
      })

      if (closestQuestionId !== activeQuestionId) {
        setActiveQuestionId(closestQuestionId)
        const index = questions.findIndex((q) => q.id === closestQuestionId)
        if (index !== -1) {
          setCurrentIndex(index)
        }
      }
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [questions, activeQuestionId])

  const handleSelectQuestion = (index: number) => {
    setCurrentIndex(index)
    const questionId = questions[index].id
    const element = questionRefs.current[questionId]
    if (element) {
      const offset = 160
      const elementPosition = element.getBoundingClientRect().top + window.scrollY
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      })
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      handleSelectQuestion(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      handleSelectQuestion(currentIndex - 1)
    }
  }

  const handleAutoTagAll = async () => {
    setIsAutoTagging(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const aiTags = [
      { category: "knowledge", value: "集合" },
      { category: "difficulty", value: "中等" },
      { category: "textbook", value: "人教版" },
    ]

    setQuestions((prev) => prev.map((q) => ({ ...q, tags: aiTags })))
    setIsAutoTagging(false)
    setHasAutoTagged(true)
  }

  const handleUpdateTags = (tags: any[]) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === currentIndex ? { ...q, tags } : q)))
  }

  const handleSubmitSingle = async () => {
    if (currentIndex < questions.length - 1) {
      handleSelectQuestion(currentIndex + 1)
    } else {
      setSubmittedCount(1)
      setShowSuccessDialog(true)
    }
  }

  const validateQuestions = () => {
    const missingTags = questions.filter((q) => {
      const hasKnowledge = q.tags.some((t) => t.category === "knowledge")
      const hasDifficulty = q.tags.some((t) => t.category === "difficulty")
      return !hasKnowledge || !hasDifficulty
    })

    if (missingTags.length > 0) {
      toast({
        title: "还有题目未完成标注",
        description: `还有 ${missingTags.length} 道题目缺少必填标签（知识点、难易程度）`,
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleSubmitAll = async () => {
    if (!validateQuestions()) {
      return
    }
    setSubmittedCount(questions.length)
    setShowSuccessDialog(true)

    if (currentTask?.taskId) {
      completeTask(currentTask.taskId)
      console.log("[v0] Task completed:", currentTask.taskId)
    }
  }

  const handleAddTag = (tag: { category: string; value: string }) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex ? { ...q, tags: [...q.tags.filter((t) => t.category !== tag.category), tag] } : q,
      ),
    )
  }

  const handleRemoveTag = (tag: { category: string; value: string }) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex
          ? { ...q, tags: q.tags.filter((t) => !(t.category === tag.category && t.value === tag.value)) }
          : q,
      ),
    )
  }

  return (
    <div className="space-y-6 pb-32">
      <ProgressVisualization
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        completedCount={completedCount}
        questions={questions}
        onSelectQuestion={handleSelectQuestion}
      />

      <StickyTagBar
        currentQuestionIndex={currentIndex}
        totalQuestions={questions.length}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        currentTags={currentQuestion.tags}
        onSelectQuestion={handleSelectQuestion}
        onSubmitCurrent={handleSubmitSingle}
      />

      <div className="space-y-6">
        {questions.map((question, index) => {
          const isCompleted =
            question.tags.some((t) => t.category === "knowledge") &&
            question.tags.some((t) => t.category === "difficulty")
          const isMissingTags = !isCompleted

          return (
            <div
              key={question.id}
              ref={(el) => {
                questionRefs.current[question.id] = el
              }}
              data-question-id={question.id}
              className={cn(
                "transition-all duration-300",
                currentIndex === index && "ring-4 ring-blue-500/30 rounded-xl",
                isMissingTags && "ring-2 ring-amber-400/50 rounded-xl",
              )}
            >
              <QuestionEditCard
                question={question}
                index={index + 1}
                onUpdateTags={(tags) => {
                  setQuestions((prev) => prev.map((q, idx) => (idx === index ? { ...q, tags } : q)))
                }}
                isActive={currentIndex === index}
                isCompleted={isCompleted}
              />
            </div>
          )
        })}
      </div>

      <Card className="p-3 shadow-2xl sticky bottom-6 bg-white/95 backdrop-blur-sm border-gray-200">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="border-gray-300 hover:bg-gray-50 transition-all h-9 bg-transparent"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            上一题
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleAutoTagAll}
              disabled={isAutoTagging}
              className="border-blue-600 text-blue-600 hover:bg-blue-50 transition-all h-9 bg-transparent"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {isAutoTagging ? "全部标注中..." : "AI自动标注全部"}
            </Button>

            <Button
              onClick={handleSubmitAll}
              disabled={!hasAutoTagged}
              className={cn(
                "px-6 shadow-lg transition-all h-9",
                hasAutoTagged
                  ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-green-600/30"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none",
              )}
            >
              <Save className="mr-1.5 h-4 w-4" />
              提交全部题目
            </Button>

            {currentIndex < questions.length - 1 && (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-500 text-white px-6 shadow-lg shadow-blue-600/30 transition-all h-9"
              >
                下一题
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {showSuccessDialog && (
        <SubmissionSuccessDialog count={submittedCount} onClose={() => setShowSuccessDialog(false)} />
      )}
    </div>
  )
}
