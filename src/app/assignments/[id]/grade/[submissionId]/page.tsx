'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question, Submission } from '@/lib/supabase'
import { logger } from '@/lib/logger'
interface SubmissionWithDetails extends Submission {
  student_name: string
  assignment_name: string
}

// 纯函数：移到组件外部
function getQuestionTypeName(type: string) {
  const typeMap: Record<string, string> = {
    'choice': '选择题',
    'fill': '填空题',
    'essay': '解答题'
  }
  return typeMap[type] || type
}

function getDifficultyName(difficulty: string) {
  const diffMap: Record<string, string> = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return diffMap[difficulty] || difficulty
}

function isAnswerCorrect(question: Question, studentAnswer: any) {
  if (!studentAnswer) return false

  // 对于选择题和填空题，进行简单的字符串比较
  if (question.type === 'choice' || question.type === 'fill') {
    return String(studentAnswer).trim().toLowerCase() === String(question.answer).trim().toLowerCase()
  }

  // 解答题无法自动判断
  return null
}

export default function GradeSubmissionPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string
  const submissionId = params.submissionId as string

  const [, setUser] = useState<any>(null)
  const [submission, setSubmission] = useState<SubmissionWithDetails | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [score, setScore] = useState<number | string>('')
  const [error, setError] = useState<string | null>(null)

  const checkUserAndLoadData = useCallback(async (mounted: { current: boolean }) => {
    try {
      if (!mounted.current) return
      setLoading(true)
      setError(null)

      const currentUser = await getCurrentUser()
      if (!mounted.current) return

      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      // 获取提交记录
      const { data: subData, error: subError } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles!submissions_student_id_fkey(name),
          assignments(name)
        `)
        .eq('id', submissionId)
        .single()

      if (!mounted.current) return
      if (subError) {
        logger.error('加载提交记录失败:', { error: subError })
        setError(`加载提交记录失败: ${subError.message}`)
        return
      }

      if (!subData) {
        setError('未找到提交记录')
        return
      }

      const submissionWithDetails: SubmissionWithDetails = {
        ...subData,
        student_name: (subData as any).profiles?.name || '未知学生',
        assignment_name: (subData as any).assignments?.name || '未知作业'
      }

      setSubmission(submissionWithDetails)
      setScore(submissionWithDetails.score !== null && submissionWithDetails.score !== undefined ? submissionWithDetails.score : '')

      // 获取作业对应的试卷和题目
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('paper_id')
        .eq('id', assignmentId)
        .single()

      if (!mounted.current) return
      if (assignmentError) {
        logger.error('加载作业信息失败:', { error: assignmentError })
        setError(`加载作业信息失败: ${assignmentError.message}`)
        return
      }

      const { data: paperData, error: paperError } = await supabase
        .from('papers')
        .select('question_ids')
        .eq('id', assignmentData.paper_id)
        .single()

      if (!mounted.current) return
      if (paperError) {
        logger.error('加载试卷信息失败:', { error: paperError })
        setError(`加载试卷信息失败: ${paperError.message}`)
        return
      }

      // 获取所有题目
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', paperData.question_ids)

      if (!mounted.current) return
      if (questionsError) {
        logger.error('加载题目失败:', { error: questionsError })
        setError(`加载题目失败: ${questionsError.message}`)
        return
      }

      // 按照试卷中的顺序排列题目
      const orderedQuestions = paperData.question_ids
        .map((id: string) => questionsData?.find((q: Question) => q.id === id))
        .filter((q: Question | undefined): q is Question => q !== undefined)

      setQuestions(orderedQuestions)
    } catch (err: any) {
      if (!mounted.current) return
      logger.error('加载数据失败:', { error: err })
      setError('加载数据时发生未知错误')
    } finally {
      if (mounted.current) {
        setLoading(false)
      }
    }
  }, [assignmentId, submissionId, router])

  useEffect(() => {
    const mountedRef = { current: true }

    checkUserAndLoadData(mountedRef)

    return () => {
      mountedRef.current = false
    }
  }, [checkUserAndLoadData])

  const handleSaveScore = useCallback(async () => {
    if (score === '' || score === null) {
      setError('请输入分数')
      return
    }

    const numScore = typeof score === 'string' ? parseFloat(score) : score
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      setError('请输入0-100之间的有效分数')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ score: numScore })
        .eq('id', submissionId)

      if (updateError) {
        logger.error('保存分数失败:', { error: updateError })
        setError(`保存失败: ${updateError.message}`)
        return
      }

      router.push(`/assignments/${assignmentId}`)
    } catch (err: any) {
      logger.error('保存分数失败:', { error: err })
      setError('保存分数时发生未知错误')
    } finally {
      setSaving(false)
    }
  }, [score, submissionId, assignmentId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-secondary">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-error/10 border border-error/50 rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-error mb-2">操作失败</h3>
                <p className="text-error/80">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-accent-500 text-white px-4 py-2 rounded-lg hover:bg-accent-500-hover transition-colors"
                >
                  重试
                </button>
                <button
                  onClick={() => router.push(`/assignments/${assignmentId}`)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  返回
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-secondary">未找到提交记录</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* 错误提示（浮动显示） */}
        {error && (
          <div className="bg-error/10 border border-error/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <p className="text-error">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-error hover:text-error/80"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 头部信息 */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">批改作业</h1>
              <p className="text-secondary">
                作业：{submission.assignment_name}
              </p>
              <p className="text-secondary">
                学生：{submission.student_name}
              </p>
              <p className="text-secondary text-sm">
                提交时间：{new Date(submission.submitted_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => router.push(`/assignments/${assignmentId}`)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              返回
            </button>
          </div>

          {/* 打分区域 */}
          <div className="border-t border-gray-700 pt-4 mt-4">
            <div className="flex items-center gap-4">
              <label className="text-white font-semibold">总分：</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="bg-background border border-gray-700 rounded px-4 py-2 text-white w-32 focus:outline-none focus:border-primary"
                placeholder="0-100"
              />
              <span className="text-secondary">分</span>
              <button
                onClick={handleSaveScore}
                disabled={saving}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 ml-auto"
              >
                {saving ? '保存中...' : '保存分数'}
              </button>
            </div>
          </div>
        </div>

        {/* 题目列表 */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const studentAnswer = submission.answers[question.id]
            const correctness = isAnswerCorrect(question, studentAnswer)

            return (
              <div key={question.id} className="bg-card rounded-lg p-6">
                {/* 题目标题 */}
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-white font-bold text-lg">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {getQuestionTypeName(question.type)}
                      </span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {getDifficultyName(question.difficulty)}
                      </span>
                      {correctness !== null && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          correctness
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {correctness ? '✓ 正确' : '✗ 错误'}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-lg">{question.content}</p>
                  </div>
                </div>

                {/* 选项（如果是选择题） */}
                {question.type === 'choice' && question.options && (
                  <div className="ml-8 mb-4 space-y-2">
                    {Object.entries(question.options).map(([key, value]) => (
                      <div
                        key={key}
                        className={`p-3 rounded ${
                          String(studentAnswer) === key
                            ? String(question.answer) === key
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-red-500/10 border border-red-500/30'
                            : String(question.answer) === key
                              ? 'bg-blue-500/10 border border-blue-500/30'
                              : 'bg-gray-800/50'
                        }`}
                      >
                        <span className="text-secondary">{key}. </span>
                        <span className="text-white">{value}</span>
                        {String(studentAnswer) === key && (
                          <span className="text-secondary ml-2">(学生选择)</span>
                        )}
                        {String(question.answer) === key && (
                          <span className="text-green-500 ml-2">(正确答案)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 学生答案 */}
                <div className="ml-8 mb-3">
                  <p className="text-secondary text-sm mb-1">学生答案：</p>
                  <div className="bg-background p-3 rounded">
                    <p className="text-white whitespace-pre-wrap">
                      {studentAnswer || <span className="text-secondary italic">未作答</span>}
                    </p>
                  </div>
                </div>

                {/* 正确答案 */}
                {question.type !== 'choice' && (
                  <div className="ml-8 mb-3">
                    <p className="text-secondary text-sm mb-1">正确答案：</p>
                    <div className="bg-green-500/10 border border-green-500/30 p-3 rounded">
                      <p className="text-white whitespace-pre-wrap">{question.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 底部操作栏 */}
        <div className="mt-6 flex justify-between items-center bg-card rounded-lg p-4">
          <button
            onClick={() => router.push(`/assignments/${assignmentId}`)}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            返回作业详情
          </button>
          <button
            onClick={handleSaveScore}
            disabled={saving}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存分数'}
          </button>
        </div>
      </div>
    </div>
  )
}
