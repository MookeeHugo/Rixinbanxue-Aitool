'use server'

/**
 * 标签系统 Server Actions
 *
 * 提供标签的增删改查、批量操作、AI推荐等功能
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type {
  TagCategory,
  TagSubcategory,
  Tag,
  QuestionTag,
  TagTree,
  CreateTagRequest,
  BatchTagRequest,
  AITagRecommendation
} from '@/lib/tags'

// 通用响应类型
interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 创建认证的 Supabase 客户端
 */
async function createAuthenticatedClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component 中忽略
          }
        },
      },
    }
  )
}

/**
 * 获取所有标签分类和标签（树形结构）
 */
export async function getTagTree(): Promise<ActionResult<TagTree[]>> {
  try {
    const supabase = await createAuthenticatedClient()

    // 获取所有分类
    const { data: categories, error: catError } = await supabase
      .from('tag_categories')
      .select('*')
      .order('sort_order')

    if (catError) throw catError

    // 获取所有二级分类
    const { data: subcategories, error: subError } = await supabase
      .from('tag_subcategories')
      .select('*')
      .order('sort_order')

    if (subError) throw subError

    // 获取所有标签
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })

    if (tagError) throw tagError

    // 构建树形结构
    const tree: TagTree[] = categories.map(cat => {
      const catSubcategories = subcategories.filter(sc => sc.category_id === cat.id)
      const catTags = tags.filter(t => t.category_id === cat.id)

      // 按二级分类分组
      const subcategoryGroups = catSubcategories.map(sc => ({
        subcategory: {
          id: sc.id,
          categoryId: sc.category_id,
          name: sc.name,
          displayName: sc.display_name,
          sortOrder: sc.sort_order
        } as TagSubcategory,
        tags: catTags
          .filter(t => t.subcategory_id === sc.id)
          .map(t => ({
            id: t.id,
            categoryId: t.category_id,
            subcategoryId: t.subcategory_id,
            name: t.name,
            displayName: t.display_name,
            usageCount: t.usage_count,
            isPreset: t.is_preset,
            createdBy: t.created_by
          } as Tag))
      }))

      // 无二级分类的标签
      const unclassifiedTags = catTags
        .filter(t => !t.subcategory_id)
        .map(t => ({
          id: t.id,
          categoryId: t.category_id,
          subcategoryId: null,
          name: t.name,
          displayName: t.display_name,
          usageCount: t.usage_count,
          isPreset: t.is_preset,
          createdBy: t.created_by
        } as Tag))

      if (unclassifiedTags.length > 0) {
        subcategoryGroups.push({
          subcategory: null as unknown as TagSubcategory,
          tags: unclassifiedTags
        })
      }

      return {
        category: {
          id: cat.id,
          name: cat.name,
          displayName: cat.display_name,
          color: cat.color,
          icon: cat.icon,
          isRequired: cat.is_required,
          sortOrder: cat.sort_order
        } as TagCategory,
        subcategories: subcategoryGroups
      }
    })

    return { success: true, data: tree }
  } catch (error) {
    console.error('获取标签树失败:', error)
    return { success: false, error: '获取标签失败' }
  }
}

/**
 * 获取用户常用标签
 */
export async function getFrequentTags(limit = 10): Promise<ActionResult<Tag[]>> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }

    const { data, error } = await supabase
      .from('user_frequent_tags')
      .select(`
        tag_id,
        usage_count,
        tags (
          id,
          category_id,
          subcategory_id,
          name,
          display_name,
          usage_count,
          is_preset
        )
      `)
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error

    const tags: Tag[] = data
      .filter(item => item.tags)
      .map(item => {
        const t = item.tags as any
        return {
          id: t.id,
          categoryId: t.category_id,
          subcategoryId: t.subcategory_id,
          name: t.name,
          displayName: t.display_name,
          usageCount: t.usage_count,
          isPreset: t.is_preset
        }
      })

    return { success: true, data: tags }
  } catch (error) {
    console.error('获取常用标签失败:', error)
    return { success: false, error: '获取常用标签失败' }
  }
}

