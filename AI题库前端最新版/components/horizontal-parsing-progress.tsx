"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { FileText, ImageIcon, CheckCircle2, Loader2, Scissors, ScanText } from "lucide-react"
import { mockAdvancedQuestionData } from "@/lib/mock-data"

interface HorizontalParsingProgressProps {
  onQuestionParsed: (question: any) => void
  onComplete: () => void
  isSingleQuestion?: boolean
}

export function HorizontalParsingProgress({
  onQuestionParsed,
  onComplete,
  isSingleQuestion = false,
}: HorizontalParsingProgressProps) {
  const [currentProgress, setCurrentProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [parsedCount, setParsedCount] = useState(0)
  const [totalQuestions] = useState(isSingleQuestion ? 1 : mockAdvancedQuestionData.length)

  const steps = [
    { label: "读取文件", icon: FileText, color: "blue" },
    { label: "OCR识别", icon: ScanText, color: "purple" },
    { label: "提取图表", icon: ImageIcon, color: "green" },
    { label: "题目切分", icon: Scissors, color: "orange" },
    { label: "内容提取", icon: FileText, color: "cyan" },
  ]

  useEffect(() => {
    const progressSpeed = isSingleQuestion ? 30 : 50

    // Simulate parsing progress
    const progressInterval = setInterval(() => {
      setCurrentProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setTimeout(() => onComplete(), 500)
          return 100
        }
        return prev + 1
      })
    }, progressSpeed)

    // Simulate step progression
    const stepInterval = setInterval(
      () => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(stepInterval)
            return steps.length - 1
          }
          return prev + 1
        })
      },
      isSingleQuestion ? 600 : 1000,
    )

    const questionInterval = setInterval(
      () => {
        setParsedCount((prev) => {
          if (prev >= totalQuestions) {
            clearInterval(questionInterval)
            return totalQuestions
          }
          const nextCount = prev + 1
          setTimeout(() => {
            const questionIndex = isSingleQuestion ? 0 : prev
            if (questionIndex < mockAdvancedQuestionData.length) {
              onQuestionParsed(mockAdvancedQuestionData[questionIndex])
            }
          }, 0)
          return nextCount
        })
      },
      isSingleQuestion ? 2000 : 1500,
    )

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      clearInterval(questionInterval)
    }
  }, [onQuestionParsed, onComplete, totalQuestions, isSingleQuestion])

  const getStepColor = (color: string) => {
    const colors: any = {
      blue: "bg-blue-500",
      purple: "bg-purple-500",
      green: "bg-green-500",
      orange: "bg-orange-500",
      cyan: "bg-cyan-500",
    }
    return colors[color] || "bg-gray-500"
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg mb-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{isSingleQuestion ? "重新解析题目" : "解析进度"}</h3>
          <span className="text-sm font-medium text-blue-600">{currentProgress}%</span>
        </div>
        <Progress value={currentProgress} className="h-2.5" />
        <p className="text-sm text-gray-600 mt-2">
          {isSingleQuestion
            ? "正在重新识别题目内容..."
            : `正在解析第 ${Math.min(parsedCount + 1, totalQuestions)} 题，共 ${totalQuestions} 题`}
        </p>
      </div>

      {/* Horizontal steps */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <div key={index} className="flex-1">
              <div
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                  isCurrent ? "bg-blue-50 ring-2 ring-blue-200" : isCompleted ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    isCompleted
                      ? "bg-green-500 scale-110"
                      : isCurrent
                        ? `${getStepColor(step.color)} scale-110`
                        : "bg-gray-300"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5 text-white" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium text-center ${
                    isCurrent ? "text-blue-900" : isCompleted ? "text-green-900" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
