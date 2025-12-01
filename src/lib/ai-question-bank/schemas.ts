/**
 * AI题库系统 - Zod验证模式
 * @description 用于验证Qwen3-VL-Flash返回的JSON格式
 */

import { z } from 'zod';

/**
 * 题目类型验证
 */
export const QuestionTypeSchema = z.enum(['choice', 'fill', 'essay', 'proof']);

/**
 * 难度等级验证
 */
export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']);

/**
 * 题目标签验证
 */
export const QuestionTagSchema = z.object({
  knowledge: z.array(z.string()).min(1, '至少需要一个知识点'),
  difficulty: DifficultyLevelSchema,
  type: z.string().min(1, '题型不能为空')
});

export const ImageRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
});

/**
 * 题目图片占位符验证
 */
export const QuestionImagePlaceholderSchema = z.object({
  placeholder: z
    .string()
    .min(1, '占位符不能为空')
    .regex(/<<IMG_[^>]+>>/, '必须符合 <<IMG_题号_序号>> 格式'),
  description: z.string().optional(),
  position: z.string().optional(),
  region: ImageRegionSchema.optional(),
  source: z.enum(['ai', 'manual']).optional()
});

/**
 * Answer piece normalization, allowing Qwen to return arrays
 */
const AnswerPieceSchema = z
  .union([
    z.string().min(1, '\u7b54\u6848\u7247\u6bb5\u4e0d\u80fd\u4e3a\u7a7a'),
    z.number(),
    z.boolean()
  ])
  .transform(value => String(value));

/**
 * Answer normalization and formatting
 * Note: Allows empty strings since test papers may not include answers
 */
const AnswerSchema = z
  .union([
    z.string(), // Allow empty strings for practice papers without answers
    z.array(AnswerPieceSchema).min(1, '答案数组不能为空')
  ])
  .transform(value => {
    if (Array.isArray(value)) {
      return value
        .map(piece => piece.trim())
        .filter(Boolean)
        .join('\n');
    }
    return value.trim();
  });

/**
 * 解析题目验证（核心Schema）
 */
export const ParsedQuestionSchema = z.object({
  number: z.string().min(1, '题号不能为空'),
  type: QuestionTypeSchema,
  content: z.string().min(1, '题目内容不能为空'),
  options: z.array(z.string()).optional(),
  answer: AnswerSchema,
  tags: QuestionTagSchema,
  confidence: z.number().min(0).max(1),
  steps: z.array(z.string()).optional(),
  images: z.array(QuestionImagePlaceholderSchema).optional(),
  image_region: ImageRegionSchema.optional(),
  image_regions: z.array(ImageRegionSchema).optional()
}).refine(
  (data) => {
    // 选择题必须有options
    if (data.type === 'choice') {
      return data.options && data.options.length >= 2;
    }
    return true;
  },
  {
    message: '选择题必须有至少2个选项'
  }
);

/**
 * Qwen API返回结果验证
 */
export const QwenParseResultSchema = z.object({
  questions: z.array(ParsedQuestionSchema)
});

/**
 * 文件上传验证
 */
export const FileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 20 * 1024 * 1024, '文件大小不能超过20MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type),
      '只支持JPG、PNG和PDF格式'
    )
});

/**
 * 批量提交验证
 */
export const BatchSubmitSchema = z.object({
  taskId: z.string().uuid('无效的任务ID'),
  questionIds: z.array(z.string().uuid('无效的题目ID')).min(1, '至少选择一道题目')
});

/**
 * 任务状态更新验证
 */
export const TaskStatusUpdateSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100).optional(),
  totalQuestions: z.number().int().positive().optional(),
  errorMessage: z.string().optional()
});

/**
 * 题目编辑验证（前端编辑器）
 */
export const QuestionEditSchema = z.object({
  id: z.string().uuid(),
  type: QuestionTypeSchema,
  content: z.string().min(1, '题目内容不能为空'),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1, '答案不能为空'),
  tags: QuestionTagSchema,
  steps: z.array(z.string()).optional()
});

/**
 * 类型导出（从Zod Schema推断）
 */
export type QuestionImagePlaceholderInput = z.infer<typeof QuestionImagePlaceholderSchema>;
export type ParsedQuestionInput = z.infer<typeof ParsedQuestionSchema>;
export type QwenParseResultInput = z.infer<typeof QwenParseResultSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type BatchSubmitInput = z.infer<typeof BatchSubmitSchema>;
export type TaskStatusUpdateInput = z.infer<typeof TaskStatusUpdateSchema>;
export type QuestionEditInput = z.infer<typeof QuestionEditSchema>;
