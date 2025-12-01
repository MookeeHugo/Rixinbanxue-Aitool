'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { initiateReparse, cancelReparse } from '@/app/actions/reparse-question'
import type { ReparseStatus } from '@/lib/ai-question-bank/types'
import { RefreshCw, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReparseButtonProps {
  questionId: string
  initialStatus?: ReparseStatus
  reparseCount?: number
  lastReparseAt?: string | null
  disabled?: boolean
  className?: string
}

type ReparseStep = 'idle' | 'downloading' | 'downloaded' | 'parsing' | 'parsed' | 'matching' | 'cropping' | 'uploading' | 'saving' | 'complete' | 'error'

interface ReparseProgress {
  step: ReparseStep
  progress: number
  message: string
}

const stepLabels: Record<ReparseStep, string> = {
  idle: '准备中',
  downloading: '下载图片',
  downloaded: '下载完成',
  parsing: 'AI 解析中',
  parsed: '解析完成',
  matching: '匹配题目',
  cropping: '裁剪配图',
  uploading: '上传图片',
  saving: '保存结果',
  complete: '解析完成',
  error: '解析失败'
}

export function ReparseButton({
  questionId,
  initialStatus = 'idle',
  reparseCount = 0,
  lastReparseAt,
  disabled = false,
  className
}: ReparseButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<ReparseStatus>(initialStatus)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [progress, setProgress] = useState<ReparseProgress>({
    step: 'idle',
    progress: 0,
    message: '准备重新解析...'
  })
  const eventSourceRef = useRef<EventSource | null>(null)

  // Format last reparse time
  const formatLastReparse = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    return `${days} 天前`
  }, [])

  // Cleanup SSE connection
  const cleanupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Handle component unmount
  useEffect(() => {
    return () => {
      cleanupSSE()
    }
  }, [cleanupSSE])

  // Start SSE connection for progress updates
  const startProgressStream = useCallback(() => {
    cleanupSSE()

    const eventSource = new EventSource(`/api/reparse/${questionId}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'status':
            setStatus(data.status)
            setProgress(prev => ({
              ...prev,
              message: data.message || prev.message
            }))
            break

          case 'progress':
            setProgress({
              step: data.step || 'idle',
              progress: data.progress || 0,
              message: data.message || ''
            })
            break

          case 'complete':
            setStatus('completed')
            setProgress({
              step: 'complete',
              progress: 100,
              message: data.message || '解析完成'
            })
            cleanupSSE()
            toast({
              title: '重新解析完成',
              description: `已成功解析题目，识别到 ${data.result?.imageCount || 0} 张配图`
            })
            // Delay closing dialog to show completion
            setTimeout(() => {
              setIsDialogOpen(false)
              router.refresh()
            }, 1500)
            break

          case 'error':
            setStatus('failed')
            setProgress({
              step: 'error',
              progress: 0,
              message: data.message || '解析失败'
            })
            cleanupSSE()
            toast({
              title: '重新解析失败',
              description: data.message || '请稍后重试',
              variant: 'destructive'
            })
            break
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e)
      }
    }

    eventSource.onerror = () => {
      cleanupSSE()
      if (status === 'processing') {
        setStatus('failed')
        setProgress({
          step: 'error',
          progress: 0,
          message: '连接中断，请刷新页面查看结果'
        })
      }
    }
  }, [questionId, cleanupSSE, router, toast, status])

  // Handle reparse button click
  const handleReparse = async () => {
    setIsStarting(true)
    setProgress({
      step: 'idle',
      progress: 0,
      message: '正在启动重新解析...'
    })

    try {
      const result = await initiateReparse(questionId)

      if (!result.success) {
        throw new Error(result.error || '启动失败')
      }

      setStatus('pending')
      setIsDialogOpen(true)

      // Start SSE connection
      startProgressStream()

    } catch (error) {
      toast({
        title: '启动失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsStarting(false)
    }
  }

  // Handle cancel
  const handleCancel = async () => {
    if (status !== 'pending') {
      setIsDialogOpen(false)
      cleanupSSE()
      return
    }

    try {
      const result = await cancelReparse(questionId)
      if (result.success) {
        setStatus('idle')
        toast({
          title: '已取消',
          description: '重新解析任务已取消'
        })
      }
    } catch (error) {
      console.error('Cancel failed:', error)
    } finally {
      setIsDialogOpen(false)
      cleanupSSE()
    }
  }

  const isProcessing = status === 'pending' || status === 'processing'
  const buttonDisabled = disabled || isStarting || isProcessing

  // Get status icon
  const getStatusIcon = () => {
    switch (progress.step) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    }
  }

  return (
    <>
      <div className={cn('inline-flex items-center gap-1', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReparse}
          disabled={buttonDisabled}
          className="gap-1"
        >
          {isStarting || isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          重新解析
        </Button>
        {reparseCount > 0 && (
          <Badge
            variant="default"
            className="text-xs px-1.5 py-0.5"
            title={lastReparseAt ? `上次解析: ${formatLastReparse(lastReparseAt)}` : undefined}
          >
            {reparseCount}
          </Badge>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && !isProcessing) {
          setIsDialogOpen(false)
          cleanupSSE()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon()}
              重新解析题目
            </DialogTitle>
            <DialogDescription>
              {progress.step === 'complete'
                ? '题目已成功重新解析'
                : progress.step === 'error'
                ? '解析过程中出现错误'
                : '正在使用 AI 重新解析该题目，请稍候...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {stepLabels[progress.step] || progress.step}
                </span>
                <span className="font-medium">{progress.progress}%</span>
              </div>
              <Progress
                value={progress.progress}
                className={cn(
                  'h-2 transition-all',
                  progress.step === 'error' && 'bg-red-100',
                  progress.step === 'complete' && 'bg-green-100'
                )}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                {progress.message}
              </p>
            </div>

            {progress.step === 'error' && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>如果问题持续，请尝试手动框选修复或联系技术支持。</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={status === 'processing'}
            >
              {progress.step === 'complete' || progress.step === 'error'
                ? '关闭'
                : '取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
