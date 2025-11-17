'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Assignment } from '@/lib/supabase'

interface AssignmentWithDetails extends Assignment {
  class_name?: string
  paper_name?: string
  submission_count?: number
}

export default function AssignmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get('classId')

  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    checkUser()
  }, [classId, filterStatus])

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

      const { data, error } = await query

      if (error) throw error

      // 格式化数据
      const formattedData: AssignmentWithDetails[] = (data || []).map((item: any) => ({
        ...item,
        class_name: item.classes?.name,
        paper_name: item.papers?.name
      }))

      setAssignments(formattedData)
    } catch (error) {
      console.error('加载作业失败:', error)
      alert('加载作业失败')
    } finally {
      setLoading(false)
    }
  }

  const deleteAssignment = async (id: string) => {
    if (!confirm('确定要删除这个作业吗？学生的提交记录也会被删除！')) return

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAssignments(assignments.filter(a => a.id !== id))
      alert('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-secondary text-foreground-secondary'
      case 'published':
        return 'bg-success/10 text-success'
      case 'closed':
        return 'bg-error/10 text-error'
      default:
        return 'bg-secondary text-foreground-secondary'
    }
  }

  const getStatusText = (status: string) => {
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
            className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
          >
            + 发布作业
          </button>
        </div>

        {/* 筛选器 */}
        <div className="bg-card rounded-lg p-4 mb-6 border border-border">
          <div className="flex gap-4 items-center">
            <span className="text-foreground">状态筛选:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-brand-red text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'draft'
                  ? 'bg-brand-red text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              草稿
            </button>
            <button
              onClick={() => setFilterStatus('published')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'published'
                  ? 'bg-brand-red text-white'
                  : 'bg-background text-foreground-secondary hover:text-foreground border border-border'
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setFilterStatus('closed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'closed'
                  ? 'bg-brand-red text-white'
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
              className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
            >
              发布第一个作业
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-card rounded-lg p-6 border border-border hover:border-brand-red transition-colors"
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
                      className="bg-brand-red text-white px-4 py-2 rounded hover:bg-brand-red-hover transition-colors"
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
