"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { FileUploadSection } from './_components/file-upload-section'
import { TaskListSection } from './_components/task-list-section'

/**
 * AI题库批量导入页面
 * 路径: /tools/ingest
 */
export default function QuestionIngestPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const { profile: data } = await response.json()

        // 只允许教师访问
        if (!data || data.role !== 'teacher') {
          router.push('/')
          return
        }
        setProfile(data)
      } catch (err) {
        logger.error('加载用户信息失败:', { error: err })
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  const handleUploadSuccess = () => {
    // 刷新任务列表
    setRefreshTrigger(prev => prev + 1)
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">正在初始化页面...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI题库批量导入</h1>
        <p className="text-muted-foreground">
          上传试卷图片或PDF，AI自动识别题目并入库
        </p>
      </div>

      {/* 上传区域 */}
      <FileUploadSection onSuccess={handleUploadSuccess} />

      {/* 任务列表 */}
      <TaskListSection refreshTrigger={refreshTrigger} />
    </div>
  )
}
