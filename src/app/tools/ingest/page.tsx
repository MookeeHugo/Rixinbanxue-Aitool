"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { FileUploadSection } from './_components/file-upload-section'
import { TaskListSection } from './_components/task-list-section'

/**
 * AI棰樺簱鎵归噺瀵煎叆椤甸潰
 * 璺緞: /tools/ingest
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

        // 鍙厑璁告暀甯堣闂?
        if (!data || data.role !== 'teacher') {
          router.push('/')
          return
        }
        setProfile(data)
      } catch (err) {
        logger.error('鍔犺浇鐢ㄦ埛淇℃伅澶辫触:', { error: err })
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  const handleUploadSuccess = () => {
    // 鍒锋柊浠诲姟鍒楄〃
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
        <div className="text-muted-foreground">鍔犺浇涓?..</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* 椤甸潰鏍囬 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI棰樺簱鎵归噺瀵煎叆</h1>
        <p className="text-muted-foreground">
          涓婁紶璇曞嵎鍥剧墖鎴朠DF锛孉I鑷姩璇嗗埆棰樼洰骞跺叆搴?
        </p>
      </div>

      {/* 涓婁紶鍖哄煙 */}
      <FileUploadSection onSuccess={handleUploadSuccess} />

      {/* 浠诲姟鍒楄〃 */}
      <TaskListSection refreshTrigger={refreshTrigger} />
    </div>
  )
}
