'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Class } from '@/lib/supabase'

export default function ClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
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
    loadClasses(currentUser.id)
  }

  const loadClasses = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('加载班级失败:', error)
      alert('加载班级失败')
    } finally {
      setLoading(false)
    }
  }

  const deleteClass = async (id: string) => {
    if (!confirm('确定要删除这个班级吗？班级下的所有作业也会被删除！')) return

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setClasses(classes.filter(c => c.id !== id))
      alert('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
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
          <h1 className="text-3xl font-bold text-foreground">班级管理</h1>
          <button
            onClick={() => router.push('/classes/create')}
            className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
          >
            + 创建班级
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">暂无班级</p>
            <button
              onClick={() => router.push('/classes/create')}
              className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
            >
              创建第一个班级
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-card rounded-lg p-6 border border-border hover:border-brand-red transition-colors"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {cls.name}
                </h3>
                <div className="text-foreground-secondary text-sm mb-4">
                  <p>年级: {cls.grade}</p>
                  <p>班级代码: <span className="text-brand-red font-mono">{cls.class_code}</span></p>
                  <p>创建时间: {new Date(cls.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/classes/${cls.id}`)}
                    className="flex-1 bg-brand-red text-white px-4 py-2 rounded hover:bg-brand-red-hover transition-colors"
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
