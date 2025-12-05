"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import type { Profile, Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
// 知识点列表（与create页面相同）
const KNOWLEDGE_POINTS = [
  '有理数加法', '有理数减法', '有理数乘法', '有理数除法',
  '整式加减', '整式乘法', '因式分解',
  '一元一次方程', '二元一次方程组', '一元二次方程',
  '分式方程', '不等式',
  '函数基础', '一次函数', '反比例函数', '二次函数',
  '锐角三角函数', '解直角三角形',
  '相交线与平行线', '三角形', '全等三角形', '相似三角形',
  '等腰三角形', '直角三角形', '勾股定理',
  '四边形', '平行四边形', '矩形', '菱形', '正方形', '梯形',
  '圆的性质', '圆与直线', '圆与圆',
  '轴对称', '旋转', '平移',
  '统计初步', '概率初步', '数据分析',
  '坐标系', '点的坐标', '图形与坐标',
]

export default function EditQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const questionId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // 表单数据
  const [formData, setFormData] = useState({
    type: 'choice' as 'choice' | 'fill' | 'essay',
    content: '',
    options: ['', '', '', ''],
    answer: '',
    knowledge_points: [] as string[],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  })

  const loadProfile = useCallback(async () => {
    try {
      const data = await getCurrentProfile()
      if (!data || data.role !== 'teacher') {
        router.push('/')
        return
      }
      setProfile(data)
    } catch (error) {
      logger.error('Failed to load profile:', { error: error })
      router.push('/login')
    }
  }, [router])

  const loadQuestion = useCallback(async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single()

      if (error) throw error

      if (!data) {
        alert('题目不存在')
        router.push('/questions')
        return
      }

      // 检查权限
      if (data.created_by !== profile!.id) {
        alert('您没有权限编辑此题目')
        router.push('/questions')
        return
      }

      // 填充表单数据
      setFormData({
        type: data.type,
        content: data.content,
        options: data.type === 'choice' && data.options
          ? [...data.options, '', '', '', ''].slice(0, 4)
          : ['', '', '', ''],
        answer: data.answer,
        knowledge_points: data.knowledge_points || [],
        difficulty: data.difficulty,
      })
    } catch (error) {
      logger.error('Failed to load question:', { error: error })
      alert('加载失败')
      router.push('/questions')
    } finally {
      setInitialLoading(false)
    }
  }, [profile, questionId, router])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证
    if (!formData.content.trim()) {
      alert('请输入题干')
      return
    }
    if (!formData.answer.trim()) {
      alert('请输入答案')
      return
    }
    if (formData.knowledge_points.length === 0) {
      alert('请至少选择一个知识点')
      return
    }
    if (formData.type === 'choice') {
      const validOptions = formData.options.filter(o => o.trim())
      if (validOptions.length < 2) {
        alert('选择题至少需要2个选项')
        return
      }
    }

    setLoading(true)

    try {
      const questionData: any = {
        type: formData.type,
        content: formData.content.trim(),
        answer: formData.answer.trim(),
        knowledge_points: formData.knowledge_points,
        difficulty: formData.difficulty,
      }

      // 选择题需要保存选项
      if (formData.type === 'choice') {
        questionData.options = formData.options.filter(o => o.trim())
      } else {
        questionData.options = null
      }

      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', questionId)

      if (error) throw error

      // 成功后跳转到列表页
      router.push('/questions')
    } catch (error: any) {
      logger.error('Failed to update question:', { error: error })
      alert('更新失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleKnowledgePoint = (kp: string) => {
    if (formData.knowledge_points.includes(kp)) {
      setFormData({
        ...formData,
        knowledge_points: formData.knowledge_points.filter(k => k !== kp),
      })
    } else {
      setFormData({
        ...formData,
        knowledge_points: [...formData.knowledge_points, kp],
      })
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  if (!profile || initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">编辑题目</h1>
        <Link href="/questions" className="rx-btn">
          ← 返回列表
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="rx-card space-y-6">
          {/* 题型选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">题型 *</label>
            <select
              className="rx-select"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              required
            >
              <option value="choice">选择题</option>
              <option value="fill">填空题</option>
              <option value="essay">解答题</option>
            </select>
          </div>

          {/* 题干 */}
          <div>
            <label className="block text-sm font-medium mb-2">题干 *</label>
            <textarea
              className="rx-input min-h-[120px]"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="请输入题目内容..."
              required
            />
          </div>

          {/* 选择题选项 */}
          {formData.type === 'choice' && (
            <div>
              <label className="block text-sm font-medium mb-2">选项 *</label>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((label, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-sm font-medium w-6">{label}.</span>
                    <input
                      type="text"
                      className="rx-input flex-1"
                      value={formData.options[index]}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`选项${label}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">至少填写2个选项</p>
            </div>
          )}

          {/* 答案 */}
          <div>
            <label className="block text-sm font-medium mb-2">答案 *</label>
            {formData.type === 'choice' ? (
              <select
                className="rx-select"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                required
              >
                <option value="">请选择正确答案</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            ) : (
              <textarea
                className="rx-input min-h-[100px]"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="请输入标准答案..."
                required
              />
            )}
          </div>

          {/* 知识点 */}
          <div>
            <label className="block text-sm font-medium mb-2">知识点 * (至少选择一个)</label>
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 bg-gray-900/50 rounded-lg border border-gray-800">
              {KNOWLEDGE_POINTS.map((kp) => (
                <label key={kp} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.knowledge_points.includes(kp)}
                    onChange={() => toggleKnowledgePoint(kp)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">{kp}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">
              已选择: {formData.knowledge_points.length} 个知识点
            </p>
          </div>

          {/* 难度 */}
          <div>
            <label className="block text-sm font-medium mb-2">难度 *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value="easy"
                  checked={formData.difficulty === 'easy'}
                  onChange={(e) => setFormData({ ...formData, difficulty: 'easy' })}
                  className="cursor-pointer"
                />
                <span className="text-sm">简单</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value="medium"
                  checked={formData.difficulty === 'medium'}
                  onChange={(e) => setFormData({ ...formData, difficulty: 'medium' })}
                  className="cursor-pointer"
                />
                <span className="text-sm">中等</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value="hard"
                  checked={formData.difficulty === 'hard'}
                  onChange={(e) => setFormData({ ...formData, difficulty: 'hard' })}
                  className="cursor-pointer"
                />
                <span className="text-sm">困难</span>
              </label>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rx-btn rx-btn-primary px-8 py-3"
            >
              {loading ? '保存中...' : '保存修改'}
            </button>
            <Link href="/questions" className="rx-btn px-8 py-3">
              取消
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
