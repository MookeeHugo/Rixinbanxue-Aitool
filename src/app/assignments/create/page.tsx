'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Class, Paper } from '@/lib/supabase'

export default function CreateAssignmentPage() {
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
    loadData(currentUser.id)
  }

  const loadData = async (userId: string) => {
    try {
      // 加载班级列表
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })

      if (classesError) throw classesError
      setClasses(classesData || [])

      // 加载试卷列表
      const { data: papersData, error: papersError } = await supabase
        .from('papers')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (papersError) throw papersError
      setPapers(papersData || [])
    } catch (error) {
      console.error('加载数据失败:', error)
      alert('加载数据失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClassId || !selectedPaperId || !deadline) {
      alert('请填写所有必填字段')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          class_id: selectedClassId,
          paper_id: selectedPaperId,
          deadline: new Date(deadline).toISOString(),
          status: status,
          created_by: user.id
        })

      if (error) throw error

      alert('作业发布成功！')
      router.push('/assignments')
    } catch (error) {
      console.error('发布失败:', error)
      alert('发布失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取最小日期时间（当前时间）
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">发布作业</h1>

        {classes.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">
              您还没有创建班级，请先创建班级
            </p>
            <button
              onClick={() => router.push('/classes/create')}
              className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
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
              className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
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
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-brand-red"
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
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-brand-red"
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
                  className="text-brand-red hover:underline ml-1"
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
                min={getMinDateTime()}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-brand-red"
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
                    className="text-brand-red"
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
                    className="text-brand-red"
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
                <span className="text-brand-red">💡 提示:</span> 发布后，学生可以在"我的作业"中看到并完成作业。您可以在作业详情页面查看学生提交情况和进行批改。
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-secondary text-foreground py-3 rounded-lg hover:bg-border-medium transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand-red text-white py-3 rounded-lg hover:bg-brand-red-hover transition-colors disabled:opacity-50"
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
