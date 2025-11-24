/**
 * 导出任务管理 Hook
 * 处理导出任务的创建、轮询和状态监听
 */

import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { logger } from '@/lib/logger'
export interface ExportTask {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  download_url?: string | null
  error_message?: string | null
  created_at?: string
  completed_at?: string | null
}

interface UseExportTaskOptions {
  pollInterval?: number // 轮询间隔（毫秒）
  onCompleted?: (task: ExportTask) => void
  onFailed?: (task: ExportTask) => void
}

/**
 * 获取导出任务状态
 */
async function fetchExportTaskStatus(taskId: string): Promise<ExportTask | null> {
  try {
    const response = await fetch(`/api/export-tasks/status/${taskId}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    return data.task || null
  } catch (error) {
    logger.error('Failed to fetch export task status', { taskId, error })
    throw error
  }
}

export function useExportTask(options: UseExportTaskOptions = {}) {
  const { pollInterval = 4000, onCompleted, onFailed } = options

  const [task, setTask] = useState<ExportTask | null>(null)
  const [loading, setLoading] = useState(false)

  // 轮询任务状态
  useEffect(() => {
    if (!task || ['COMPLETED', 'FAILED'].includes(task.status)) {
      return
    }

    const timer = setInterval(async () => {
      try {
        const updated = await fetchExportTaskStatus(task.id)
        if (updated) {
          setTask(updated)
        } else {
          setTask(null)
        }
      } catch (error) {
        logger.error('Failed to poll export task status', { taskId: task.id, error })
        message.error('查询导出任务状态失败')
        setTask(null)
      }
    }, pollInterval)

    return () => clearInterval(timer)
  }, [task?.id, task?.status, pollInterval])

  // 监听任务状态变化
  useEffect(() => {
    if (!task) return

    if (task.status === 'COMPLETED') {
      message.success('导出完成，可在题篮中下载文件')
      onCompleted?.(task)
    } else if (task.status === 'FAILED') {
      message.error(task.error_message || '导出失败，请稍后重试')
      onFailed?.(task)
    }
  }, [task?.status, onCompleted, onFailed])

  // 创建导出任务
  const createTask = useCallback(async (questionIds: string[], templateId: string = 'default') => {
    setLoading(true)
    try {
      const response = await fetch('/api/export-tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          question_ids: questionIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || '创建导出任务失败')
      }

      const data = await response.json()
      setTask(data.task)
      return data.task
    } catch (error) {
      logger.error('Failed to create export task', { questionIds, templateId, error })
      message.error(error instanceof Error ? error.message : '创建导出任务失败')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // 重置任务
  const resetTask = useCallback(() => {
    setTask(null)
  }, [])

  return {
    task,
    loading,
    createTask,
    resetTask,
  }
}
