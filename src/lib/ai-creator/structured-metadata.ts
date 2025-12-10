import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { GenerationParameters } from './types';

const deepseek = createOpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const StructuredMetaSchema = z.object({
  topic: z.string(),
  difficulty: z.enum(['基础', '进阶', '竞赛']),
  question: z.string(),
  solution_steps: z.array(z.string()).min(1),
  answer: z.string(),
  tags: z.array(z.string()).optional(),
});

export type StructuredMeta = z.infer<typeof StructuredMetaSchema>;

/**
 * 基于已知参数生成结构化题干与答案，用于约束后续代码生成。
 * 失败时抛出错误，由上层决定兜底。
 */
export async function generateStructuredMetadata(
  params: GenerationParameters
): Promise<StructuredMeta> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，无法生成结构化元数据');
  }

  const difficultyLabel =
    params.difficulty === 'easy'
      ? '基础'
      : params.difficulty === 'hard'
      ? '竞赛'
      : '进阶';

  const hintParts: string[] = [];
  if (params.question_type === 'function') {
    hintParts.push(
      `函数参数: a=${'coef_a' in params ? params.coef_a : ''}, b=${'coef_b' in params ? params.coef_b : ''}, c=${'coef_c' in params ? (params as any).coef_c ?? '' : ''}, domain=${(params as any).domain ?? ''}`,
    );
  } else if (params.question_type === 'statistics') {
    hintParts.push(
      `统计参数: sample_size=${(params as any).sample_size ?? ''}, distribution=${(params as any).distribution ?? ''}, distribution_params=${JSON.stringify((params as any).distribution_params ?? {})}, random_seed=${(params as any).random_seed ?? ''}`,
    );
  } else if (params.question_type === 'geometry') {
    hintParts.push(
      `几何参数: shape_params=${JSON.stringify((params as any).shape_params ?? {})}, annotations=${JSON.stringify((params as any).annotations ?? [])}`,
    );
  }

  const prompt = `
你是一名数学命题专家，请按照给定参数生成一题结构化的数学题干，输出严格符合 JSON Schema 的对象。
- 题干应可被学生理解，数字可计算，避免难以验证的小数。
- 仅生成题干/答案/步骤/标签，不要生成代码。
- difficulty 仅可为 "基础" | "进阶" | "竞赛"。
- 请直接输出 JSON 对象，不要使用 Markdown。

参数:
- question_type: ${params.question_type}
- diagram_type: ${params.diagram_type}
- 难度: ${difficultyLabel}
- 其他: ${hintParts.join('；')}
`.trim();

  const { object } = await generateObject({
    model: deepseek('deepseek-chat'),
    schema: StructuredMetaSchema,
    temperature: 0.5,
    prompt,
  });

  return object;
}
