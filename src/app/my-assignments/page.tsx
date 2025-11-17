'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface AssignmentItem {
  id: string
  paper_name: string
  class_name: string
  deadline: string
  status: string
  submission_id?: string
  score?: number
  submitted_at?: string
}

export default function MyAssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    loadAssignments(currentUser.id)
  }

  const loadAssignments = async (userId: string) => {
    try {
      // 注意：这里简化了实现，实际应该通过 class_students 表查询学生所在班级的作业
      // 现在暂时查询所有已发布的作业
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          id,
          deadline,
          status,
          papers(name),
          classes(name)
        `)
        .eq('status', 'published')
        .order('deadline', { ascending: true })

      if (error) throw error

      // 查询学生的提交记录
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userId)

      const formattedAssignments: AssignmentItem[] = (assignmentsData || []).map((a: any) => {
        const submission = submissionsData?.find(s => s.assignment_id === a.id)
        return {
          id: a.id,
          paper_name: a.papers?.name || '未知试卷',
          class_name: a.classes?.name || '未知班级',
          deadline: a.deadline,
          status: a.status,
          submission_id: submission?.id,
          score: submission?.score,
          submitted_at: submission?.submitted_at
        }
      })

      setAssignments(formattedAssignments)
    } catch (error) {
      console.error('加载作业失败:', error)
      alert('加载作业失败')
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-secondary">加载中...</p>
      </div>
    )
  }

  const pendingAssignments = assignments.filter(a => !a.submission_id && !isOverdue(a.deadline))
  const submittedAssignments = assignments.filter(a => a.submission_id)
  const overdueAssignments = assignments.filter(a => !a.submission_id && isOverdue(a.deadline))

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-8">我的作业</h1>

        {/* 待完成作业 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            待完成 ({pendingAssignments.length})
          </h2>
          {pendingAssignments.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center">
              <p className="text-secondary">暂无待完成作业</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-lg p-6 border border-gray-800 hover:border-primary transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {assignment.paper_name}
                      </h3>
                      <div className="text-secondary text-sm space-y-1">
                        <p>班级: {assignment.class_name}</p>
                        <p className="text-yellow-500">
                          截止时间: {new Date(assignment.deadline).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/my-assignments/${assignment.id}/do`)}
                      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      开始作答
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 已提交作业 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            已提交 ({submittedAssignments.length})
          </h2>
          {submittedAssignments.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center">
              <p className="text-secondary">暂无已提交作业</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submittedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-lg p-6 border border-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {assignment.paper_name}
                      </h3>
                      <div className="text-secondary text-sm space-y-1">
                        <p>班级: {assignment.class_name}</p>
                        <p>提交时间: {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : '-'}</p>
                        <p className="text-primary text-lg font-semibold">
                          成绩: {assignment.score !== null && assignment.score !== undefined ? `${assignment.score}分` : '待批改'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/my-assignments/${assignment.id}/result`)}
                      className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 已逾期作业 */}
        {overdueAssignments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              已逾期 ({overdueAssignments.length})
            </h2>
            <div className="space-y-4">
              {overdueAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-lg p-6 border border-red-900 opacity-60"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {assignment.paper_name}
                      </h3>
                      <div className="text-secondary text-sm space-y-1">
                        <p>班级: {assignment.class_name}</p>
                        <p className="text-red-500">
                          已于 {new Date(assignment.deadline).toLocaleString()} 截止
                        </p>
                      </div>
                    </div>
                    <span className="bg-red-700 text-white px-4 py-2 rounded-lg">
                      已逾期
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
