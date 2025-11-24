'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Paper, Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export default function PaperDetailPage() {
  const router = useRouter()
  const params = useParams()
  const paperId = params.id as string

  const [paper, setPaper] = useState<Paper | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndLoadPaper()
  }, [paperId])

  const checkUserAndLoadPaper = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    loadPaper()
  }

  const loadPaper = async () => {
    try {
      // 加载试卷信息
      const { data: paperData, error: paperError } = await supabase
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single()

      if (paperError) throw paperError
      setPaper(paperData)

      // 加载题目详情
      if (paperData.question_ids && paperData.question_ids.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .in('id', paperData.question_ids)

        if (questionsError) throw questionsError

        // 按照 question_ids 的顺序排序
        const orderedQuestions = paperData.question_ids
          .map((id: string) => questionsData.find(q => q.id === id))
          .filter(Boolean) as Question[]

        setQuestions(orderedQuestions)
      }
    } catch (error) {
      logger.error('加载试卷失败:', { error: error })
      alert('加载试卷失败')
      router.push('/papers')
    } finally {
      setLoading(false)
    }
  }

  const deletePaper = async () => {
    if (!confirm('确定要删除这份试卷吗？')) return

    try {
      const { error } = await supabase
        .from('papers')
        .delete()
        .eq('id', paperId)

      if (error) throw error

      alert('删除成功')
      router.push('/papers')
    } catch (error) {
      logger.error('删除失败:', { error: error })
      alert('删除失败')
    }
  }

  const printPaper = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">加载中...</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-secondary">试卷不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-foreground">试卷详情</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/papers')}
              className="bg-secondary text-foreground px-6 py-2 rounded-lg hover:bg-border-medium transition-colors"
            >
              返回列表
            </button>
            <button
              onClick={printPaper}
              className="bg-brand-red text-white px-6 py-2 rounded-lg hover:bg-brand-red-hover transition-colors"
            >
              打印试卷
            </button>
            <button
              onClick={deletePaper}
              className="bg-error text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              删除
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg p-8 border border-border print:bg-white print:text-black">
          {/* 试卷头部 */}
          <div className="text-center mb-8 print:mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4 print:text-black print:text-4xl">
              {paper.name}
            </h2>
            <div className="flex justify-between text-foreground-secondary print:text-gray-600 text-sm">
              <div>题目数量: {questions.length} 道</div>
              <div>创建时间: {new Date(paper.created_at).toLocaleDateString()}</div>
            </div>
            <div className="border-t border-border print:border-gray-300 mt-4 pt-4 print:hidden">
              <p className="text-foreground-secondary text-sm">
                姓名:__________ 班级:__________ 学号:__________ 成绩:__________
              </p>
            </div>
          </div>

          {/* 题目列表 */}
          <div className="space-y-8">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="border-b border-border print:border-gray-300 pb-6 last:border-b-0 print:page-break-inside-avoid"
              >
                <div className="flex gap-4">
                  <span className="text-foreground print:text-black font-semibold min-w-[2rem]">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    {/* 题目标签 */}
                    <div className="flex items-center gap-2 mb-3 print:hidden">
                      <span className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded">
                        {question.type === 'choice' ? '选择题' :
                         question.type === 'fill' ? '填空题' : '解答题'}
                      </span>
                      <span className="text-xs bg-secondary text-foreground-secondary px-2 py-1 rounded">
                        {question.difficulty === 'easy' ? '简单' :
                         question.difficulty === 'medium' ? '中等' : '困难'}
                      </span>
                      {question.knowledge_points.length > 0 && (
                        <span className="text-xs text-foreground-secondary">
                          知识点: {question.knowledge_points.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* 题干 */}
                    <p className="text-foreground print:text-black mb-4 text-lg leading-relaxed">
                      {question.content}
                    </p>

                    {/* 选项（选择题） */}
                    {question.type === 'choice' && question.options && (
                      <div className="space-y-2 text-foreground-secondary print:text-gray-700 ml-4">
                        {Object.entries(question.options).map(([key, value]) => (
                          <p key={key} className="leading-relaxed">
                            {key}. {value}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* 答题区域（填空题和解答题） */}
                    {(question.type === 'fill' || question.type === 'essay') && (
                      <div className="mt-4 print:block hidden">
                        <div className="border border-gray-300 rounded p-4 min-h-[100px]">
                          <p className="text-gray-400 text-sm">答题区域</p>
                        </div>
                      </div>
                    )}

                    {/* 答案（仅屏幕显示） */}
                    <div className="mt-4 p-4 bg-background print:hidden rounded-lg">
                      <p className="text-sm text-foreground-secondary mb-1">参考答案:</p>
                      <p className="text-brand-red">{question.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 试卷统计信息 */}
          <div className="mt-12 pt-6 border-t border-border print:border-gray-300 print:hidden">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-background rounded-lg p-4">
                <p className="text-foreground-secondary text-sm">选择题</p>
                <p className="text-foreground text-2xl font-bold">
                  {questions.filter(q => q.type === 'choice').length}
                </p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-foreground-secondary text-sm">填空题</p>
                <p className="text-foreground text-2xl font-bold">
                  {questions.filter(q => q.type === 'fill').length}
                </p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-foreground-secondary text-sm">解答题</p>
                <p className="text-foreground text-2xl font-bold">
                  {questions.filter(q => q.type === 'essay').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:text-gray-600 {
            color: #4B5563 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:border-gray-300 {
            border-color: #D1D5DB !important;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
          }
          .print\\:text-4xl {
            font-size: 2.25rem !important;
          }
          .print\\:mb-12 {
            margin-bottom: 3rem !important;
          }
        }
      `}</style>
    </div>
  )
}
