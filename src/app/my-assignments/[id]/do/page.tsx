'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question } from '@/lib/supabase'

export default function DoAssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkUserAndLoad()
  }, [assignmentId])

  const checkUserAndLoad = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    loadAssignment()
  }

  const loadAssignment = async () => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          papers(name, question_ids),
          classes(name)
        `)
        .eq('id', assignmentId)
        .single()

      if (assignmentError) throw assignmentError
      setAssignment(assignmentData)

      const questionIds = (assignmentData as any).papers?.question_ids || []
      if (questionIds.length > 0) {
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds)

        const orderedQuestions = questionIds
          .map((id: string) => questionsData?.find(q => q.id === id))
          .filter(Boolean) as Question[]

        setQuestions(orderedQuestions)
      }
    } catch (error) {
      console.error('加载失败:', error)
      alert('加载失败')
      router.push('/my-assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    })
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (!confirm('还有题目未作答，确定要提交吗？')) {
        return
      }
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          answers: answers
        })

      if (error) throw error

      alert('提交成功！')
      router.push('/my-assignments')
    } catch (error: any) {
      console.error('提交失败:', error)
      if (error.code === '23505') {
        alert('您已经提交过这个作业了')
      } else {
        alert('提交失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {assignment?.papers?.name}
            </h1>
            <p className="text-foreground-secondary">
              班级: {assignment?.classes?.name} | 截止时间: {new Date(assignment?.deadline).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="bg-secondary text-foreground px-6 py-2 rounded-lg hover:bg-border-medium transition-colors"
          >
            返回
          </button>
        </div>

        <div className="bg-card rounded-lg p-8 mb-6 border border-border">
          <div className="space-y-8">
            {questions.map((question, index) => (
              <div key={question.id} className="border-b border-border pb-6 last:border-b-0">
                <div className="flex gap-4">
                  <span className="text-foreground font-semibold min-w-[2rem]">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-brand-red/20 text-brand-red px-2 py-1 rounded">
                        {question.type === 'choice' ? '选择题' : question.type === 'fill' ? '填空题' : '解答题'}
                      </span>
                    </div>
                    <p className="text-foreground mb-4 text-lg">{question.content}</p>

                    {question.type === 'choice' && question.options && (
                      <div className="space-y-3">
                        {Object.entries(question.options).map(([key, value]) => (
                          <label
                            key={key}
                            className="flex items-start gap-3 cursor-pointer hover:bg-background p-3 rounded transition-colors border border-transparent hover:border-border"
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={key}
                              checked={answers[question.id] === key}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="mt-1"
                            />
                            <span className="text-foreground flex-1">{key}. {value}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'fill' && (
                      <input
                        type="text"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="请输入答案"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-brand-red"
                      />
                    )}

                    {question.type === 'essay' && (
                      <textarea
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="请输入答案"
                        rows={6}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-brand-red resize-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex justify-between items-center">
            <p className="text-foreground-secondary">
              已作答: {Object.keys(answers).length} / {questions.length} 题
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-brand-red text-white px-8 py-3 rounded-lg hover:bg-brand-red-hover transition-colors disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交作业'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
