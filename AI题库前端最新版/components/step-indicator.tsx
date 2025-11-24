'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
}

const steps = [
  { id: 1, name: '上传文件', description: '上传题目文件' },
  { id: 2, name: '解析题目', description: '查看解析结果' },
  { id: 3, name: '编辑标签', description: '添加题目标签' },
  { id: 4, name: '收录题库', description: '保存到题库' },
]

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full py-8">
      <ol className="flex items-center justify-between max-w-5xl mx-auto">
        {steps.map((step) => (
          <li
            key={step.id}
            className="relative flex flex-1 items-center justify-center"
          >
            <div className="group relative flex flex-col items-center z-10">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ease-out transform',
                    step.id < currentStep
                      ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white scale-100 shadow-lg shadow-blue-500/50'
                      : step.id === currentStep
                        ? 'border-2 border-blue-600 bg-white text-blue-600 scale-110 shadow-lg shadow-blue-300/50 animate-pulse'
                        : 'border-2 border-gray-300 bg-white text-gray-400 scale-100'
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="h-5 w-5 animate-in zoom-in duration-300" />
                  ) : (
                    <span className={cn(
                      'font-semibold text-base',
                      step.id === currentStep && 'animate-in zoom-in duration-300'
                    )}>
                      {step.id}
                    </span>
                  )}
                </span>
                <span className="mt-3 flex flex-col items-center">
                  <span
                    className={cn(
                      'text-sm font-semibold transition-all duration-300',
                      step.id <= currentStep 
                        ? 'text-gray-900' 
                        : 'text-gray-400',
                      step.id === currentStep && 'scale-105'
                    )}
                  >
                    {step.name}
                  </span>
                  <span className={cn(
                    'text-xs mt-0.5 transition-colors duration-300',
                    step.id === currentStep 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                  )}>
                    {step.description}
                  </span>
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
