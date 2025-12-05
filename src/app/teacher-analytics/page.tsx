'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
interface ClassStats {
  classId: string
  className: string
  studentCount: number
  assignmentCount: number
  averageScore: number
  submissionRate: number
}

interface StudentPerformance {
  studentId: string
  studentName: string
  studentEmail: string
  totalAssignments: number
  completedAssignments: number
  averageScore: number
  completionRate: number
}

interface KnowledgePointAnalysis {
  name: string
  totalQuestions: number
  averageCorrectRate: number
  studentCount: number
}

export default function TeacherAnalyticsPage() {
  const router = useRouter()
  const [classStats, setClassStats] = useState<ClassStats[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [students, setStudents] = useState<StudentPerformance[]>([])
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState<KnowledgePointAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 获取所有班级
      const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)

      if (!classes || classes.length === 0) {
        setLoading(false)
        return
      }

      const statsPromises = classes.map(async (cls) => {
        // 获取班级的作业
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id')
          .eq('class_id', cls.id)
          .eq('status', 'published')

        const assignmentIds = assignments?.map(a => a.id) || []

        // 获取提交记录
        const { data: submissions } = await supabase
          .from('submissions')
          .select('score')
          .in('assignment_id', assignmentIds)

        // 计算统计
        const studentCount = 0 // 需要 class_students 表支持
        const assignmentCount = assignmentIds.length
        const scores = submissions?.filter(s => s.score !== null).map(s => s.score!) || []
        const averageScore = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0

        const totalPossibleSubmissions = assignmentCount * Math.max(studentCount, 1)
        const submissionRate = totalPossibleSubmissions > 0
          ? (submissions?.length || 0) / totalPossibleSubmissions * 100
          : 0

        return {
          classId: cls.id,
          className: cls.name,
          studentCount,
          assignmentCount,
          averageScore: parseFloat(averageScore.toFixed(1)),
          submissionRate: parseFloat(submissionRate.toFixed(1))
        }
      })

      const stats = await Promise.all(statsPromises)
      setClassStats(stats)

      // 默认选择第一个班级
      if (stats.length > 0) {
        setSelectedClass(stats[0].classId)
      }

    } catch (error) {
      logger.error('加载数据失败:', { error: error })
      alert('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadClassDetails = useCallback(async (classId: string) => {
    try {
      // 获取班级的所有作业
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id,
          papers(question_ids)
        `)
        .eq('class_id', classId)
        .eq('status', 'published')

      if (!assignments || assignments.length === 0) {
        setStudents([])
        setKnowledgeAnalysis([])
        return
      }

      const assignmentIds = assignments.map(a => a.id)

      // 获取所有提交记录
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles(name, email)
        `)
        .in('assignment_id', assignmentIds)

      // 统计学生表现
      const studentMap = new Map<string, {
        name: string
        email: string
        completed: number
        scores: number[]
      }>()

      submissions?.forEach((sub: any) => {
        const studentId = sub.student_id
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            name: sub.profiles?.name || '未知学生',
            email: sub.profiles?.email || '',
            completed: 0,
            scores: []
          })
        }
        const student = studentMap.get(studentId)!
        student.completed++
        if (sub.score !== null) {
          student.scores.push(sub.score)
        }
      })

      const studentPerformance: StudentPerformance[] = Array.from(studentMap.entries()).map(([id, data]) => {
        const avgScore = data.scores.length > 0
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : 0
        return {
          studentId: id,
          studentName: data.name,
          studentEmail: data.email,
          totalAssignments: assignmentIds.length,
          completedAssignments: data.completed,
          averageScore: parseFloat(avgScore.toFixed(1)),
          completionRate: parseFloat(((data.completed / assignmentIds.length) * 100).toFixed(1))
        }
      })

      studentPerformance.sort((a, b) => b.averageScore - a.averageScore)
      setStudents(studentPerformance)

      // 知识点分析
      const knowledgeMap = new Map<string, {
        totalAttempts: number
        correctAttempts: number
        studentSet: Set<string>
      }>()

      // 获取所有题目
      const allQuestionIds = new Set<string>()
      assignments.forEach(a => {
        const questionIds = (a as any).papers?.question_ids || []
        questionIds.forEach((id: string) => allQuestionIds.add(id))
      })

      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .in('id', Array.from(allQuestionIds))

      // 分析每个提交的答题情况
      submissions?.forEach((sub: any) => {
        questions?.forEach((q: Question) => {
          const studentAnswer = sub.answers?.[q.id]
          if (!studentAnswer) return

          const kp = q.knowledge_points?.[0] || '未知知识点'
          if (!knowledgeMap.has(kp)) {
            knowledgeMap.set(kp, {
              totalAttempts: 0,
              correctAttempts: 0,
              studentSet: new Set()
            })
          }

          const stats = knowledgeMap.get(kp)!
          stats.totalAttempts++
          stats.studentSet.add(sub.student_id)
          if (studentAnswer === q.answer) {
            stats.correctAttempts++
          }
        })
      })

      const knowledgeStats: KnowledgePointAnalysis[] = Array.from(knowledgeMap.entries()).map(([name, data]) => ({
        name,
        totalQuestions: data.totalAttempts,
        averageCorrectRate: parseFloat(((data.correctAttempts / data.totalAttempts) * 100).toFixed(1)),
        studentCount: data.studentSet.size
      }))

      knowledgeStats.sort((a, b) => a.averageCorrectRate - b.averageCorrectRate)
      setKnowledgeAnalysis(knowledgeStats)

    } catch (error) {
      logger.error('加载班级详情失败:', { error: error })
    }
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadClassDetails(selectedClass)
    }
  }, [selectedClass, loadClassDetails])

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { text: '优秀', color: 'text-success' }
    if (score >= 80) return { text: '良好', color: 'text-info' }
    if (score >= 70) return { text: '中等', color: 'text-warning' }
    if (score >= 60) return { text: '及格', color: 'text-brand-orange' }
    return { text: '不及格', color: 'text-error' }
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
        <h1 className="text-3xl font-bold text-foreground mb-8">教学分析</h1>

        {classStats.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-foreground text-xl mb-2">暂无数据</p>
            <p className="text-foreground-secondary">创建班级并发布作业后可以查看教学分析</p>
          </div>
        ) : (
          <>
            {/* 班级总览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {classStats.map((stat) => (
                <div
                  key={stat.classId}
                  onClick={() => setSelectedClass(stat.classId)}
                  className={`bg-card rounded-lg p-6 cursor-pointer transition-all border ${
                    selectedClass === stat.classId
                      ? 'ring-2 ring-brand-red border-primary-500'
                      : 'border-border hover:bg-border-light'
                  }`}
                >
                  <h3 className="text-foreground font-semibold text-lg mb-4">{stat.className}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground-secondary">作业数:</span>
                      <span className="text-foreground">{stat.assignmentCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground-secondary">平均分:</span>
                      <span className={getPerformanceLevel(stat.averageScore).color}>
                        {stat.averageScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedClass && (
              <>
                {/* 学生表现 */}
                <div className="bg-card rounded-lg p-6 mb-8 border border-border">
                  <h2 className="text-xl font-semibold text-foreground mb-6">学生表现</h2>
                  {students.length === 0 ? (
                    <p className="text-foreground-secondary text-center py-8">暂无学生提交数据</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-foreground-secondary font-semibold py-3 px-4">排名</th>
                            <th className="text-left text-foreground-secondary font-semibold py-3 px-4">学生姓名</th>
                            <th className="text-left text-foreground-secondary font-semibold py-3 px-4">完成率</th>
                            <th className="text-left text-foreground-secondary font-semibold py-3 px-4">平均分</th>
                            <th className="text-left text-foreground-secondary font-semibold py-3 px-4">评价</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, index) => {
                            const level = getPerformanceLevel(student.averageScore)
                            return (
                              <tr key={student.studentId} className="border-b border-border">
                                <td className="py-4 px-4">
                                  <span className={`font-bold ${
                                    index === 0 ? 'text-warning' :
                                    index === 1 ? 'text-foreground-secondary' :
                                    index === 2 ? 'text-brand-orange' :
                                    'text-foreground'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <div>
                                    <p className="text-foreground font-semibold">{student.studentName}</p>
                                    <p className="text-foreground-secondary text-sm">{student.studentEmail}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div>
                                    <p className="text-foreground">{student.completionRate}%</p>
                                    <p className="text-foreground-secondary text-sm">
                                      {student.completedAssignments}/{student.totalAssignments}
                                    </p>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-foreground text-lg font-bold">
                                    {student.averageScore.toFixed(1)}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`${level.color} font-semibold`}>
                                    {level.text}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 知识点分析 */}
                <div className="bg-card rounded-lg p-6 border border-border">
                  <h2 className="text-xl font-semibold text-foreground mb-6">知识点掌握情况</h2>
                  {knowledgeAnalysis.length === 0 ? (
                    <p className="text-foreground-secondary text-center py-8">暂无知识点数据</p>
                  ) : (
                    <div className="space-y-4">
                      {knowledgeAnalysis.map((kp) => (
                        <div key={kp.name} className="bg-background rounded-lg p-5 border border-border">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="text-foreground font-semibold text-lg">{kp.name}</h3>
                              <p className="text-foreground-secondary text-sm">
                                {kp.studentCount} 名学生 · {kp.totalQuestions} 次作答
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${
                                kp.averageCorrectRate >= 80 ? 'text-success' :
                                kp.averageCorrectRate >= 60 ? 'text-warning' :
                                'text-error'
                              }`}>
                                {kp.averageCorrectRate}%
                              </p>
                              <p className="text-foreground-secondary text-sm">平均正确率</p>
                            </div>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                kp.averageCorrectRate >= 80 ? 'bg-success' :
                                kp.averageCorrectRate >= 60 ? 'bg-warning' :
                                'bg-error'
                              }`}
                              style={{ width: `${kp.averageCorrectRate}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* 教学建议 */}
                      <div className="mt-6 bg-info/10 border border-info/30 rounded-lg p-4">
                        <p className="text-info font-semibold mb-2">教学建议:</p>
                        <ul className="text-foreground space-y-1 ml-4">
                          {knowledgeAnalysis.filter(kp => kp.averageCorrectRate < 70).length > 0 ? (
                            <>
                              <li className="list-disc">
                                重点讲解正确率低于70%的知识点: {
                                  knowledgeAnalysis
                                    .filter(kp => kp.averageCorrectRate < 70)
                                    .map(kp => kp.name)
                                    .join('、')
                                }
                              </li>
                              <li className="list-disc">增加相关知识点的练习题量</li>
                              <li className="list-disc">关注平均分较低的学生，提供个别辅导</li>
                            </>
                          ) : (
                            <li className="list-disc">整体掌握情况良好，可以适当增加难度</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
