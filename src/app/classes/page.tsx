'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Class } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export default function ClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        loadClasses(currentUser.id, mountedRef)
      } catch (err: any) {
        if (!mountedRef.current) return
        logger.error('用户验证失败:', { error: err })
        setError('获取用户信息失败，请刷新页面重试')
        setLoading(false)
      }
    }

    const loadClasses = async (userId: string, mounted: { current: boolean }) => {
      try {
        if (!mounted.current) return
        setError(null)
        const { data, error: fetchError } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false })

        if (!mounted.current) return
        if (fetchError) {
          logger.error('加载班级失败:', { error: fetchError })
          setError(`加载失败: ${fetchError.message}`)
          return
        }
        setClasses(data || [])
      } catch (err: any) {
        if (!mounted.current) return
        logger.error('加载班级失败:', { error: err })
        setError('加载班级列表时发生未知错误')
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

  const deleteClass = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个班级吗？班级下的所有作业也会被删除！')) return

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setClasses(prev => prev.filter(c => c.id !== id))
      alert('删除成功')
    } catch (error) {
      logger.error('删除失败:', { error: error })
      alert('删除失败')
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
          <h1 className="text-3xl font-bold text-foreground">班级管理</h1>
          <button
            onClick={() => router.push('/classes/create')}
            className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
          >
            + 创建班级
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
                  onClick={() => window.location.reload()}
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

        {classes.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">暂无班级</p>
            <button
              onClick={() => router.push('/classes/create')}
              className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
            >
              创建第一个班级
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-card rounded-lg p-6 border border-border hover:border-primary-500 transition-colors"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {cls.name}
                </h3>
                <div className="text-foreground-secondary text-sm mb-4">
                  <p>年级: {cls.grade}</p>
                  <p>班级代码: <span className="text-primary-600 font-mono">{cls.class_code}</span></p>
                  <p>创建时间: {new Date(cls.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/classes/${cls.id}`)}
                    className="flex-1 bg-accent-500 text-white px-4 py-2 rounded hover:bg-accent-500-hover transition-colors"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => deleteClass(cls.id)}
                    className="bg-error text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
