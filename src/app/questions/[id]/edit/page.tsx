"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { QuestionForm, type QuestionFormData } from '@/app/questions/_components/question-form'
import { Card } from '@/components/ui/card'
import { logger } from '@/lib/logger'

export default function EditQuestionPage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [question, setQuestion] = useState<QuestionFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const questionId = Array.isArray(params?.id) ? params?.id?.[0] : params?.id

  useEffect(() => {
    const loadProfileAndQuestion = async () => {
      try {
        const profileData = await getCurrentProfile()
        if (!profileData || profileData.role !== 'teacher') {
          router.push('/')
          return
        }
        setProfile(profileData)

        if (!questionId) {
          setError('题目不存在')
          return
        }

        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('id', questionId)
          .single()

        if (error || !data) {
          setError('未找到对应的题目')
          return
        }

        setQuestion(data as QuestionFormData)
      } catch (err) {
        logger.error('Failed to load question:', { error: err })
        setError('加载题目失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    loadProfileAndQuestion()
  }, [questionId, router])

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

  if (error || !questionId) {
    return (
      <Card className="p-8 text-center">
        <div className="text-xl font-semibold mb-2">无法编辑题目</div>
        <p className="text-muted-foreground mb-4">{error || '题目信息缺失'}</p>
      </Card>
    )
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">题目加载失败</div>
      </div>
    )
  }

  return (
    <QuestionForm
      mode="edit"
      profile={profile}
      questionId={questionId}
      initialData={question}
      onSuccess={(updated) => {
        const target = updated?.id || questionId
        router.push(`/questions/${target}`)
        router.refresh()
      }}
      onCancel={() => router.push('/questions')}
    />
  )
}
