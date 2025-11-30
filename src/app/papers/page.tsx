'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Paper, Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export default function PapersPage() {
  const router = useRouter()
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

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
    loadPapers(currentUser.id)
  }

  const loadPapers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPapers(data || [])
    } catch (error) {
      logger.error('加载试卷失败:', { error: error })
      alert('加载试卷失败')
    } finally {
      setLoading(false)
    }
  }

  const deletePaper = async (id: string) => {
    if (!confirm('确定要删除这份试卷吗？')) return

    try {
      const { error } = await supabase
        .from('papers')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPapers(papers.filter(p => p.id !== id))
      alert('删除成功')
    } catch (error) {
      logger.error('删除失败:', { error: error })
      alert('删除失败')
    }
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">我的试卷</h1>
          <button
            onClick={() => router.push('/papers/create')}
            className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-600 transition-colors"
          >
            + 智能组卷
          </button>
        </div>

        {papers.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border">
            <p className="text-foreground-secondary text-lg mb-4">暂无试卷</p>
            <button
              onClick={() => router.push('/papers/create')}
              className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-600 transition-colors"
            >
              开始组卷
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="bg-card rounded-lg p-6 border border-border hover:border-primary-500 transition-colors"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {paper.name}
                </h3>
                <div className="text-foreground-secondary text-sm mb-4">
                  <p>题目数量: {paper.question_ids.length} 道</p>
                  <p>创建时间: {new Date(paper.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/papers/${paper.id}`)}
                    className="flex-1 bg-accent-500 text-white px-4 py-2 rounded hover:bg-accent-600 transition-colors"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => deletePaper(paper.id)}
                    className="bg-error text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
