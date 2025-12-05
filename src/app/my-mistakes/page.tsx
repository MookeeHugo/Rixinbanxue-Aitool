'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
interface MistakeItem {
  questionId: string
  question: Question
  studentAnswer: string
  correctAnswer: string
  assignmentName: string
  submittedAt: string
  knowledgePoint: string
}

export default function MyMistakesPage() {
  const router = useRouter()
  const [mistakes, setMistakes] = useState<MistakeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKnowledge, setSelectedKnowledge] = useState<string>('all')
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([])

  const loadMistakes = useCallback(async () => {
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
            id,
            papers(name, question_ids)
          )
        `)
        .eq('student_id', user.id)

      if (!submissions || submissions.length === 0) {
        setLoading(false)
        return
      }

      const allMistakes: MistakeItem[] = []
      const knowledgeSet = new Set<string>()

      // 遍历每个提交
      for (const submission of submissions) {
        const assignment = (submission as any).assignments
        const paper = assignment?.papers
        const questionIds = paper?.question_ids || []

        if (questionIds.length === 0) continue

        // 获取题目详情
        const { data: questions } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds)

        if (!questions) continue

        // 找出错题
        questions.forEach((question: Question) => {
          const studentAnswer = submission.answers?.[question.id]
          const correctAnswer = question.answer

          // 如果学生作答了且答案错误
          if (studentAnswer && studentAnswer !== correctAnswer) {
            const knowledgePoint = question.knowledge_points?.[0] || '未知知识点'
            allMistakes.push({
              questionId: question.id,
              question,
              studentAnswer,
              correctAnswer,
              assignmentName: paper?.name || '未知作业',
              submittedAt: submission.submitted_at,
              knowledgePoint
            })
            knowledgeSet.add(knowledgePoint)
          }
        })
      }

      setMistakes(allMistakes)
      setKnowledgePoints(Array.from(knowledgeSet).sort())
    } catch (error) {
      logger.error('加载错题失败:', { error: error })
      alert('加载错题失败')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadMistakes()
  }, [loadMistakes])

  const filteredMistakes = selectedKnowledge === 'all'
    ? mistakes
    : mistakes.filter(m => m.knowledgePoint === selectedKnowledge)

  // 按知识点分组统计
  const knowledgeStats = knowledgePoints.map(kp => ({
    name: kp,
    count: mistakes.filter(m => m.knowledgePoint === kp).length
  }))

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
          <h1 className="text-3xl font-bold text-foreground">我的错题本</h1>
          <div className="text-foreground-secondary">
            共 {mistakes.length} 道错题
          </div>
        </div>

        {mistakes.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-foreground text-xl mb-2">太棒了！暂无错题</p>
            <p className="text-foreground-secondary">继续保持，加油！</p>
          </div>
        ) : (
          <>
            {/* 知识点统计 */}
            <div className="bg-card rounded-lg p-6 mb-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">知识点分布</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {knowledgeStats.map((stat) => (
                  <div
                    key={stat.name}
                    className="bg-background rounded-lg p-4 text-center border border-border"
                  >
                    <p className="text-foreground-secondary text-sm mb-1">{stat.name}</p>
                    <p className="text-primary-600 text-2xl font-bold">{stat.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 知识点筛选 */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedKnowledge('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedKnowledge === 'all'
                      ? 'bg-accent-500 text-white'
                      : 'bg-card text-foreground-secondary border border-border hover:bg-border-light'
                  }`}
                >
                  全部 ({mistakes.length})
                </button>
                {knowledgePoints.map((kp) => (
                  <button
                    key={kp}
                    onClick={() => setSelectedKnowledge(kp)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedKnowledge === kp
                        ? 'bg-accent-500 text-white'
                        : 'bg-card text-foreground-secondary border border-border hover:bg-border-light'
                    }`}
                  >
                    {kp} ({mistakes.filter(m => m.knowledgePoint === kp).length})
                  </button>
                ))}
              </div>
            </div>

            {/* 错题列表 */}
            <div className="space-y-6">
              {filteredMistakes.map((mistake, index) => (
                <div key={`${mistake.questionId}-${index}`} className="bg-card rounded-lg p-6 border border-border">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-error/20 text-error px-2 py-1 rounded">
                        错题
                      </span>
                      <span className="text-xs bg-accent-500/20 text-primary-600 px-2 py-1 rounded">
                        {mistake.question.type === 'choice' ? '选择题' :
                         mistake.question.type === 'fill' ? '填空题' : '解答题'}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {mistake.knowledgePoint}
                      </span>
                    </div>
                    <span className="text-foreground-secondary text-sm">
                      {new Date(mistake.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-foreground text-lg mb-2">{mistake.question.content}</p>
                    {mistake.question.type === 'choice' && mistake.question.options && (
                      <div className="space-y-2 mt-3">
                        {Object.entries(mistake.question.options).map(([key, value]) => (
                          <div
                            key={key}
                            className={`p-3 rounded border ${
                              key === mistake.correctAnswer
                                ? 'bg-success/10 border-success/30'
                                : key === mistake.studentAnswer
                                ? 'bg-error/10 border-error/30'
                                : 'bg-background border-border'
                            }`}
                          >
                            <span className="text-foreground">
                              {key}. {value}
                              {key === mistake.correctAnswer && (
                                <span className="ml-2 text-success text-sm">✓ 正确答案</span>
                              )}
                              {key === mistake.studentAnswer && (
                                <span className="ml-2 text-error text-sm">✗ 你的答案</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {mistake.question.type !== 'choice' && (
                    <div className="bg-background rounded-lg p-4 space-y-3 border border-border">
                      <div>
                        <p className="text-error text-sm mb-1">你的答案:</p>
                        <p className="text-foreground">{mistake.studentAnswer}</p>
                      </div>
                      <div>
                        <p className="text-success text-sm mb-1">正确答案:</p>
                        <p className="text-foreground">{mistake.correctAnswer}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-foreground-secondary text-sm">
                      来源: {mistake.assignmentName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
