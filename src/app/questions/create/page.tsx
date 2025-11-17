"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import type { Profile } from '@/lib/supabase'
import { QuestionForm } from '@/app/questions/_components/question-form'

export default function CreateQuestionPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentProfile()
        if (!data || data.role !== 'teacher') {
          router.push('/')
          return
        }
        setProfile(data)
      } catch (error) {
        console.error('Failed to load profile:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

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
      onSuccess={(created) => {
        const targetId = created?.id
        if (targetId) {
          router.push(`/questions/${targetId}`)
        } else {
          router.push('/questions')
        }
        router.refresh()
      }}
      onCancel={() => router.push('/questions')}
    />
  )
}
