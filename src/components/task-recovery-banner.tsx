'use client'

import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, Clock, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

const STAGE_LABELS = {
  uploading: '上传文件',
  parsing: '解析题目',
  editing: '题面校对',
  tagging: '标签管理',
  completed: '已完成'
} as const

const STAGE_ROUTES = {
  uploading: '/upload',
  parsing: '/parse',
  editing: '/parse',
  tagging: '/edit',
  completed: '/questions'
} as const

export function TaskRecoveryBanner() {
  const router = useRouter()
  const currentTask = useAppStore((state) => state.currentTask)
  const dismissIncompleteTask = useAppStore((state) => state.dismissIncompleteTask)
  const clearIncompleteTask = useAppStore((state) => state.clearIncompleteTask)
  const [autoResume, setAutoResume] = useState(false)
  const [ready, setReady] = useState(false)

  const incompleteTask = useMemo(() => {
    if (!currentTask) return null
    if (!currentTask.isIncomplete || currentTask.stage === 'completed') return null
    return currentTask
  }, [currentTask])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('ai-task-auto-resume')
    setAutoResume(stored === 'true')
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (autoResume && incompleteTask) {
      const route = STAGE_ROUTES[incompleteTask.stage as keyof typeof STAGE_ROUTES] ?? '/questions'
      router.push(route)
    }
  }, [autoResume, incompleteTask, ready, router])

  if (!incompleteTask || !ready) {
    return null
  }

  const stageLabel = STAGE_LABELS[incompleteTask.stage as keyof typeof STAGE_LABELS] ?? '处理进度'
  const route = STAGE_ROUTES[incompleteTask.stage as keyof typeof STAGE_ROUTES] ?? '/questions'

  const timeSinceLastActive = () => {
    if (!incompleteTask.lastActiveAt) return '刚刚'
    const diffMinutes = Math.floor((Date.now() - incompleteTask.lastActiveAt) / 60000)
    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`
    const hours = Math.floor(diffMinutes / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  const handleContinue = () => {
    router.push(route)
  }

  const handleDismiss = () => {
    dismissIncompleteTask()
  }

  const handleAbandon = () => {
    if (window.confirm('确定要放弃该任务吗？已有进度将被清除。')) {
      clearIncompleteTask()
    }
  }

  const toggleAutoResume = () => {
    const next = !autoResume
    setAutoResume(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-task-auto-resume', String(next))
    }
  }

  return (
    <div className="fixed inset-x-0 top-16 z-40 px-4">
      <Card className="mx-auto max-w-3xl border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-2xl">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                检测到未完成的解析任务 · <span className="text-amber-600">{stageLabel}</span>
              </p>
              <p className="text-xs text-slate-500">
                {incompleteTask.fileName} · {timeSinceLastActive()}
                {typeof incompleteTask.progress === 'number' && ` · 进度 ${Math.round(incompleteTask.progress)}%`}
              </p>
              <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={autoResume}
                  onChange={toggleAutoResume}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                下次自动恢复任务（无需再弹窗提醒）
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="bg-amber-500 text-white hover:bg-amber-400" onClick={handleContinue}>
              继续处理
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-red-200 text-red-600" onClick={handleAbandon}>
              放弃任务
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface PostponedTaskButtonProps {
  onClick: (event: React.MouseEvent) => void
}

export function PostponedTaskButton({ onClick }: PostponedTaskButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full items-center justify-center rounded-md border-2 border-dashed border-amber-400 bg-amber-50/80 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
    >
      <Clock className="mr-2 h-4 w-4" />
      处理未完成任务
    </button>
  )
}
