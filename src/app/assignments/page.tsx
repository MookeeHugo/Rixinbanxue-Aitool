'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Assignment } from '@/lib/supabase'
import { logger } from '@/lib/logger'
interface AssignmentWithDetails extends Assignment {
  class_name?: string
  paper_name?: string
  submission_count?: number
}

// 纯函数移到组件外部
function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700'
    case 'published':
      return 'bg-success/10 text-success'
    case 'closed':
      return 'bg-error/10 text-error'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'draft':
      return '草稿'
    case 'published':
      return '进行中'
    case 'closed':
      return '已结束'
    default:
      return status
  }
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">加载作业列表...</div>}>
      <AssignmentsPageContent />
    </Suspense>
  )
}

function AssignmentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get('classId')

  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const loadAssignments = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('assignments')
        .select(`
          *,
          classes(name),
          papers(name)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      // 如果有班级筛选
      if (classId) {
        query = query.eq('class_id', classId)
      }

      // 如果有状态筛选
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        logger.error('加载作业失败:', { error: fetchError })
        setError(`加载失败: ${fetchError.message}`)
        return
      }

      // 格式化数据
      const formattedData: AssignmentWithDetails[] = (data || []).map((item: any) => ({
        ...item,
        class_name: item.classes?.name,
        paper_name: item.papers?.name
      }))

      setAssignments(formattedData)
    } catch (err: any) {
      logger.error('加载作业失败:', { error: err })
      setError('加载作业列表时发生未知错误')
    } finally {
      setLoading(false)
    }
  }, [classId, filterStatus])

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      loadAssignments(currentUser.id)
    } catch (err: any) {
      logger.error('获取用户信息失败:', { error: err })
      setError('获取用户信息失败，请刷新页面重试')
      setLoading(false)
    }
  }, [router, loadAssignments])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const deleteAssignment = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个作业吗？学生的提交记录也会被删除！')) return

    try {
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)

      if (deleteError) {
        logger.error('删除作业失败:', { error: deleteError })
        setError(`删除失败: ${deleteError.message}`)
        return
      }

      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      logger.error('删除作业失败:', { error: err })
      setError('删除作业时发生未知错误')
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">作业管理</h1>
          <button
            onClick={() => router.push('/assignments/create')}
            className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
          >
            + 发布作业
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-error/10 border border-error/50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-error mb-2">加载失败</h3>
                <p className="text-error/80">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => checkUser()}
                  className="bg-accent-500 text-white px-4 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
                >
                  重试
                </button>
                <button
                  onClick={() => setError(null)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="bg-card rounded-lg p-4 mb-6 border border-border">
          <div className="flex gap-4 items-center">
            <span className="text-foreground">状态筛选:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-accent-500 text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'draft'
                  ? 'bg-accent-500 text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              草稿
            </button>
            <button
              onClick={() => setFilterStatus('published')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'published'
                  ? 'bg-accent-500 text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setFilterStatus('closed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'closed'
                  ? 'bg-accent-500 text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              已结束
            </button>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">暂无作业</p>
            <button
              onClick={() => router.push('/assignments/create')}
              className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
            >
              发布第一个作业
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-card rounded-lg p-6 border border-border hover:border-primary-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">
                        {assignment.paper_name}
                      </h3>
                      <span className={`text-xs px-3 py-1 rounded ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                    </div>
                    <div className="text-foreground-secondary text-sm space-y-1">
                      <p>班级: {assignment.class_name}</p>
                      <p>截止时间: {new Date(assignment.deadline).toLocaleString()}</p>
                      <p>创建时间: {new Date(assignment.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/assignments/${assignment.id}`)}
                      className="bg-accent-500 text-white px-4 py-2 rounded hover:bg-accent-500-hover transition-colors"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={() => deleteAssignment(assignment.id)}
                      className="bg-error text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-foreground-secondary text-sm">已提交</p>
                    <p className="text-foreground text-xl font-semibold">{assignment.submission_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground-secondary text-sm">未提交</p>
                    <p className="text-foreground text-xl font-semibold">-</p>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground-secondary text-sm">平均分</p>
                    <p className="text-foreground text-xl font-semibold">-</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
