'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Class } from '@/lib/supabase'
import { logger } from '@/lib/logger'
interface Student {
  id: string
  name: string
  email: string
}

export default function ClassDetailPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [classData, setClassData] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mountedRef = { current: true }

    const checkUserAndLoadClass = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!mountedRef.current) return

        if (!currentUser) {
          router.push('/login')
          return
        }
        loadClassData(mountedRef)
      } catch (error) {
        logger.error('加载班级失败:', { error: error })
        if (mountedRef.current) {
          router.push('/login')
        }
      }
    }

    const loadClassData = async (mounted: { current: boolean }) => {
      try {
        // 加载班级信息
        const { data: classInfo, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .single()

        if (!mounted.current) return
        if (classError) throw classError
        setClassData(classInfo)

        // 这里暂时不加载学生列表，因为还没有实现学生加入班级的功能
        // 未来可以通过 class_students 关联表查询
      } catch (error) {
        if (!mounted.current) return
        logger.error('加载班级失败:', { error: error })
        alert('加载班级失败')
        router.push('/classes')
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    checkUserAndLoadClass()

    return () => {
      mountedRef.current = false
    }
  }, [classId, router])

  const copyClassCode = useCallback(() => {
    if (classData) {
      navigator.clipboard.writeText(classData.class_code)
      alert('班级代码已复制到剪贴板')
    }
  }, [classData])

  const deleteClass = useCallback(async () => {
    if (!confirm('确定要删除这个班级吗？班级下的所有作业也会被删除！')) return

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (error) throw error

      alert('删除成功')
      router.push('/classes')
    } catch (error) {
      logger.error('删除失败:', { error: error })
      alert('删除失败')
    }
  }, [classId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">加载中...</p>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">班级不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{classData.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/classes')}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回列表
            </button>
            <button
              onClick={deleteClass}
              className="bg-error text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              删除班级
            </button>
          </div>
        </div>

        {/* 班级信息卡片 */}
        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">班级信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-foreground-secondary text-sm mb-1">班级名称</p>
              <p className="text-foreground">{classData.name}</p>
            </div>
            <div>
              <p className="text-foreground-secondary text-sm mb-1">年级</p>
              <p className="text-foreground">{classData.grade}</p>
            </div>
            <div>
              <p className="text-foreground-secondary text-sm mb-1">班级代码</p>
              <div className="flex items-center gap-2">
                <p className="text-primary-600 font-mono text-xl">{classData.class_code}</p>
                <button
                  onClick={copyClassCode}
                  className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded hover:bg-primary-100 transition-colors"
                >
                  复制
                </button>
              </div>
            </div>
            <div>
              <p className="text-foreground-secondary text-sm mb-1">创建时间</p>
              <p className="text-foreground">{new Date(classData.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 学生列表 */}
        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">学生名单</h2>
            <span className="text-foreground-secondary">共 {students.length} 人</span>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-foreground-secondary mb-4">暂无学生</p>
              <div className="bg-background rounded-lg p-4 max-w-md mx-auto border border-border">
                <p className="text-sm text-foreground-secondary mb-2">
                  学生可以通过以下班级代码加入：
                </p>
                <p className="text-primary-600 font-mono text-2xl mb-2">{classData.class_code}</p>
                <button
                  onClick={copyClassCode}
                  className="text-sm bg-accent-500 text-white px-4 py-2 rounded hover:bg-accent-600 transition-colors"
                >
                  复制班级代码
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-foreground-secondary font-medium">学号</th>
                    <th className="text-left py-3 px-4 text-foreground-secondary font-medium">姓名</th>
                    <th className="text-left py-3 px-4 text-foreground-secondary font-medium">邮箱</th>
                    <th className="text-left py-3 px-4 text-foreground-secondary font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id} className="border-b border-border">
                      <td className="py-3 px-4 text-foreground">{index + 1}</td>
                      <td className="py-3 px-4 text-foreground">{student.name}</td>
                      <td className="py-3 px-4 text-foreground-secondary">{student.email}</td>
                      <td className="py-3 px-4">
                        <button className="text-error hover:opacity-80 text-sm transition-opacity">
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 快捷操作 */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">快捷操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push(`/assignments/create?classId=${classId}`)}
              className="bg-accent-500 text-white px-6 py-3 rounded-lg hover:bg-accent-600 transition-colors text-left"
            >
              <p className="font-semibold mb-1">发布作业</p>
              <p className="text-sm opacity-80">为这个班级发布新作业</p>
            </button>
            <button
              onClick={() => router.push(`/assignments?classId=${classId}`)}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors text-left"
            >
              <p className="font-semibold mb-1">查看作业</p>
              <p className="text-sm opacity-80">查看班级所有作业</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
