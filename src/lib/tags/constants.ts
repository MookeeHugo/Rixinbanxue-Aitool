/**
 * 标签系统预设数据
 *
 * 多维度二三级分类体系
 */

import type { TagCategoryName } from './types'

/**
 * 一级分类配置
 */
export const TAG_CATEGORIES: Array<{
  name: TagCategoryName
  displayName: string
  color: string
  icon: string
  isRequired: boolean
  sortOrder: number
}> = [
  { name: 'knowledge', displayName: '知识点', color: '#3B82F6', icon: 'BookOpen', isRequired: true, sortOrder: 1 },
  { name: 'difficulty', displayName: '难度', color: '#F59E0B', icon: 'BarChart', isRequired: true, sortOrder: 2 },
  { name: 'grade', displayName: '年级', color: '#8B5CF6', icon: 'GraduationCap', isRequired: false, sortOrder: 3 },
  { name: 'question_type', displayName: '题型', color: '#10B981', icon: 'FileQuestion', isRequired: false, sortOrder: 4 },
  { name: 'source', displayName: '来源', color: '#EC4899', icon: 'FileText', isRequired: false, sortOrder: 5 },
  { name: 'region', displayName: '地区', color: '#06B6D4', icon: 'MapPin', isRequired: false, sortOrder: 6 },
  { name: 'exam_type', displayName: '考试类型', color: '#EF4444', icon: 'Award', isRequired: false, sortOrder: 7 },
  { name: 'custom', displayName: '自定义', color: '#6B7280', icon: 'Tag', isRequired: false, sortOrder: 8 }
]

/**
 * 二级分类和三级标签预设数据
 */
