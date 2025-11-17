'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question } from '@/lib/supabase'

const KNOWLEDGE_POINTS = [
  '有理数加法', '有理数减法', '有理数乘法', '有理数除法', '有理数混合运算',
  '整式加减', '整式乘法', '整式除法', '因式分解',
  '一元一次方程', '二元一次方程组', '一元二次方程', '分式方程',
  '一次函数', '反比例函数', '二次函数',
  '平面直角坐标系', '函数图像',
  '相交线与平行线', '三角形', '等腰三角形', '直角三角形',
  '勾股定理', '全等三角形', '相似三角形',
  '四边形', '平行四边形', '矩形', '菱形', '正方形', '梯形',
  '多边形', '圆的性质', '圆周角', '切线',
  '轴对称', '旋转', '平移',
  '数据的收集', '数据的整理', '数据的分析',
  '概率初步', '样本与总体',
  '锐角三角函数', '解直角三角形',
  '统计图表', '平均数', '中位数', '众数', '方差',
  '不等式', '不等式组'
]

interface QuestionRequirement {
  type: 'choice' | 'fill' | 'essay' | ''
  difficulty: 'easy' | 'medium' | 'hard' | ''
  count: number
}

export default function CreatePaperPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [paperName, setPaperName] = useState('')
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>(KNOWLEDGE_POINTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<string[]>([])
  const [requirements, setRequirements] = useState<QuestionRequirement[]>([
    { type: '', difficulty: '', count: 0 }
  ])
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    checkUser()
    loadKnowledgePointsFromDB()
  }, [])

  // 从数据库加载知识点（如果表存在）
  const loadKnowledgePointsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_points')
        .select('name')
        .eq('is_active', true)
        .order('display_order')

      if (!error && data && data.length > 0) {
        // 数据库有数据，使用数据库的知识点
        setKnowledgePoints(data.map((kp: any) => kp.name))
      }
      // 如果数据库没有数据或出错，继续使用硬编码的知识点
    } catch (error) {
      console.log('Knowledge points table not found, using fallback')
      // 表不存在时，继续使用硬编码的KNOWLEDGE_POINTS
    }
  }

  const checkUser = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
  }

  const toggleKnowledgePoint = (point: string) => {
    if (selectedKnowledgePoints.includes(point)) {
      setSelectedKnowledgePoints(selectedKnowledgePoints.filter(p => p !== point))
    } else {
      setSelectedKnowledgePoints([...selectedKnowledgePoints, point])
    }
  }

  const addRequirement = () => {
    setRequirements([...requirements, { type: '', difficulty: '', count: 0 }])
  }

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const updateRequirement = (index: number, field: keyof QuestionRequirement, value: any) => {
    const newRequirements = [...requirements]
    newRequirements[index] = { ...newRequirements[index], [field]: value }
    setRequirements(newRequirements)
  }

  const generatePaper = async () => {
    if (!paperName.trim()) {
      alert('请输入试卷名称')
      return
    }

    if (requirements.every(r => r.count === 0)) {
      alert('请至少添加一个题目要求')
      return
    }

    setLoading(true)
    try {
      // 智能组卷算法
      const selected: Question[] = []

      for (const req of requirements) {
        if (req.count === 0) continue

        // 构建查询条件
        let query = supabase
          .from('questions')
          .select('*')

        // 筛选题型
        if (req.type) {
          query = query.eq('type', req.type)
        }

        // 筛选难度
        if (req.difficulty) {
          query = query.eq('difficulty', req.difficulty)
        }

        // 筛选知识点（如果有选择）
        if (selectedKnowledgePoints.length > 0) {
          query = query.overlaps('knowledge_points', selectedKnowledgePoints)
        }

        const { data, error } = await query

        if (error) throw error

        if (!data || data.length === 0) {
          alert(`没有找到符合条件的题目：${req.type || '全部题型'} - ${req.difficulty || '全部难度'}`)
          setLoading(false)
          return
        }

        // 随机选择题目
        const shuffled = data.sort(() => Math.random() - 0.5)
        const picked = shuffled.slice(0, Math.min(req.count, shuffled.length))
        selected.push(...picked)

        if (picked.length < req.count) {
          alert(`${req.type || '全部题型'} - ${req.difficulty || '全部难度'} 只找到 ${picked.length} 道题，需要 ${req.count} 道`)
        }
      }

      if (selected.length === 0) {
        alert('没有找到符合条件的题目')
        setLoading(false)
        return
      }

      setSelectedQuestions(selected)
      setShowPreview(true)
    } catch (error) {
      console.error('组卷失败:', error)
      alert('组卷失败')
    } finally {
      setLoading(false)
    }
  }

  const savePaper = async () => {
    if (selectedQuestions.length === 0) {
      alert('请先生成试卷')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('papers')
        .insert({
          name: paperName,
          question_ids: selectedQuestions.map(q => q.id),
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      alert('试卷保存成功！')
      router.push(`/papers/${data.id}`)
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const getTotalQuestions = () => {
    return requirements.reduce((sum, req) => sum + (req.count || 0), 0)
  }

  // 题目管理功能
  const removeQuestion = (index: number) => {
    if (confirm('确定要删除这道题吗？')) {
      setSelectedQuestions(selectedQuestions.filter((_, i) => i !== index))
    }
  }

  const moveQuestionUp = (index: number) => {
    if (index === 0) return
    const newQuestions = [...selectedQuestions]
    ;[newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]]
    setSelectedQuestions(newQuestions)
  }

  const moveQuestionDown = (index: number) => {
    if (index === selectedQuestions.length - 1) return
    const newQuestions = [...selectedQuestions]
    ;[newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]]
    setSelectedQuestions(newQuestions)
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">试卷预览</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-secondary text-foreground px-6 py-2 rounded-lg hover:bg-border-medium transition-colors"
              >
                返回编辑
              </button>
              <button
                onClick={savePaper}
                disabled={loading}
                className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存试卷'}
              </button>
            </div>
          </div>

          <div className="bg-card rounded-lg p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">{paperName}</h2>
            <p className="text-foreground-secondary text-center mb-8">共 {selectedQuestions.length} 道题</p>

            <div className="space-y-6">
              {selectedQuestions.map((question, index) => (
                <div key={question.id} className="border-b border-border pb-6 last:border-b-0">
                  <div className="flex gap-4">
                    {/* 题号 */}
                    <span className="text-foreground font-semibold">{index + 1}.</span>

                    {/* 题目内容 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded">
                          {question.type === 'choice' ? '选择题' : question.type === 'fill' ? '填空题' : '解答题'}
                        </span>
                        <span className="text-xs bg-secondary text-foreground-tertiary px-2 py-1 rounded">
                          {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
                        </span>
                      </div>
                      <p className="text-foreground mb-3">{question.content}</p>
                      {question.type === 'choice' && question.options && (
                        <div className="space-y-1 text-foreground-secondary">
                          {Object.entries(question.options).map(([key, value]) => (
                            <p key={key}>{key}. {value}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveQuestionUp(index)}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-border-medium disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveQuestionDown(index)}
                        disabled={index === selectedQuestions.length - 1}
                        className="px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-border-medium disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下移"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="px-2 py-1 text-xs bg-error text-white rounded hover:opacity-90"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">智能组卷</h1>

        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <label className="block text-foreground mb-2">试卷名称 *</label>
          <input
            type="text"
            value={paperName}
            onChange={(e) => setPaperName(e.target.value)}
            placeholder="例如：初二数学第一次月考"
            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-brand-red"
          />
        </div>

        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <h3 className="text-foreground font-semibold mb-4">知识点筛选（可选）</h3>

          {/* 搜索框 */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索知识点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-brand-red"
            />
          </div>

          {/* 知识点列表 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {knowledgePoints
              .filter(point => point.includes(searchTerm))
              .map((point) => (
                <label key={point} className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand-red">
                  <input
                    type="checkbox"
                    checked={selectedKnowledgePoints.includes(point)}
                    onChange={() => toggleKnowledgePoint(point)}
                    className="rounded"
                  />
                  <span className={selectedKnowledgePoints.includes(point) ? 'text-brand-red' : 'text-foreground-secondary'}>
                    {point}
                  </span>
                </label>
              ))}
          </div>
          {selectedKnowledgePoints.length > 0 && (
            <p className="text-brand-red text-sm mt-4">
              已选择 {selectedKnowledgePoints.length} 个知识点
            </p>
          )}
        </div>

        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-foreground font-semibold">组卷要求</h3>
            <button
              onClick={addRequirement}
              className="bg-brand-red text-white px-4 py-1 rounded text-sm hover:bg-brand-red-hover transition-colors"
            >
              + 添加要求
            </button>
          </div>

          <div className="space-y-4">
            {requirements.map((req, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-foreground-secondary text-sm mb-1">题型</label>
                  <select
                    value={req.type}
                    onChange={(e) => updateRequirement(index, 'type', e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-brand-red"
                  >
                    <option value="">全部</option>
                    <option value="choice">选择题</option>
                    <option value="fill">填空题</option>
                    <option value="essay">解答题</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-foreground-secondary text-sm mb-1">难度</label>
                  <select
                    value={req.difficulty}
                    onChange={(e) => updateRequirement(index, 'difficulty', e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-brand-red"
                  >
                    <option value="">全部</option>
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-foreground-secondary text-sm mb-1">数量</label>
                  <input
                    type="number"
                    min="0"
                    value={req.count || ''}
                    onChange={(e) => updateRequirement(index, 'count', parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-brand-red"
                  />
                </div>

                <button
                  onClick={() => removeRequirement(index)}
                  className="bg-error text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <span className="text-foreground-secondary">预计题目数量: </span>
            <span className="text-brand-red font-semibold">{getTotalQuestions()} 道</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-secondary text-foreground py-3 rounded-lg hover:bg-border-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={generatePaper}
            disabled={loading}
            className="flex-1 bg-brand-red text-white py-3 rounded-lg hover:bg-brand-red-hover transition-colors disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成试卷'}
          </button>
        </div>
      </div>
    </div>
  )
}
