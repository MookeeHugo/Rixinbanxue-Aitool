'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface JoinedClass {
  id: string
  name: string
  grade: string
  class_code: string
  teacher_name: string
}

export default function JoinClassPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinedClasses, setJoinedClasses] = useState<JoinedClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }

    // 检查用户角色是否为学生
    if (currentUser.role !== 'student') {
      alert('只有学生可以加入班级')
      router.push('/')
      return
    }

    setUser(currentUser)
    loadJoinedClasses(currentUser.id)
  }

  const loadJoinedClasses = async (userId: string) => {
    try {
      // 查询学生已加入的班级
      const { data: classStudents, error } = await supabase
        .from('class_students')
        .select(`
          classes (
            id,
            name,
            grade,
            class_code,
            profiles (name)
          )
        `)
        .eq('student_id', userId)

      if (error) throw error

      const formatted: JoinedClass[] = (classStudents || []).map((cs: any) => ({
        id: cs.classes.id,
        name: cs.classes.name,
        grade: cs.classes.grade,
        class_code: cs.classes.class_code,
        teacher_name: cs.classes.profiles?.name || '未知教师'
      }))

      setJoinedClasses(formatted)
    } catch (error) {
      logger.error('加载已加入班级失败:', { error: error })
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!classCode.trim()) {
      alert('请输入班级代码')
      return
    }

    setLoading(true)
    try {
      // 1. 通过班级代码查找班级
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, grade')
        .eq('class_code', classCode.trim().toUpperCase())
        .single()

      if (classError || !classData) {
        alert('未找到该班级，请检查班级代码是否正确')
        return
      }

      // 2. 检查是否已经加入
      const { data: existing } = await supabase
        .from('class_students')
        .select('id')
        .eq('class_id', classData.id)
        .eq('student_id', user.id)
        .single()

      if (existing) {
        alert('您已经加入了这个班级')
        return
      }

      // 3. 加入班级
      const { error: joinError } = await supabase
        .from('class_students')
        .insert({
          class_id: classData.id,
          student_id: user.id
        })

      if (joinError) throw joinError

      alert(`成功加入班级: ${classData.name}`)
      setClassCode('')
      loadJoinedClasses(user.id) // 重新加载已加入的班级列表
    } catch (error: any) {
      logger.error('加入班级失败:', { error: error })
      if (error.code === '23505') {
        alert('您已经加入了这个班级')
      } else {
        alert('加入班级失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveClass = async (classId: string, className: string) => {
    if (!confirm(`确定要退出班级 "${className}" 吗？`)) return

    try {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', user.id)

      if (error) throw error

      alert('已退出班级')
      loadJoinedClasses(user.id)
    } catch (error) {
      logger.error('退出班级失败:', { error: error })
      alert('退出班级失败')
    }
  }

  if (loadingClasses) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">加入班级</h1>

        {/* 加入班级表单 */}
        <div className="bg-card rounded-lg p-6 mb-8 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">输入班级代码</h2>
          <form onSubmit={handleJoinClass} className="space-y-4">
            <div>
              <label className="block text-foreground mb-2">
                班级代码 *
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="例如：ABC123"
                maxLength={6}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-lg font-mono tracking-wider focus:outline-none focus:border-brand-red"
                required
              />
              <p className="text-foreground-secondary text-sm mt-2">
                班级代码通常为6位字符，由教师提供
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red text-white py-3 rounded-lg hover:bg-brand-red-hover transition-colors disabled:opacity-50 font-semibold"
            >
              {loading ? '加入中...' : '加入班级'}
            </button>
          </form>
        </div>

        {/* 已加入的班级 */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">我的班级</h2>
            <span className="text-foreground-secondary">共 {joinedClasses.length} 个班级</span>
          </div>

          {joinedClasses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-foreground mb-2">还没有加入任何班级</p>
              <p className="text-foreground-secondary text-sm">
                请向老师获取班级代码，然后在上方输入加入班级
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {joinedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-background rounded-lg p-5 border border-border hover:border-brand-red transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {cls.name}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground-secondary">
                          年级: {cls.grade}
                        </p>
                        <p className="text-foreground-secondary">
                          教师: {cls.teacher_name}
                        </p>
                        <p className="text-foreground-secondary">
                          班级代码: <span className="text-brand-red font-mono">{cls.class_code}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLeaveClass(cls.id, cls.name)}
                      className="bg-error/10 text-error px-4 py-2 rounded-lg hover:bg-error/20 transition-colors text-sm"
                    >
                      退出班级
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-info/10 border border-info/30 rounded-lg p-4">
          <p className="text-info font-semibold mb-2">💡 提示</p>
          <ul className="text-foreground space-y-1 ml-4 text-sm">
            <li className="list-disc">加入班级后，您将能够看到该班级的所有作业</li>
            <li className="list-disc">如需退出班级，请点击对应班级的"退出班级"按钮</li>
            <li className="list-disc">如果班级代码无效，请联系您的老师确认</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
