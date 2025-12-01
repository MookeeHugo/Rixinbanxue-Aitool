/**
 * 标签系统类型定义
 *
 * 支持多维度二三级分类：
 * - 一级分类（TagCategory）
 * - 二级分类（TagSubcategory）
 * - 三级标签（Tag）
 */

// 一级分类名称
export type TagCategoryName =
  | 'knowledge'      // 知识点
  | 'difficulty'     // 难度
  | 'grade'          // 年级
  | 'question_type'  // 题型
  | 'source'         // 来源
  | 'region'         // 地区
  | 'exam_type'      // 考试类型
  | 'custom'         // 自定义

// 标签来源
export type TagSource = 'manual' | 'ai' | 'batch'

/**
 * 一级分类
 */
export interface TagCategory {
  id: string
  name: TagCategoryName
  displayName: string
  color: string
  icon: string
  isRequired: boolean
  sortOrder: number
  createdAt?: string
}

/**
 * 二级分类（可选）
 */
export interface TagSubcategory {
  id: string
  categoryId: string
  name: string
  displayName: string
  sortOrder: number
  category?: TagCategory
}

/**
 * 三级标签
 */
export interface Tag {
  id: string
  categoryId: string
  subcategoryId?: string | null
  name: string
  displayName: string
  usageCount: number
  isPreset: boolean
  createdBy?: string | null
  createdAt?: string
  // 关联数据
  category?: TagCategory
  subcategory?: TagSubcategory
}

/**
 * 题目-标签关联
 */
export interface QuestionTag {
  id: string
  questionId: string
  questionTable: 'parsed_questions' | 'questions'
  tagId: string
  source: TagSource
  confidence?: number | null
  createdAt?: string
  // 关联数据
  tag?: Tag
}

/**
 * 用户常用标签
 */
export interface UserFrequentTag {
  id: string
  userId: string
  tagId: string
  usageCount: number
  lastUsedAt: string
  // 关联数据
  tag?: Tag
}

/**
 * 标签树结构（用于前端展示）
 */
export interface TagTree {
  category: TagCategory
  subcategories: {
    subcategory: TagSubcategory | null
    tags: Tag[]
  }[]
}

/**
 * 标签选择状态
 */
export interface TagSelectionState {
  selectedTags: QuestionTag[]
  frequentTags: Tag[]
  aiRecommendedTags: Array<{
    tag: Tag
    confidence: number
  }>
}

/**
 * 批量打标签请求
 */
export interface BatchTagRequest {
  questionIds: string[]
  questionTable: 'parsed_questions' | 'questions'
  tagIds: string[]
  source?: TagSource
}

/**
 * 创建自定义标签请求
 */
export interface CreateTagRequest {
  categoryId: string
  subcategoryId?: string
  name: string
  displayName: string
}

/**
 * AI标签推荐结果
 */
export interface AITagRecommendation {
  tagId: string
  displayName: string
  confidence: number
  reason?: string
}

/**
 * 标签搜索结果
 */
export interface TagSearchResult {
  tag: Tag
  matchType: 'name' | 'displayName' | 'category'
  score: number
}
