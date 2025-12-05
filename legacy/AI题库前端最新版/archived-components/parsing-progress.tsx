'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FileText, Image, CheckCircle2, Loader2 } from 'lucide-react'

interface ParsingProgressProps {
  progress: number
  onComplete: () => void
}

export function ParsingProgress({ progress, onComplete }: ParsingProgressProps) {
  const [currentProgress, setCurrentProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { label: '读取文件内容', icon: FileText },
    { label: '识别题目结构', icon: FileText },
    { label: '提取图片和表格', icon: Image },
    { label: '切分独立题目', icon: FileText },
    { label: '完成解析', icon: CheckCircle2 }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => onComplete(), 500)
          return 100
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(interval)
  }, [onComplete])

  useEffect(() => {
    const step = Math.floor((currentProgress / 100) * steps.length)
    setCurrentStep(Math.min(step, steps.length - 1))
  }, [currentProgress])

  return (
    <Card className="p-8 max-w-2xl mx-auto shadow-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">正在解析文件</h2>
        <p className="text-gray-600 mt-2">AI正在智能识别和处理您的题目</p>
      </div>

      <div className="mb-8">
        <Progress value={currentProgress} className="h-3" />
        <p className="text-center text-sm text-gray-600 mt-2">{currentProgress}%</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          
          return (
            <div
              key={index}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                isCurrent ? 'bg-blue-50 border-2 border-blue-200' : 
                isCompleted ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                isCompleted ? 'bg-green-500' :
                isCurrent ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Icon className="h-5 w-5 text-white" />
                )}
              </div>
              <span className={`font-medium ${
                isCurrent ? 'text-blue-900' :
                isCompleted ? 'text-green-900' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
