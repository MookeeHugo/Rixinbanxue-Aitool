'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question } from '@/lib/supabase'

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

  useEffect(() => {
    loadMistakes()
  }, [])

  const loadMistakes = async () => {
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
      console.error('加载错题失败:', error)
      alert('加载错题失败')
    } finally {
      setLoading(false)
    }
  }

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
        <p className="text-secondary">加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">我的错题本</h1>
          <div className="text-secondary">
            共 {mistakes.length} 道错题
          </div>
        </div>

        {mistakes.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-white text-xl mb-2">太棒了！暂无错题</p>
            <p className="text-secondary">继续保持，加油！</p>
          </div>
        ) : (
          <>
            {/* 知识点统计 */}
            <div className="bg-card rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">知识点分布</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {knowledgeStats.map((stat) => (
                  <div
                    key={stat.name}
                    className="bg-background rounded-lg p-4 text-center"
                  >
                    <p className="text-secondary text-sm mb-1">{stat.name}</p>
                    <p className="text-primary text-2xl font-bold">{stat.count}</p>
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
                      ? 'bg-primary text-white'
                      : 'bg-card text-secondary hover:bg-gray-800'
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
                        ? 'bg-primary text-white'
                        : 'bg-card text-secondary hover:bg-gray-800'
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
                <div key={`${mistake.questionId}-${index}`} className="bg-card rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded">
                        错题
                      </span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {mistake.question.type === 'choice' ? '选择题' :
                         mistake.question.type === 'fill' ? '填空题' : '解答题'}
                      </span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {mistake.knowledgePoint}
                      </span>
                    </div>
                    <span className="text-secondary text-sm">
                      {new Date(mistake.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-white text-lg mb-2">{mistake.question.content}</p>
                    {mistake.question.type === 'choice' && mistake.question.options && (
                      <div className="space-y-2 mt-3">
                        {Object.entries(mistake.question.options).map(([key, value]) => (
                          <div
                            key={key}
                            className={`p-3 rounded ${
                              key === mistake.correctAnswer
                                ? 'bg-green-500/10 border border-green-500/30'
                                : key === mistake.studentAnswer
                                ? 'bg-red-500/10 border border-red-500/30'
                                : 'bg-background'
                            }`}
                          >
                            <span className="text-white">
                              {key}. {value}
                              {key === mistake.correctAnswer && (
                                <span className="ml-2 text-green-500 text-sm">✓ 正确答案</span>
                              )}
                              {key === mistake.studentAnswer && (
                                <span className="ml-2 text-red-500 text-sm">✗ 你的答案</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {mistake.question.type !== 'choice' && (
                    <div className="bg-background rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-red-500 text-sm mb-1">你的答案:</p>
                        <p className="text-white">{mistake.studentAnswer}</p>
                      </div>
                      <div>
                        <p className="text-green-500 text-sm mb-1">正确答案:</p>
                        <p className="text-white">{mistake.correctAnswer}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-secondary text-sm">
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