/**
 * 获取题目的标签
 */
export async function getQuestionTags(
  questionId: string,
  questionTable: 'parsed_questions' | 'questions'
): Promise<ActionResult<QuestionTag[]>> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data, error } = await supabase
      .from('question_tags')
      .select(`
        id,
        question_id,
        question_table,
        tag_id,
        source,
        confidence,
        created_at,
        tags (
          id,
          category_id,
          subcategory_id,
          name,
          display_name,
          usage_count,
          is_preset
        )
      `)
      .eq('question_id', questionId)
      .eq('question_table', questionTable)

    if (error) throw error

    const questionTags: QuestionTag[] = data.map(item => ({
      id: item.id,
      questionId: item.question_id,
      questionTable: item.question_table as 'parsed_questions' | 'questions',
      tagId: item.tag_id,
      source: item.source as 'manual' | 'ai' | 'batch',
      confidence: item.confidence,
      createdAt: item.created_at,
      tag: item.tags ? {
        id: (item.tags as any).id,
        categoryId: (item.tags as any).category_id,
        subcategoryId: (item.tags as any).subcategory_id,
        name: (item.tags as any).name,
        displayName: (item.tags as any).display_name,
        usageCount: (item.tags as any).usage_count,
        isPreset: (item.tags as any).is_preset
      } : undefined
    }))

    return { success: true, data: questionTags }
  } catch (error) {
    console.error('获取题目标签失败:', error)
    return { success: false, error: '获取题目标签失败' }
  }
}

/**
 * 为题目添加标签
 */
export async function addTagToQuestion(params: {
  questionId: string
  questionTable: 'parsed_questions' | 'questions'
  tagId: string
  source?: 'manual' | 'ai' | 'batch'
  confidence?: number
}): Promise<ActionResult<QuestionTag>> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }

    // 添加标签关联
    const { data, error } = await supabase
      .from('question_tags')
      .upsert({
        question_id: params.questionId,
        question_table: params.questionTable,
        tag_id: params.tagId,
        source: params.source || 'manual',
        confidence: params.confidence
      }, {
        onConflict: 'question_id,question_table,tag_id'
      })
      .select()
      .single()

    if (error) throw error

    // 更新标签使用次数
    await supabase.rpc('increment_tag_usage', { p_tag_id: params.tagId })

    // 更新用户常用标签
    await supabase.rpc('update_user_frequent_tag', {
      p_user_id: user.id,
      p_tag_id: params.tagId
    })

    return {
      success: true,
      data: {
        id: data.id,
        questionId: data.question_id,
        questionTable: data.question_table,
        tagId: data.tag_id,
        source: data.source,
        confidence: data.confidence,
        createdAt: data.created_at
      }
    }
  } catch (error) {
    console.error('添加标签失败:', error)
    return { success: false, error: '添加标签失败' }
  }
}

/**
 * 从题目移除标签
 */
export async function removeTagFromQuestion(params: {
  questionId: string
  questionTable: 'parsed_questions' | 'questions'
  tagId: string
}): Promise<ActionResult> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }

    const { error } = await supabase
      .from('question_tags')
      .delete()
      .eq('question_id', params.questionId)
      .eq('question_table', params.questionTable)
      .eq('tag_id', params.tagId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('移除标签失败:', error)
    return { success: false, error: '移除标签失败' }
  }
}

/**
 * 批量为题目添加标签
 */
export async function batchAddTags(params: BatchTagRequest): Promise<ActionResult<{ successCount: number }>> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }

    // 构建批量插入数据
    const records = params.questionIds.flatMap(questionId =>
      params.tagIds.map(tagId => ({
        question_id: questionId,
        question_table: params.questionTable,
        tag_id: tagId,
        source: params.source || 'batch'
      }))
    )

    const { error, count } = await supabase
      .from('question_tags')
      .upsert(records, {
        onConflict: 'question_id,question_table,tag_id',
        count: 'exact'
      })

    if (error) throw error

    // 更新标签使用次数
    for (const tagId of params.tagIds) {
      await supabase.rpc('increment_tag_usage', { p_tag_id: tagId })
    }

    return { success: true, data: { successCount: count || 0 } }
  } catch (error) {
    console.error('批量添加标签失败:', error)
    return { success: false, error: '批量添加标签失败' }
  }
}

