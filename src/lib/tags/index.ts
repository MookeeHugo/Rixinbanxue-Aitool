/**
 * 标签系统模块
 *
 * 提供多维度二三级分类的标签管理功能
 */

// 类型导出
export type {
  TagCategoryName,
  TagSource,
  TagCategory,
  TagSubcategory,
  Tag,
  QuestionTag,
  UserFrequentTag,
  TagTree,
  TagSelectionState,
  BatchTagRequest,
  CreateTagRequest,
  AITagRecommendation,
  TagSearchResult
} from './types'

// 常量导出
export {
  TAG_CATEGORIES,
  PRESET_TAGS,
  DIFFICULTY_COLORS,
  CATEGORY_ICONS
} from './constants'
