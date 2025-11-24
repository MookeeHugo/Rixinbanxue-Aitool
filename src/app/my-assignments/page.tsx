'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

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
    const mountedRef = { current: true }

    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!mountedRef.current) return

        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)
        loadAssignments(currentUser.id, mountedRef)
      } catch (error) {
        logger.error('用户验证失败:', { error: error })
        if (mountedRef.current) {
          router.push('/login')
        }
      }
    }

    const loadAssignments = async (userId: string, mounted: { current: boolean }) => {
      try {
        // 1. 查询学生加入的所有班级
        const { data: classStudents, error: classError } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', userId)

        if (!mounted.current) return
        if (classError) throw classError

        // 如果学生没有加入任何班级，返回空列表
        if (!classStudents || classStudents.length === 0) {
          setAssignments([])
          setLoading(false)
          return
        }

        const classIds = classStudents.map(cs => cs.class_id)

        // 2. 查询这些班级的已发布作业
        const { data: assignmentsData, error } = await supabase
          .from('assignments')
          .select(`
            id,
            deadline,
            status,
            papers(name),
            classes(name)
          `)
          .in('class_id', classIds)
          .eq('status', 'published')
          .order('deadline', { ascending: true })

        if (!mounted.current) return
        if (error) throw error

        // 3. 查询学生的提交记录
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('*')
          .eq('student_id', userId)

        if (!mounted.current) return

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
        if (!mounted.current) return
        logger.error('加载作业失败:', { error: error })
        alert('加载作业失败')
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    checkUser()

    return () => {
      mountedRef.current = false
    }
  }, [router])

  const isOverdue = useCallback((deadline: string) => {
    return new Date(deadline) < new Date()
  }, [])

  const categorizedAssignments = useMemo(() => ({
    pending: assignments.filter(a => !a.submission_id && !isOverdue(a.deadline)),
    submitted: assignments.filter(a => a.submission_id),
    overdue: assignments.filter(a => !a.submission_id && isOverdue(a.deadline))
  }), [assignments, isOverdue])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">加载中...</p>
      </div>
    )
  }

  const pendingAssignments = categorizedAssignments.pending
  const submittedAssignments = categorizedAssignments.submitted
  const overdueAssignments = categorizedAssignments.overdue

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">我的作业</h1>

        {/* 没有加入班级的提示 */}
        {assignments.length === 0 && pendingAssignments.length === 0 && submittedAssignments.length === 0 && overdueAssignments.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-foreground text-xl mb-2">还没有作业</p>
            <p className="text-foreground-secondary mb-6">您可能还没有加入任何班级</p>
            <button
              onClick={() => router.push('/join-class')}
              className="bg-brand-red text-white px-8 py-3 rounded-lg hover:bg-brand-red-hover transition-colors font-semibold"
            >
              立即加入班级
            </button>
          </div>
        ) : (
          <>
            {/* 待完成作业 */}
            <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            待完成 ({pendingAssignments.length})
          </h2>
          {pendingAssignments.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center border border-border">
              <p className="text-foreground-secondary">暂无待完成作业</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-lg p-6 border border-border hover:border-brand-red transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {assignment.paper_name}
                      </h3>
                      <div className="text-foreground-secondary text-sm space-y-1">
                        <p>班级: {assignment.class_name}</p>
                        <p className="text-warning">
                          截止时间: {new Date(assignment.deadline).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/my-assignments/${assignment.id}/do`)}
                      className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
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
          <h2 className="text-xl font-semibold text-foreground mb-4">
            已提交 ({submittedAssignments.length})
          </h2>
          {submittedAssignments.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center border border-border">
              <p className="text-foreground-secondary">暂无已提交作业</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submittedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-lg p-6 border border-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {assignment.paper_name}
                      </h3>
                      <div className="text-foreground-secondary text-sm space-y-1">
                        <p>班级: {assignment.class_name}</p>
                        <p>提交时间: {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : '-'}</p>
                        <p className="text-brand-red text-lg font-semibold">
                          成绩: {assignment.score !== null && assignment.score !== undefined ? `${assignment.score}分` : '待批改'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/my-assignments/${assignment.id}/result`)}
                      className="bg-secondary text-foreground px-6 py-2 rounded-lg hover:bg-border-medium transition-colors"
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
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  已逾期 ({overdueAssignments.length})
                </h2>
                <div className="space-y-4">
                  {overdueAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="bg-card rounded-lg p-6 border border-error opacity-60"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {assignment.paper_name}
                          </h3>
                          <div className="text-foreground-secondary text-sm space-y-1">
                            <p>班级: {assignment.class_name}</p>
                            <p className="text-error">
                              已于 {new Date(assignment.deadline).toLocaleString()} 截止
                            </p>
                          </div>
                        </div>
                        <span className="bg-error text-white px-4 py-2 rounded-lg">
                          已逾期
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
