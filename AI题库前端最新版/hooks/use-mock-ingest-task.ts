"use client"

import { useEffect, useState } from "react"
import { mockFetchTask, mockFetchParsedQuestions } from "@/lib/mock-api"
import { useAppStore } from "@/lib/store"

export function useMockIngestTask(taskId: string | null) {
  const [isPolling, setIsPolling] = useState(false)
  const { currentTask, setCurrentTask, updateTaskProgress } = useAppStore()

  useEffect(() => {
    if (!taskId) return

    setIsPolling(true)
    let intervalId: NodeJS.Timeout

    const poll = async () => {
      try {
        const task = await mockFetchTask(taskId)

        if (task.status === "completed") {
          const questions = await mockFetchParsedQuestions(taskId)
          console.log("[v0] Fetched questions on completion:", questions)
          updateTaskProgress(taskId, task.progress, task.status, questions)
          setIsPolling(false)
          clearInterval(intervalId)
        } else if (task.status === "failed") {
          updateTaskProgress(taskId, task.progress, task.status, [])
          setIsPolling(false)
          clearInterval(intervalId)
        } else {
          updateTaskProgress(taskId, task.progress, task.status, currentTask?.questions)
        }
      } catch (error) {
        console.error("[v0] Poll task error:", error)
        setIsPolling(false)
        clearInterval(intervalId)
      }
    }

    // 立即执行一次
    poll()

    // 每2秒轮询一次
    intervalId = setInterval(poll, 2000)

    return () => {
      clearInterval(intervalId)
      setIsPolling(false)
    }
  }, [taskId, updateTaskProgress, currentTask?.questions])

  return {
    task: currentTask,
    isPolling,
  }
}
