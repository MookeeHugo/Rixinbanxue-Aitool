'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export default function CreateClassPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [className, setClassName] = useState('')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)

  const checkUser = useCallback(async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
  }, [router])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const generateClassCode = () => {
    // 生成6位随机班级代码
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!className.trim() || !grade.trim()) {
      alert('请填写所有必填字段')
      return
    }

    setLoading(true)
    try {
      const classCode = generateClassCode()

      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: className,
          grade: grade,
          class_code: classCode,
          teacher_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      alert('班级创建成功！')
      router.push(`/classes/${data.id}`)
    } catch (error: any) {
      logger.error('创建失败:', { error: error })
      // 如果是班级代码重复，重试
      if (error.code === '23505') {
        alert('班级代码冲突，请重试')
      } else {
        alert('创建失败')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">创建班级</h1>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg p-6 border border-border">
          <div className="mb-6">
            <label className="block text-foreground mb-2">
              班级名称 *
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="例如：初二（1）班"
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-foreground mb-2">
              年级 *
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary-500"
              required
            >
              <option value="">请选择年级</option>
              <option value="初一">初一</option>
              <option value="初二">初二</option>
              <option value="初三">初三</option>
            </select>
          </div>

          <div className="bg-background rounded-lg p-4 mb-6 border border-border">
            <p className="text-foreground-secondary text-sm">
              <span className="text-primary-600">💡 提示:</span> 班级创建后会自动生成唯一的班级代码，学生可以通过班级代码加入班级。
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
              className="flex-1 bg-accent-500 text-white py-3 rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建班级'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