/**
 * 创建自定义标签
 */
export async function createCustomTag(params: CreateTagRequest): Promise<ActionResult<Tag>> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }

    // 标准化标签名称
    const normalizedName = params.name.toLowerCase().replace(/\s+/g, '_')

    const { data, error } = await supabase
      .from('tags')
      .insert({
        category_id: params.categoryId,
        subcategory_id: params.subcategoryId || null,
        name: normalizedName,
        display_name: params.displayName,
        is_preset: false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: '标签已存在' }
      }
      throw error
    }

    return {
      success: true,
      data: {
        id: data.id,
        categoryId: data.category_id,
        subcategoryId: data.subcategory_id,
        name: data.name,
        displayName: data.display_name,
        usageCount: 0,
        isPreset: false,
        createdBy: user.id
      }
    }
  } catch (error) {
    console.error('创建标签失败:', error)
    return { success: false, error: '创建标签失败' }
  }
}

/**
 * 搜索标签
 */
export async function searchTags(query: string, limit = 20): Promise<ActionResult<Tag[]>> {
  try {
    const supabase = await createAuthenticatedClient()

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error

    const tags: Tag[] = data.map(t => ({
      id: t.id,
      categoryId: t.category_id,
      subcategoryId: t.subcategory_id,
      name: t.name,
      displayName: t.display_name,
      usageCount: t.usage_count,
      isPreset: t.is_preset,
      createdBy: t.created_by
    }))

    return { success: true, data: tags }
  } catch (error) {
    console.error('搜索标签失败:', error)
    return { success: false, error: '搜索标签失败' }
  }
}

/**
 * AI推荐标签（基于题目内容）
 */
export async function getAIRecommendedTags(
  questionId: string,
  questionTable: 'parsed_questions' | 'questions'
): Promise<ActionResult<AITagRecommendation[]>> {
  try {
    const supabase = await createAuthenticatedClient()

    // 获取题目内容
    const { data: question, error: questionError } = await supabase
      .from(questionTable)
      .select('content, type')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return { success: false, error: '题目不存在' }
    }

    // 获取知识点标签用于匹配
    const { data: knowledgeTags, error: tagError } = await supabase
      .from('tags')
      .select(`
        id,
        name,
        display_name,
        tag_categories!inner (name)
      `)
      .eq('tag_categories.name', 'knowledge')

    if (tagError || !knowledgeTags) {
      return { success: false, error: '获取标签失败' }
    }

    // 调用 Gemini 进行标签推荐
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
分析以下数学题目，从给定的知识点标签中选择最相关的1-3个。

题目内容：
${question.content}

可选标签：
${knowledgeTags.map(t => `- ${t.name}: ${t.display_name}`).join('\n')}

请以JSON格式返回结果，不要有任何其他文字：
{
  "tags": [
    { "name": "标签name", "confidence": 0.95, "reason": "推荐理由" }
  ]
}
`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return { success: false, error: 'AI 响应格式错误' }
    }

    const aiResult = JSON.parse(jsonMatch[0])

    const recommendations: AITagRecommendation[] = aiResult.tags
      .map((t: { name: string; confidence: number; reason?: string }) => {
        const matchedTag = knowledgeTags.find(kt => kt.name === t.name)
        return matchedTag ? {
          tagId: matchedTag.id,
          displayName: matchedTag.display_name,
          confidence: t.confidence,
          reason: t.reason
        } : null
      })
      .filter(Boolean)

    return { success: true, data: recommendations }
  } catch (error) {
    console.error('AI推荐标签失败:', error)
    return { success: false, error: 'AI推荐失败' }
  }
}
