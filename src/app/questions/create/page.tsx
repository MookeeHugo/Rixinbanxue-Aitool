"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase'
import { QuestionForm } from '@/app/questions/_components/question-form'
import { logger } from '@/lib/logger'

export default function CreateQuestionPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 使用 API 路由获取 profile，避免客户端 Supabase SDK 初始化超时
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include', // 确保发送 cookies
        })

        if (!response.ok) {
          if (response.status === 401) {
            // 未登录，跳转到登录页
            router.push('/login')
            return
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const { profile: data } = await response.json()

        if (!data || data.role !== 'teacher') {
          router.push('/')
          return
        }
        setProfile(data)
      } catch (err) {
        logger.error('加载用户信息失败:', { error: err })
        // 出错时也跳转到登录页
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  const handleSuccess = useCallback((created: any) => {
    const targetId = created?.id
    if (targetId) {
      router.push(`/questions/${targetId}`)
    } else {
      router.push('/questions')
    }
    router.refresh()
  }, [router])

  const handleCancel = useCallback(() => router.push('/questions'), [router])

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
    <QuestionForm
      mode="create"
      profile={profile}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  )
}
