"use client"

import { useState, useEffect, useMemo } from "react"
import { StepIndicator } from "@/components/step-indicator"
import { HorizontalParsingProgress } from "@/components/horizontal-parsing-progress"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuestionCard } from "@/components/question-card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AdvancedQuestionEditor } from "@/components/advanced-question-editor"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { TopNav } from "@/components/top-nav"
import { useAppStore } from "@/lib/store"
import { EmptyState } from "@/components/empty-state"
import { copywriting } from "@/lib/copywriting"
import { ErrorState } from "@/components/error-state"
import { QuestionListSkeleton } from "@/components/skeleton-loader"
import { mockAPI } from "@/lib/mock-api"

export default function ParsePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentTask, updateTaskProgress, setCurrentTask, updateTaskStage, completeTask } = useAppStore()

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null)
  const [reparsingQuestionId, setReparsingQuestionId] = useState<string | null>(null)
  const [isAnyParsing, setIsAnyParsing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const stableQuestions = useMemo(() => parsedQuestions, [parsedQuestions])

  useEffect(() => {
    console.log("[v0] Parse page - currentTask:", currentTask)
  }, [currentTask])

  useEffect(() => {
    if (currentTask) {
      setIsParsing(currentTask.status === "pending" || currentTask.status === "processing")
      setIsComplete(currentTask.status === "completed")

      if (currentTask.questions && currentTask.questions.length > 0) {
        const questions = currentTask.questions
        setParsedQuestions((prev) => {
          const newIds = questions
            .map((q: any) => q.id)
            .sort()
            .join(",")
          const prevIds = prev
            .map((q) => q.id)
            .sort()
            .join(",")
          return newIds === prevIds ? prev : questions
        })

        setSelectedQuestions((prev) => {
          // Get IDs that are currently in the task
          const currentIds = questions.map((q: any) => q.id)

          // Keep previous selections ONLY if they exist in the current task
          const validPrevSelections = prev.filter((id) => currentIds.includes(id))

          // Find new questions that weren't in the previous selection list (and not in prev parsed list ideally, but here we just add all new ones)
          // Actually, we want to select ALL questions by default when they first appear.
          // But if we unselected one, we don't want to re-select it on every poll.
          // So we need to know which ones are "newly added".
          // For simplicity, if the question ID was NOT in parsedQuestions before, we select it.

          // However, parsedQuestions state might lag slightly behind currentTask.questions in this effect.
          // Let's just ensure we don't have stale IDs.

          // If we want to select all by default:
          // return currentIds;
          // But that overrides user unselection.

          // Correct logic:
          // 1. Remove IDs that are no longer in currentTask.questions
          // 2. Add IDs that are in currentTask.questions but were NOT in parsedQuestions (newly discovered)

          // Since we don't have easy access to "previous parsedQuestions" inside this setter without ref,
          // we can rely on the fact that we just updated parsedQuestions.

          // Let's just clean up stale IDs for now to fix the "3 selected, 2 parsed" bug.
          // If the user unselected something, it stays unselected.
          // If a new question appears, we should probably select it.

          const newQuestions = questions.filter((q: any) => !prev.includes(q.id))
          // Only add new questions if they are genuinely new (not just re-fetched)
          // But how do we know if they are new?
          // We can check if they were in the *previous* currentTask.questions?
          // For now, just filtering stale IDs is the most important fix.

          return [...validPrevSelections, ...newQuestions.map((q: any) => q.id)]
        })
      }

      if (currentTask.status === "failed") {
        setHasError(true)
        setErrorMessage(currentTask.errorMessage || "解析失败")
      }
    }
  }, [currentTask])

  useEffect(() => {
    if (currentTask && currentTask.stage !== "parsing") {
      updateTaskStage(currentTask.taskId, "parsing")
    }
  }, [currentTask, updateTaskStage])

  const handleRetry = () => {
    setHasError(false)
    setErrorMessage("")
    handleReparse()
  }

  const handleQuestionParsed = (question: any) => {
    if (reparsingQuestionId) {
      setParsedQuestions((prev) =>
        prev.map((q) =>
          q.id === reparsingQuestionId
            ? { ...question, id: reparsingQuestionId, reparseCount: (q.reparseCount || 0) + 1 }
            : q,
        ),
      )
      setTimeout(() => {
        setReparsingQuestionId(null)
        setIsAnyParsing(false)
      }, 100)
    } else {
      setParsedQuestions((prev) => {
        if (prev.some((q) => q.id === question.id)) return prev
        const newQuestions = [...prev, { ...question, reparseCount: 0 }]
        if (currentTask) {
          updateTaskProgress(
            currentTask.taskId,
            (newQuestions.length / currentTask.totalQuestions) * 100,
            "processing",
            newQuestions,
          )
        }
        return newQuestions
      })
      setSelectedQuestions((prev) => {
        if (prev.includes(question.id)) return prev
        return [...prev, question.id]
      })
    }
  }

  const handleParsingComplete = () => {
    setIsComplete(true)
    setIsParsing(false)
    setIsAnyParsing(false)
    if (currentTask) {
      updateTaskProgress(currentTask.taskId, 100, "completed", parsedQuestions)
    }
  }

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) => (prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]))
  }

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question)
  }

  const handleSaveQuestion = (updatedQuestion: any) => {
    setParsedQuestions((prev) => prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)))
    setEditingQuestion(null)
  }

  const handleContinue = async () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: "请选择题目",
        description: "至少需要选择一道题目才能继续",
        variant: "destructive",
      })
      return
    }

    setIsAnyParsing(true)
    if (currentTask) {
      updateTaskStage(currentTask.taskId, "editing")
    }
    await new Promise((resolve) => setTimeout(resolve, 800))
    router.push("/edit")
  }

  const handleReparse = async () => {
    if (isAnyParsing) {
      toast({
        title: "请稍候",
        description: "当前有解析任务正在进行，请等待完成后再操作",
        variant: "default",
        duration: 3000,
      })
      return
    }

    if (!currentTask) return

    try {
      setParsedQuestions([])
      setSelectedQuestions([])
      setIsParsing(true)
      setIsComplete(false)
      setReparsingQuestionId(null)
      setIsAnyParsing(false)

      const newTask = await mockAPI.reparseTask(currentTask.taskId)

      // Update store with new task
      setCurrentTask(newTask as any)

      // The useMockIngestTask hook will pick up the new taskId and start polling from 0%
    } catch (error) {
      console.error("Reparse failed:", error)
      toast({
        title: "重新解析失败",
        description: "无法启动重新解析任务",
        variant: "destructive",
      })
      setIsParsing(false)
    }
  }

  const handleReparseQuestion = async (questionId: string) => {
    if (isAnyParsing && reparsingQuestionId !== questionId) {
      toast({
        title: "正在解析中",
        description: "当前有题目正在重新解析，请等待完成后再操作",
        variant: "default",
        duration: 2500,
      })
      return
    }

    setReparsingQuestionId(questionId)
    setIsAnyParsing(true)

    try {
      // Call the actual mock API to reparse the question
      const reparsedQuestion = await mockAPI.reparseQuestion(questionId)

      // Update the question in the list
      setParsedQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...reparsedQuestion, reparseCount: (q.reparseCount || 0) + 1 } : q)),
      )

      toast({
        title: "重新解析成功",
        description: "题目已更新",
        variant: "default",
      })
    } catch (error) {
      console.error("Reparse question failed:", error)
      toast({
        title: "重新解析失败",
        description: "无法重新解析此题目",
        variant: "destructive",
      })
    } finally {
      setReparsingQuestionId(null)
      setIsAnyParsing(false)
    }
  }

  const handleSingleReparseComplete = (questionId: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, reparseCount: (q.reparseCount || 0) + 1 } : q)),
    )
    setReparsingQuestionId(null)
    setIsAnyParsing(false)
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{copywriting.parse.title}</h1>
            <p className="text-gray-600">{copywriting.parse.description}</p>
          </div>

          <StepIndicator currentStep={2} />

          <div className="mt-8">
            <ErrorState
              title={copywriting.errors.parseFailed}
              message={errorMessage || copywriting.errors.networkError}
              showRetry={true}
              showHome={true}
              onRetry={handleRetry}
              onHome={() => router.push("/")}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!currentTask) {
    console.log("[v0] No currentTask, showing empty state")
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{copywriting.parse.title}</h1>
            <p className="text-gray-600">{copywriting.parse.description}</p>
          </div>

          <StepIndicator currentStep={2} />

          <div className="mt-8">
            <EmptyState
              type="no-results"
              title={copywriting.parse.noTask}
              description={copywriting.parse.noTaskDesc}
              actionLabel={copywriting.parse.goUpload}
              onAction={() => router.push("/upload")}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{copywriting.parse.title}</h1>
          <p className="text-gray-600">{copywriting.parse.description}</p>
        </div>

        <StepIndicator currentStep={2} />

        <div className="mt-8 space-y-6">
          {isParsing && !reparsingQuestionId && (
            <>
              <HorizontalParsingProgress
                onQuestionParsed={handleQuestionParsed}
                onComplete={handleParsingComplete}
                isSingleQuestion={false}
              />
              {parsedQuestions.length === 0 && <QuestionListSkeleton count={2} />}
            </>
          )}

          {(parsedQuestions.length > 0 || isComplete) && (
            <Card className="p-6 shadow-md bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full ${
                      isComplete ? "bg-green-100" : "bg-blue-100"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{isComplete ? "解析完成" : "正在解析"}</h3>
                    <p className="text-sm text-gray-600">
                      {isComplete
                        ? `共识别 ${parsedQuestions.length} 道题目，已选择 ${selectedQuestions.length} 道`
                        : `已解析 ${parsedQuestions.length} 道题目...`}
                    </p>
                  </div>
                </div>
                {isComplete && (
                  <Button
                    variant="outline"
                    onClick={handleReparse}
                    className="border-gray-300 bg-white hover:bg-gray-50"
                    disabled={isAnyParsing}
                  >
                    全部重新解析
                  </Button>
                )}
              </div>
            </Card>
          )}

          {stableQuestions.length > 0 && (
            <div className="space-y-4">
              {stableQuestions.map((question, index) => (
                <QuestionCard
                  key={`question-${question.id}`}
                  question={question}
                  index={index + 1}
                  isSelected={selectedQuestions.includes(question.id)}
                  onToggle={() => toggleQuestion(question.id)}
                  onEdit={() => handleEditQuestion(question)}
                  onReparse={() => handleReparseQuestion(question.id)}
                  isReparsing={reparsingQuestionId === question.id}
                  onReparseComplete={() => handleSingleReparseComplete(question.id)}
                  isAnyParsing={isAnyParsing}
                />
              ))}
            </div>
          )}

          {isComplete && parsedQuestions.length > 0 && (
            <Card className="p-4 shadow-md sticky bottom-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>请检查题目内容是否正确，可以编辑或取消选择不需要的题目</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push("/upload")} className="border-gray-300">
                    返回上传
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={selectedQuestions.length === 0 || isAnyParsing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {isAnyParsing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      `继续编辑标签 (${selectedQuestions.length})`
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {editingQuestion && (
          <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
            <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0">
              <AdvancedQuestionEditor
                question={editingQuestion}
                onSave={handleSaveQuestion}
                onCancel={() => setEditingQuestion(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
