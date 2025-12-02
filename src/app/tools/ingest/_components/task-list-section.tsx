"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FileText, Clock, CheckCircle2, XCircle, Loader2, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { UploadTask } from '@/lib/ai-question-bank/types'
import { normalizeFileName } from '@/lib/ai-question-bank/utils'
import { useToast } from '@/hooks/use-toast'

interface TaskListSectionProps {
  refreshTrigger?: number
}

const MAX_TASKS = 10

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Shanghai',
  hour12: false
})

export function TaskListSection({ refreshTrigger = 0 }: TaskListSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [loading, setLoading] = useState(true)
  const [realtimeReady, setRealtimeReady] = useState(false)

  const sortAndLimit = useCallback((list: UploadTask[]) => {
    return [...list]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, MAX_TASKS)
  }, [])

  const loadLatestTasks = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('upload_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_TASKS)

      if (error) throw error
      setTasks(sortAndLimit((data ?? []) as UploadTask[]))
    } catch (error) {
      logger.error('加载上传任务失败', { error })
      toast({
        title: '加载失败',
        description: '无法获取上传任务，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [sortAndLimit, toast])

  useEffect(() => {
    loadLatestTasks()
  }, [loadLatestTasks, refreshTrigger])

  useEffect(() => {
    const channel = supabase
      .channel('upload_tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upload_tasks' },
        (payload) => {
          const nextTask = (payload.new || payload.old) as UploadTask | null
          if (!nextTask) return

          setTasks((prev) => {
            const existingIndex = prev.findIndex((task) => task.id === nextTask.id)
            let updated = [...prev]

            if (payload.eventType === 'DELETE') {
              if (existingIndex !== -1) {
                updated.splice(existingIndex, 1)
              } else {
                return prev
              }
            } else if (existingIndex !== -1) {
              updated[existingIndex] = nextTask
            } else {
              updated = [nextTask, ...updated]
            }

            return sortAndLimit(updated)
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeReady(true)
        }
        if (status === 'CHANNEL_ERROR') {
          setRealtimeReady(false)
          toast({
            title: '实时通道异常',
            description: '将回退为轮询模式，请留意任务进度',
            variant: 'destructive'
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sortAndLimit, toast])

  useEffect(() => {
    const processingIds = tasks
      .filter((task) => task.status === 'pending' || task.status === 'processing')
      .map((task) => task.id)

    if (processingIds.length === 0) return

    let cancelled = false
    let delay = 2000
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      if (cancelled) return
      try {
        const { data, error } = await supabase
          .from('upload_tasks')
          .select('*')
          .in('id', processingIds)

        if (error) throw error
        if (data) {
          setTasks((prev) => {
            const map = new Map(prev.map((task) => [task.id, task]))
            ;(data as UploadTask[]).forEach((task) => {
              map.set(task.id, task)
            })
            return sortAndLimit(Array.from(map.values()))
          })
        }
      } catch (error) {
        logger.error('轮询任务状态失败', { error })
      } finally {
        if (!cancelled && processingIds.length > 0) {
          delay = Math.min(delay * 1.5, 15000)
          timer = setTimeout(poll, delay)
        }
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [tasks, sortAndLimit])

  const handleViewResults = (taskId: string) => {
    router.push(`/tools/ingest/${taskId}/review`)
  }

  const getStatusBadge = (status: UploadTask['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            排队中
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="default">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            解析中
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            已完成
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            失败
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return DATE_FORMATTER.format(new Date(dateString))
    } catch {
      const date = new Date(dateString)
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
        date.getUTCDate()
      ).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(
        date.getUTCMinutes()
      ).padStart(2, '0')}`
    }
  }

  const hasProcessingTasks = useMemo(
    () => tasks.some((task) => task.status === 'pending' || task.status === 'processing'),
    [tasks]
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">加载中...</CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>上传记录</CardTitle>
          <CardDescription>暂未发现上传任务</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">上传文件后即可在此查看进度与结果</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>上传记录</CardTitle>
            <CardDescription>最近 {MAX_TASKS} 条任务，实时更新 {realtimeReady ? '（实时）' : '（轮询）'}</CardDescription>
          </div>
          {hasProcessingTasks && (
            <Badge variant="outline" className="bg-primary-50 text-primary-700">
              正在解析
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => {
            const displayFileName = normalizeFileName(task.file_name)
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{displayFileName}</p>
                      {getStatusBadge(task.status)}
                    </div>

                    {task.status === 'processing' && (
                      <div className="space-y-1">
                        <Progress value={task.progress || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">进度：{task.progress || 0}%</p>
                      </div>
                    )}

                    {task.status === 'completed' && task.total_questions !== null && (
                      <p className="text-sm text-muted-foreground">识别出 {task.total_questions} 道题目</p>
                    )}

                    {task.status === 'failed' && task.error_message && (
                      <p className="text-sm text-destructive">{task.error_message}</p>
                    )}

                    <p className="text-xs text-muted-foreground">{formatDate(task.created_at)}</p>
                  </div>
                </div>

                <div>
                  {task.status === 'completed' && (
                    <Button variant="outline" size="sm" onClick={() => handleViewResults(task.id)}>
                      <Eye className="mr-1 h-3 w-3" />
                      查看结果
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
