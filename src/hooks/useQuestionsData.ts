/**
 * 题目数据管理 Hook
 * 统一管理题目列表的加载、筛选和搜索逻辑
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, Question } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export type QuestionRecord = Question & {
  knowledge_points?: string[]
  tags?: string[]
  image_url?: string | null
  analysis_content?: string | null
  is_public?: boolean
}

export interface QuestionFilter {
  type?: string
  difficulty?: string
}

interface UseQuestionsDataParams {
  profile: Profile | null
  filter: QuestionFilter
  searchText: string
}

export function useQuestionsData({ profile, filter, searchText }: UseQuestionsDataParams) {
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadQuestions = useCallback(async () => {
    if (!profile) {
      setQuestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase.from('questions').select('*').order('created_at', { ascending: false })

      // 应用筛选条件
      if (filter.type) {
        query = query.eq('type', filter.type)
      }
      if (filter.difficulty) {
        query = query.eq('difficulty', filter.difficulty)
      }

      // 应用搜索条件
      if (searchText.trim()) {
        // 清理搜索关键词：移除所有特殊字符，只保留字母、数字、中文和空格
        const keyword = searchText.trim().replace(/[^\w\s\u4e00-\u9fa5]/g, '')
        if (keyword) {
          // 使用 Supabase 的参数化查询，避免注入风险
          query = query.or(`content.ilike.%${keyword}%,answer.ilike.%${keyword}%`)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setQuestions((data as QuestionRecord[]) || [])
    } catch (error) {
      logger.error('Failed to load questions', { error, filter, searchText })
      setQuestions([])
      throw error
    } finally {
      setLoading(false)
    }
  }, [profile, filter, searchText])

  // 自动加载数据
  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  return {
    questions,
    loading,
    reload: loadQuestions,
  }
}
