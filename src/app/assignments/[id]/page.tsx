'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Assignment, Question, Submission } from '@/lib/supabase'

interface AssignmentDetail extends Assignment {
  class_name?: string
  paper_name?: string
  questions?: Question[]
}

interface SubmissionDetail extends Submission {
  student_name?: string
  student_email?: string
}

export default function AssignmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndLoad()
  }, [assignmentId])

  const checkUserAndLoad = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    loadAssignment()
  }

  const loadAssignment = async () => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name),
          papers(name, question_ids)
        `)
        .eq('id', assignmentId)
        .single()

      if (assignmentError) throw assignmentError

      // 加载试卷题目
      const questionIds = (assignmentData as any).papers?.question_ids || []
      let questions: Question[] = []

      if (questionIds.length > 0) {
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds)

        questions = questionIds
          .map((id: string) => questionsData?.find(q => q.id === id))
          .filter(Boolean) as Question[]
      }

      setAssignment({
        ...assignmentData,
        class_name: (assignmentData as any).classes?.name,
        paper_name: (assignmentData as any).papers?.name,
        questions
      })

      // 加载提交记录
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles(name, email)
        `)
        .eq('assignment_id', assignmentId)

      setSubmissions((submissionsData || []).map((s: any) => ({
        ...s,
        student_name: s.profiles?.name,
        student_email: s.profiles?.email
      })))
    } catch (error) {
      console.error('加载失败:', error)
      alert('加载失败')
      router.push('/assignments')
    } finally {
      setLoading(false)
    }
  }

  const autoGrade = async (submissionId: string, answers: any) => {
    if (!assignment?.questions) return 0

    let score = 0
    const totalQuestions = assignment.questions.length

    assignment.questions.forEach((q, index) => {
      const studentAnswer = answers[q.id]
      if (q.type === 'choice' && studentAnswer === q.answer) {
        score += 100 / totalQuestions
      }
    })

    // 更新分数
    await supabase
      .from('submissions')
      .update({ score: parseFloat(score.toFixed(2)) })
      .eq('id', submissionId)

    return score
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground-secondary">加载中...</p>
    </div>
  }

  if (!assignment) return null

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{assignment.paper_name}</h1>
          <button onClick={() => router.push('/assignments')} className="bg-secondary text-foreground px-6 py-2 rounded-lg hover:bg-border-medium transition-colors">
            返回列表
          </button>
        </div>

        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-foreground-secondary">班级:</span> <span className="text-foreground">{assignment.class_name}</span></div>
            <div><span className="text-foreground-secondary">截止时间:</span> <span className="text-foreground">{new Date(assignment.deadline).toLocaleString()}</span></div>
            <div><span className="text-foreground-secondary">题目数量:</span> <span className="text-foreground">{assignment.questions?.length || 0} 道</span></div>
            <div><span className="text-foreground-secondary">提交人数:</span> <span className="text-foreground">{submissions.length} 人</span></div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">学生提交</h2>
          {submissions.length === 0 ? (
            <p className="text-foreground-secondary text-center py-8">暂无提交</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="bg-background rounded-lg p-4 border border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-foreground font-semibold">{sub.student_name}</p>
                      <p className="text-foreground-secondary text-sm">{new Date(sub.submitted_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-brand-red text-xl font-semibold">
                        {sub.score !== null ? `${sub.score}分` : '未批改'}
                      </p>
                      <button
                        onClick={() => router.push(`/assignments/${assignmentId}/grade/${sub.id}`)}
                        className="bg-brand-red text-white px-4 py-2 rounded hover:bg-brand-red-hover transition-colors"
                      >
                        查看/批改
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