export const PRESET_TAGS: Record<TagCategoryName, {
  subcategories?: Array<{
    name: string
    displayName: string
    tags: Array<{ name: string; displayName: string }>
  }>
  tags?: Array<{ name: string; displayName: string }>
}> = {
  // 知识点（带二级分类）
  knowledge: {
    subcategories: [
      {
        name: 'numbers_algebra',
        displayName: '数与式',
        tags: [
          { name: 'rational_numbers', displayName: '有理数' },
          { name: 'algebraic_expressions', displayName: '整式的加减' },
          { name: 'fractions', displayName: '分式' },
          { name: 'quadratic_radicals', displayName: '二次根式' }
        ]
      },
      {
        name: 'equations_inequalities',
        displayName: '方程与不等式',
        tags: [
          { name: 'linear_equation', displayName: '一元一次方程' },
          { name: 'system_equations', displayName: '二元一次方程组' },
          { name: 'quadratic_equation', displayName: '一元二次方程' },
          { name: 'fractional_equation', displayName: '分式方程' },
          { name: 'linear_inequality', displayName: '一元一次不等式' },
          { name: 'inequality_system', displayName: '一元一次不等式组' }
        ]
      },
      {
        name: 'functions',
        displayName: '函数',
        tags: [
          { name: 'function_basics', displayName: '函数基础' },
          { name: 'linear_function', displayName: '一次函数' },
          { name: 'inverse_proportional', displayName: '反比例函数' },
          { name: 'quadratic_function', displayName: '二次函数' }
        ]
      },
      {
        name: 'geometry',
        displayName: '几何',
        tags: [
          { name: 'geometry_basics', displayName: '几何图形初步' },
          { name: 'parallel_lines', displayName: '相交线与平行线' },
          { name: 'triangles', displayName: '三角形' },
          { name: 'congruent_triangles', displayName: '全等三角形' },
          { name: 'axisymmetry', displayName: '轴对称' },
          { name: 'pythagorean_theorem', displayName: '勾股定理' },
          { name: 'quadrilaterals', displayName: '四边形' },
          { name: 'similar_triangles', displayName: '相似三角形' },
          { name: 'right_triangle', displayName: '解直角三角形' },
          { name: 'circles', displayName: '圆' },
          { name: 'projection_views', displayName: '投影与视图' }
        ]
      },
      {
        name: 'statistics_probability',
        displayName: '统计与概率',
        tags: [
          { name: 'data_collection', displayName: '数据的收集整理' },
          { name: 'probability_basics', displayName: '概率初步' }
        ]
      }
    ]
  },

  // 难度（无二级分类）
  difficulty: {
    tags: [
      { name: 'easy', displayName: '基础题' },
      { name: 'medium', displayName: '中档题' },
      { name: 'hard', displayName: '压轴题' }
    ]
  },

  // 年级（带二级分类）
  grade: {
    subcategories: [
      {
        name: 'junior_high',
        displayName: '初中',
        tags: [
          { name: 'grade_7_1', displayName: '七年级上' },
          { name: 'grade_7_2', displayName: '七年级下' },
          { name: 'grade_8_1', displayName: '八年级上' },
          { name: 'grade_8_2', displayName: '八年级下' },
          { name: 'grade_9_1', displayName: '九年级上' },
          { name: 'grade_9_2', displayName: '九年级下' }
        ]
      },
      {
        name: 'senior_high',
        displayName: '高中',
        tags: [
          { name: 'grade_10', displayName: '高一' },
          { name: 'grade_11', displayName: '高二' },
          { name: 'grade_12', displayName: '高三' }
        ]
      }
    ]
  },

  // 题型（无二级分类）
  question_type: {
    tags: [
      { name: 'choice', displayName: '选择题' },
      { name: 'fill', displayName: '填空题' },
      { name: 'calculation', displayName: '计算题' },
      { name: 'proof', displayName: '证明题' },
      { name: 'comprehensive', displayName: '综合题' },
      { name: 'application', displayName: '应用题' }
    ]
  },

  // 来源（带二级分类）
  source: {
    subcategories: [
      {
        name: 'real_exam',
        displayName: '真题',
        tags: [
          { name: 'zhongkao', displayName: '中考真题' },
          { name: 'mock_exam', displayName: '模拟考' },
          { name: 'monthly_exam', displayName: '月考' },
          { name: 'midterm', displayName: '期中' },
          { name: 'final_exam', displayName: '期末' }
        ]
      },
      {
        name: 'textbook',
        displayName: '教辅',
        tags: [
          { name: 'textbook_example', displayName: '课本例题' },
          { name: 'workbook', displayName: '练习册' },
          { name: 'competition', displayName: '竞赛题' }
        ]
      }
    ],
    tags: [
      { name: 'self_made', displayName: '自编题' }
    ]
  },

  // 地区（无二级分类）
  region: {
    tags: [
      { name: 'wuhan', displayName: '武汉' },
      { name: 'beijing', displayName: '北京' },
      { name: 'shanghai', displayName: '上海' },
      { name: 'guangzhou', displayName: '广州' },
      { name: 'shenzhen', displayName: '深圳' },
      { name: 'other', displayName: '其他' }
    ]
  },

  // 考试类型（无二级分类）
  exam_type: {
    tags: [
      { name: 'zhongkao_type', displayName: '中考' },
      { name: 'gaokao_type', displayName: '高考' },
      { name: 'competition_type', displayName: '竞赛' },
      { name: 'unit_test', displayName: '单元测试' },
      { name: 'comprehensive_test', displayName: '综合测试' }
    ]
  },

  // 自定义（空，用户自行添加）
  custom: {
    tags: []
  }
}

/**
 * 难度颜色映射
 */
export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  hard: 'bg-red-100 text-red-800 border-red-300'
}

/**
 * 分类图标映射（Lucide icons）
 */
export const CATEGORY_ICONS: Record<TagCategoryName, string> = {
  knowledge: 'BookOpen',
  difficulty: 'BarChart',
  grade: 'GraduationCap',
  question_type: 'FileQuestion',
  source: 'FileText',
  region: 'MapPin',
  exam_type: 'Award',
  custom: 'Tag'
}
