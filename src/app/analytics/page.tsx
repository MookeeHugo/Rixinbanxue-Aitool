'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question } from '@/lib/supabase'

interface KnowledgePointStats {
  name: string
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  masteryRate: number
  trend: 'up' | 'down' | 'stable'
}

interface QuestionAttempt {
  questionId: string
  question: Question
  isCorrect: boolean
  submittedAt: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgePointStats[]>([])
  const [totalStats, setTotalStats] = useState({
    totalAttempts: 0,
    correctCount: 0,
    wrongCount: 0,
    averageScore: 0
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 获取所有提交记录
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments(
            papers(question_ids)
          )
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })

      if (!submissions || submissions.length === 0) {
        setLoading(false)
        return
      }

      // 过滤时间范围
      const filteredSubmissions = submissions.filter(sub => {
        if (timeRange === 'all') return true
        const submittedDate = new Date(sub.submitted_at)
        const now = new Date()
        const daysDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)

        if (timeRange === 'week') return daysDiff <= 7
        if (timeRange === 'month') return daysDiff <= 30
        return true
      })

      const allAttempts: QuestionAttempt[] = []
      const knowledgeMap = new Map<string, { correct: number; wrong: number }>()

      // 优化：先收集所有题目ID，避免N+1查询
      const allQuestionIds = new Set<string>()
      filteredSubmissions.forEach(submission => {
        const assignment = (submission as any).assignments
        const questionIds = assignment?.papers?.question_ids || []
        questionIds.forEach((id: string) => allQuestionIds.add(id))
      })

      // 一次性批量获取所有题目
      const { data: allQuestions } = await supabase
        .from('questions')
        .select('*')
        .in('id', Array.from(allQuestionIds))

      if (!allQuestions || allQuestions.length === 0) {
        setLoading(false)
        return
      }

      // 创建题目ID到题目对象的映射，方便快速查找
      const questionsMap = new Map<string, Question>()
      allQuestions.forEach((q: Question) => {
        questionsMap.set(q.id, q)
      })

      // 遍历每个提交，使用缓存的题目数据
      for (const submission of filteredSubmissions) {
        const assignment = (submission as any).assignments
        const questionIds = assignment?.papers?.question_ids || []

        if (questionIds.length === 0) continue

        // 分析每道题（使用缓存的题目数据）
        questionIds.forEach((questionId: string) => {
          const question = questionsMap.get(questionId)
          if (!question) return // 题目不存在，跳过

          const studentAnswer = submission.answers?.[questionId]
          if (!studentAnswer) return // 跳过未作答的题

          const isCorrect = studentAnswer === question.answer
          const kp = question.knowledge_points?.[0] || '未知知识点'

          // 记录尝试
          allAttempts.push({
            questionId: question.id,
            question,
            isCorrect,
            submittedAt: submission.submitted_at
          })

          // 统计知识点
          if (!knowledgeMap.has(kp)) {
            knowledgeMap.set(kp, { correct: 0, wrong: 0 })
          }
          const stats = knowledgeMap.get(kp)!
          if (isCorrect) {
            stats.correct++
          } else {
            stats.wrong++
          }
        })
      }

      // 计算知识点统计
      const statsArray: KnowledgePointStats[] = Array.from(knowledgeMap.entries()).map(([name, stats]) => {
        const total = stats.correct + stats.wrong
        const masteryRate = total > 0 ? (stats.correct / total) * 100 : 0

        // 简单的趋势判断（实际可以基于时间序列分析）
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (masteryRate >= 80) trend = 'up'
        else if (masteryRate < 60) trend = 'down'

        return {
          name,
          totalQuestions: total,
          correctAnswers: stats.correct,
          wrongAnswers: stats.wrong,
          masteryRate: parseFloat(masteryRate.toFixed(1)),
          trend
        }
      })

      // 按掌握率排序
      statsArray.sort((a, b) => b.masteryRate - a.masteryRate)
      setKnowledgeStats(statsArray)

      // 计算总体统计
      const correctCount = allAttempts.filter(a => a.isCorrect).length
      const wrongCount = allAttempts.filter(a => !a.isCorrect).length
      const totalAttempts = allAttempts.length
      const averageScore = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0

      setTotalStats({
        totalAttempts,
        correctCount,
        wrongCount,
        averageScore: parseFloat(averageScore.toFixed(1))
      })

    } catch (error) {
      console.error('加载分析数据失败:', error)
      alert('加载分析数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getMasteryLevel = (rate: number) => {
    if (rate >= 90) return { text: '优秀', color: 'text-success', bg: 'bg-success/10' }
    if (rate >= 80) return { text: '良好', color: 'text-info', bg: 'bg-info/10' }
    if (rate >= 70) return { text: '中等', color: 'text-warning', bg: 'bg-warning/10' }
    if (rate >= 60) return { text: '及格', color: 'text-brand-orange', bg: 'bg-brand-orange/10' }
    return { text: '需加强', color: 'text-error', bg: 'bg-error/10' }
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">学情分析</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 rounded-lg transition-colors border ${
                timeRange === 'week'
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-card text-foreground-secondary hover:text-foreground hover:bg-border-light border-border'
              }`}
            >
              近一周
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 rounded-lg transition-colors border ${
                timeRange === 'month'
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-card text-foreground-secondary hover:text-foreground hover:bg-border-light border-border'
              }`}
            >
              近一月
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-4 py-2 rounded-lg transition-colors border ${
                timeRange === 'all'
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-card text-foreground-secondary hover:text-foreground hover:bg-border-light border-border'
              }`}
            >
              全部
            </button>
          </div>
        </div>

        {knowledgeStats.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-foreground text-xl mb-2">暂无数据</p>
            <p className="text-foreground-secondary">完成作业后可以查看学情分析</p>
          </div>
        ) : (
          <>
            {/* 总体统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-card rounded-lg p-6 border border-border">
                <p className="text-foreground-secondary text-sm mb-2">总答题数</p>
                <p className="text-foreground text-3xl font-bold">{totalStats.totalAttempts}</p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <p className="text-foreground-secondary text-sm mb-2">正确数</p>
                <p className="text-success text-3xl font-bold">{totalStats.correctCount}</p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <p className="text-foreground-secondary text-sm mb-2">错误数</p>
                <p className="text-error text-3xl font-bold">{totalStats.wrongCount}</p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <p className="text-foreground-secondary text-sm mb-2">平均正确率</p>
                <p className="text-brand-red text-3xl font-bold">{totalStats.averageScore}%</p>
              </div>
            </div>

            {/* 知识点掌握情况 */}
            <div className="bg-card rounded-lg p-6 mb-8 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-6">知识点掌握情况</h2>
              <div className="space-y-4">
                {knowledgeStats.map((stat) => {
                  const level = getMasteryLevel(stat.masteryRate)
                  return (
                    <div key={stat.name} className="bg-background rounded-lg p-5 border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-foreground font-semibold text-lg mb-2">{stat.name}</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-foreground-secondary">
                              总题数: <span className="text-foreground">{stat.totalQuestions}</span>
                            </span>
                            <span className="text-foreground-secondary">
                              正确: <span className="text-success">{stat.correctAnswers}</span>
                            </span>
                            <span className="text-foreground-secondary">
                              错误: <span className="text-error">{stat.wrongAnswers}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`${level.bg} ${level.color} px-3 py-1 rounded-full text-sm font-semibold mb-2`}>
                            {level.text}
                          </div>
                          <p className="text-foreground text-2xl font-bold">{stat.masteryRate}%</p>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            stat.masteryRate >= 80 ? 'bg-success' :
                            stat.masteryRate >= 60 ? 'bg-warning' :
                            'bg-error'
                          }`}
                          style={{ width: `${stat.masteryRate}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 学习建议 */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">学习建议</h2>
              <div className="space-y-3">
                {knowledgeStats.filter(s => s.masteryRate < 70).length > 0 ? (
                  <>
                    <div className="bg-error/10 border border-error/30 rounded-lg p-4">
                      <p className="text-error font-semibold mb-2">需要重点关注的知识点:</p>
                      <ul className="text-foreground space-y-1 ml-4">
                        {knowledgeStats
                          .filter(s => s.masteryRate < 70)
                          .map(s => (
                            <li key={s.name} className="list-disc">
                              {s.name} (掌握率: {s.masteryRate}%)
                            </li>
                          ))}
                      </ul>
                    </div>
                    <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                      <p className="text-info font-semibold mb-2">建议:</p>
                      <ul className="text-foreground space-y-1 ml-4">
                        <li className="list-disc">多练习掌握率低于70%的知识点相关题目</li>
                        <li className="list-disc">查看错题本，重点复习错题</li>
                        <li className="list-disc">向老师请教不理解的知识点</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                    <p className="text-success font-semibold mb-2">表现优秀！</p>
                    <p className="text-foreground">所有知识点掌握情况良好，请继续保持！可以尝试更有挑战性的题目。</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
