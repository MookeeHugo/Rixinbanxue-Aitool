"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Clock, CheckCircle2, XCircle, Loader2, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { UploadTask } from '@/lib/ai-question-bank/types'

interface TaskListSectionProps {
  refreshTrigger?: number
}

export function TaskListSection({ refreshTrigger = 0 }: TaskListSectionProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [loading, setLoading] = useState(true)


  // 加载任务列表
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('upload_tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setTasks(data as UploadTask[])
      } catch (error) {
        logger.error('加载任务列表失败', { error })
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [refreshTrigger, supabase])

  // 轮询处理中的任务
  useEffect(() => {
    const processingTasks = tasks.filter(
      t => t.status === 'pending' || t.status === 'processing'
    )

    if (processingTasks.length === 0) return

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('upload_tasks')
          .select('*')
          .in('id', processingTasks.map(t => t.id))

        if (error) throw error
        if (data) {
          setTasks(prevTasks => {
            const updatedTasks = [...prevTasks]
            data.forEach((updated: UploadTask) => {
              const index = updatedTasks.findIndex(t => t.id === updated.id)
              if (index !== -1) {
                updatedTasks[index] = updated
              }
            })
            return updatedTasks
          })
        }
      } catch (error) {
        logger.error('轮询任务状态失败', { error })
      }
    }, 2000) // 每2秒轮询一次

    return () => clearInterval(interval)
  }, [tasks, supabase])

  // 查看解析结果
  const handleViewResults = (taskId: string) => {
    router.push(`/tools/ingest/${taskId}/review`)
  }

  // 获取状态徽章
  const getStatusBadge = (status: UploadTask['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />等待中</Badge>
      case 'processing':
        return <Badge variant="default"><Loader2 className="mr-1 h-3 w-3 animate-spin" />解析中</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />已完成</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />失败</Badge>
    }
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>上传历史</CardTitle>
          <CardDescription>您还没有上传过文件</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          上传文件后，任务会显示在这里
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>上传历史</CardTitle>
        <CardDescription>最近10个上传任务</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-4 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{task.file_name}</p>
                    {getStatusBadge(task.status)}
                  </div>

                  {/* 进度条 */}
                  {task.status === 'processing' && (
                    <div className="space-y-1">
                      <Progress value={task.progress || 0} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        进度: {task.progress || 0}%
                      </p>
                    </div>
                  )}

                  {/* 完成信息 */}
                  {task.status === 'completed' && task.total_questions !== null && (
                    <p className="text-sm text-muted-foreground">
                      识别出 {task.total_questions} 道题目
                    </p>
                  )}

                  {/* 错误信息 */}
                  {task.status === 'failed' && task.error_message && (
                    <p className="text-sm text-destructive">
                      {task.error_message}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {formatDate(task.created_at)}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div>
                {task.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewResults(task.id)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    查看结果
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
