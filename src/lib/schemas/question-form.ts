import { z } from 'zod'

/**
 * 题目类型
 */
export const questionTypeSchema = z.enum(['choice', 'fill', 'essay'])
export type QuestionType = z.infer<typeof questionTypeSchema>

/**
 * 题目难度
 */
export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export type Difficulty = z.infer<typeof difficultySchema>

/**
 * 题目表单验证 Schema
 */
export const questionFormSchema = z.object({
  // 基础字段
  type: questionTypeSchema,
  content: z.string().min(1, '请输入题干'),
  answer: z.string().min(1, '请输入答案'),
  analysis: z.string(),
  difficulty: difficultySchema,

  // 选择题选项（仅在 type='choice' 时需要）
  optionA: z.string(),
  optionB: z.string(),
  optionC: z.string(),
  optionD: z.string(),

  // 来源信息
  province: z.string(),
  year: z.string(),
  source: z.string(),

  // 可见性
  is_public: z.boolean(),
})

export type QuestionFormValues = z.infer<typeof questionFormSchema>
