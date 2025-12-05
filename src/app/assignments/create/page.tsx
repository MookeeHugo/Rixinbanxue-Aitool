'use client'

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Class, Paper } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export default function CreateAssignmentPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">加载作业创建表单...</div>}>
      <CreateAssignmentPageContent />
    </Suspense>
  )
}

function CreateAssignmentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClassId = searchParams.get('classId')

  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId || '')
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('published')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (userId: string, mounted: { current: boolean }) => {
    try {
      if (!mounted.current) return
      setError(null)

      // 加载班级列表
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })

      if (!mounted.current) return
      if (classesError) {
        logger.error('加载班级失败:', { error: classesError })
        setError(`加载班级列表失败: ${classesError.message}`)
        return
      }
      setClasses(classesData || [])

      // 加载试卷列表
      const { data: papersData, error: papersError } = await supabase
        .from('papers')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (!mounted.current) return
      if (papersError) {
        logger.error('加载试卷失败:', { error: papersError })
        setError(`加载试卷列表失败: ${papersError.message}`)
        return
      }
      setPapers(papersData || [])
    } catch (err: any) {
      if (!mounted.current) return
      logger.error('加载数据失败:', { error: err })
      setError('加载数据时发生未知错误')
    }
  }, [])

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
        loadData(currentUser.id, mountedRef)
      } catch (error) {
        logger.error('用户验证失败:', { error: error })
        if (mountedRef.current) {
          router.push('/login')
        }
      }
    }

    checkUser()

    return () => {
      mountedRef.current = false
    }
  }, [router, loadData])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('用户未登录，请刷新页面重试')
      return
    }

    if (!selectedClassId || !selectedPaperId || !deadline) {
      setError('请填写所有必填字段')
      return
    }

    const parsedDeadline = new Date(deadline)
    if (Number.isNaN(parsedDeadline.getTime())) {
      setError('截止时间格式不正确，请重新选择时间')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { error: insertError } = await supabase
        .from('assignments')
        .insert({
          class_id: selectedClassId,
          paper_id: selectedPaperId,
          deadline: parsedDeadline.toISOString(),
          status: status,
          created_by: user.id
        })

      if (insertError) {
        logger.error('发布作业失败:', { error: insertError })
        setError(`发布失败: ${insertError.message}`)
        return
      }

      router.push('/assignments')
    } catch (err: any) {
      logger.error('发布作业失败:', { error: err })
      setError('发布作业时发生未知错误')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, selectedPaperId, deadline, status, user, router])

  // 获取最小日期时间（当前时间）
  const minDateTime = useMemo(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }, [])

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">发布作业</h1>

        {/* 错误提示 */}
        {error && (
          <div className="bg-error/10 border border-error/50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-error mb-2">操作失败</h3>
                <p className="text-error/80">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {classes.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">
              您还没有创建班级，请先创建班级
            </p>
            <button
              onClick={() => router.push('/classes/create')}
              className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
            >
              创建班级
            </button>
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">
              您还没有创建试卷，请先创建试卷
            </p>
            <button
              onClick={() => router.push('/papers/create')}
              className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
            >
              智能组卷
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-lg p-6 border border-border">
            <div className="mb-6">
              <label className="block text-foreground mb-2">
                选择班级 *
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">请选择班级</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.grade})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-foreground mb-2">
                选择试卷 *
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">请选择试卷</option>
                {papers.map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.name} ({paper.question_ids.length} 道题)
                  </option>
                ))}
              </select>
              <p className="text-foreground-secondary text-sm mt-2">
                没有合适的试卷？
                <button
                  type="button"
                  onClick={() => router.push('/papers/create')}
                  className="text-primary-600 hover:underline ml-1"
                >
                  去组卷
                </button>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-foreground mb-2">
                截止时间 *
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={minDateTime}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-foreground mb-2">
                发布状态
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === 'published'}
                    onChange={(e) => setStatus(e.target.value as 'published')}
                    className="text-primary-600"
                  />
                  <span className="text-foreground">立即发布</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={(e) => setStatus(e.target.value as 'draft')}
                    className="text-primary-600"
                  />
                  <span className="text-foreground">保存为草稿</span>
                </label>
              </div>
              <p className="text-foreground-secondary text-sm mt-2">
                {status === 'published' ? '学生将立即看到这个作业' : '草稿状态下学生看不到作业'}
              </p>
            </div>

            <div className="bg-background rounded-lg p-4 mb-6 border border-border">
              <p className="text-foreground-secondary text-sm">
                <span className="text-primary-600">💡 提示:</span> 发布后，学生可以在“我的作业”中看到并完成作业。您可以在作业详情页面查看学生提交情况和进行批改。
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent-500 text-white py-3 rounded-lg hover:bg-accent-500-hover transition-colors disabled:opacity-50"
              >
                {loading ? '发布中...' : status === 'published' ? '发布作业' : '保存草稿'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
