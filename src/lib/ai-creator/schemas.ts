/**
 * 参数验证Schemas
 *
 * 使用Zod定义所有题型的参数验证规则：
 * - 函数图像参数
 * - 统计图表参数
 * - 几何图形参数
 *
 * 用于前端表单验证和后端数据验证
 */

import { z } from 'zod';

// ============================================================================
// 基础Schemas
// ============================================================================

/**
 * 难度级别
 */
export const DifficultySchema = z.enum(['easy', 'medium', 'hard'], {
  errorMap: () => ({ message: '难度必须是easy、medium或hard之一' }),
});

/**
 * 题目类型
 */
export const QuestionTypeSchema = z.enum(
  ['function', 'statistics', 'geometry'],
  {
    errorMap: () => ({
      message: '题目类型必须是function、statistics或geometry之一',
    }),
  }
);

/**
 * 坐标点（[x, y]）
 */
export const CoordinateSchema = z.tuple([z.number(), z.number()], {
  errorMap: () => ({ message: '坐标必须是[x, y]格式的数字数组' }),
});

/**
 * 定义域/值域
 */
export const RangeSchema = z
  .tuple([z.number(), z.number()])
  .refine((range) => range[0] < range[1], {
    message: '范围的最小值必须小于最大值',
  });

// ============================================================================
// 函数图像 - 线性函数参数
// ============================================================================

/**
 * 线性函数参数Schema（y = ax + b）
 */
export const LinearFunctionParamsSchema = z.object({
  // 基础信息
  question_type: z.literal('function'),
  diagram_type: z.literal('linear'),
  difficulty: DifficultySchema,

  // 函数系数
  coef_a: z
    .number()
    .refine((val) => val !== 0, {
      message: '系数a不能为0（否则不是线性函数）',
    })
    .describe('斜率系数a'),

  coef_b: z.number().describe('y轴截距b'),

  // 定义域
  domain: RangeSchema.default([-10, 10]).describe('函数定义域'),

  // 可选：值域（自动计算）
  range: RangeSchema.optional().describe('函数值域（可选）'),
});

export type LinearFunctionParams = z.infer<
  typeof LinearFunctionParamsSchema
>;

// ============================================================================
// 函数图像 - 二次函数参数
// ============================================================================

/**
 * 二次函数参数Schema（y = ax² + bx + c）
 */
export const QuadraticFunctionParamsSchema = z.object({
  // 基础信息
  question_type: z.literal('function'),
  diagram_type: z.literal('quadratic'),
  difficulty: DifficultySchema,

  // 函数系数
  coef_a: z
    .number()
    .refine((val) => val !== 0, {
      message: '系数a不能为0（否则不是二次函数）',
    })
    .describe('二次项系数a'),

  coef_b: z.number().describe('一次项系数b'),

  coef_c: z.number().describe('常数项c'),

  // 定义域
  domain: RangeSchema.default([-10, 10]).describe('函数定义域'),

  // 可选：值域（自动计算）
  range: RangeSchema.optional().describe('函数值域（可选）'),
});

export type QuadraticFunctionParams = z.infer<
  typeof QuadraticFunctionParamsSchema
>;

// ============================================================================
// 函数图像 - 通用函数参数（联合类型）
// ============================================================================

/**
 * 通用函数参数Schema
 *
 * 注意：这个类型保留用于类型推导，但实际验证使用 GenerationParamsSchema
 */
export const FunctionParamsSchema = z.discriminatedUnion('diagram_type', [
  LinearFunctionParamsSchema,
  QuadraticFunctionParamsSchema,
]);

export type FunctionParams = z.infer<typeof FunctionParamsSchema>;

// ============================================================================
// 统计图表参数（Week 4实现）
// ============================================================================

/**
 * 统计图表基础字段（用于复用）
 */
const StatisticsBaseFields = {
  question_type: z.literal('statistics'),
  difficulty: DifficultySchema,
};

/**
 * 直方图参数Schema
 */
export const HistogramParamsSchema = z.object({
  ...StatisticsBaseFields,
  diagram_type: z.literal('histogram'),

  sample_size: z.number().int().min(10).max(1000).default(100).describe('样本量'),
  distribution: z.enum(['normal', 'uniform', 'poisson', 'binomial']).default('normal').describe('数据分布类型'),
  distribution_params: z.record(z.number()).describe('分布参数（如均值、标准差）'),
  random_seed: z.number().int().default(42).describe('随机种子（保证可重现）'),
});

/**
 * 条形图参数Schema
 */
export const BarChartParamsSchema = z.object({
  ...StatisticsBaseFields,
  diagram_type: z.literal('bar'),

  categories: z.array(z.string()).min(2).describe('条形图类别'),
  values: z.array(z.number()).min(2).describe('条形图数值'),
});

/**
 * 散点图参数Schema（Week 4）
 */
export const ScatterParamsSchema = z.object({
  ...StatisticsBaseFields,
  diagram_type: z.literal('scatter'),

  sample_size: z.number().int().min(10).max(1000).optional().describe('样本量'),
  distribution_params: z.record(z.number()).optional().describe('分布参数'),
});

/**
 * 折线图参数Schema（Week 4）
 */
export const LineChartParamsSchema = z.object({
  ...StatisticsBaseFields,
  diagram_type: z.literal('line'),

  categories: z.array(z.string()).optional().describe('X轴类别'),
  values: z.array(z.number()).optional().describe('Y轴数值'),
});

/**
 * 饼图参数Schema（Week 4）
 */
export const PieChartParamsSchema = z.object({
  ...StatisticsBaseFields,
  diagram_type: z.literal('pie'),

  categories: z.array(z.string()).min(2).describe('饼图类别'),
  values: z.array(z.number()).min(2).describe('饼图数值'),
});

/**
 * 箱线图参数Schema（Week 4）
 */
export const BoxPlotParamsSchema = z.object({
  ...StatisticsBaseFields,
  diagram_type: z.literal('box'),

  sample_size: z.number().int().min(10).max(1000).optional().describe('样本量'),
  distribution_params: z.record(z.number()).optional().describe('分布参数'),
});

/**
 * 统计图表参数Schema（联合类型）
 *
 * 注意：这个类型保留用于向后兼容和类型推导
 */
export const StatisticsParamsSchema = z.union([
  HistogramParamsSchema,
  BarChartParamsSchema,
  ScatterParamsSchema,
  LineChartParamsSchema,
  PieChartParamsSchema,
  BoxPlotParamsSchema,
]);

export type StatisticsParams = z.infer<typeof StatisticsParamsSchema>;

// ============================================================================
// 几何图形参数（Week 5-6实现）
// ============================================================================

/**
 * 几何图形基础字段（用于复用）
 */
const GeometryBaseFields = {
  question_type: z.literal('geometry'),
  difficulty: DifficultySchema,
};

/**
 * 标注选项Schema（复用）
 */
const AnnotationsSchema = z.union([
  z.array(z.string()).describe('标注项数组（如 ["vertices", "sides"]）'),
  z.object({
    vertices: z.boolean().default(true).describe('标注顶点'),
    edges: z.boolean().default(true).describe('标注边长'),
    angles: z.boolean().default(true).describe('标注角度'),
    auxiliary_lines: z.boolean().default(false).describe('绘制辅助线'),
  }),
]).optional();

/**
 * 三角形参数Schema
 */
export const TriangleParamsSchema = z.object({
  ...GeometryBaseFields,
  diagram_type: z.literal('triangle'),

  shape_params: z.record(z.any()).describe('三角形参数（边长、角度、顶点等）'),
  annotations: AnnotationsSchema,
});

/**
 * 四边形参数Schema（Week 5）
 */
export const QuadrilateralParamsSchema = z.object({
  ...GeometryBaseFields,
  diagram_type: z.literal('quadrilateral'),

  shape_params: z.record(z.any()).describe('四边形参数'),
  annotations: AnnotationsSchema,
});

/**
 * 圆形参数Schema（Week 5）
 */
export const CircleParamsSchema = z.object({
  ...GeometryBaseFields,
  diagram_type: z.literal('circle'),

  shape_params: z.record(z.any()).describe('圆形参数（半径、圆心等）'),
  annotations: AnnotationsSchema,
});

/**
 * 多边形参数Schema（Week 6）
 */
export const PolygonParamsSchema = z.object({
  ...GeometryBaseFields,
  diagram_type: z.literal('polygon'),

  shape_params: z.record(z.any()).describe('多边形参数（顶点坐标等）'),
  annotations: AnnotationsSchema,
});

/**
 * 几何图形参数Schema（联合类型）
 *
 * 注意：这个类型保留用于向后兼容和类型推导
 */
export const GeometryParamsSchema = z.union([
  TriangleParamsSchema,
  QuadrilateralParamsSchema,
  CircleParamsSchema,
  PolygonParamsSchema,
]);

export type GeometryParams = z.infer<typeof GeometryParamsSchema>;

// ============================================================================
// 通用生成参数（所有题型）
// ============================================================================

/**
 * 通用生成参数Schema（重构版 - 使用 diagram_type 作为鉴别字段）
 *
 * 使用 diagram_type 而不是 question_type 作为鉴别字段的原因：
 * - diagram_type 在所有题型中都是唯一的（linear, quadratic, histogram, bar, etc.）
 * - 避免嵌套 discriminatedUnion 的问题
 * - Zod 可以直接通过 diagram_type 路由到正确的 schema
 *
 * 优点：
 * 1. 错误消息更清晰（Zod 直接知道用户选择了哪种图表类型）
 * 2. 性能更好（O(1) 查找而不是尝试所有分支）
 * 3. 类型推导更准确
 *
 * Schema 重构说明：
 * - 每个 diagram_type 都有唯一的 schema（使用 z.literal）
 * - Zod 通过 diagram_type 字段直接路由到对应的 schema
 * - 错误消息会明确指出是哪个 diagram_type 的参数问题
 */
export const GenerationParamsSchema = z.discriminatedUnion('diagram_type', [
  // 函数类型
  LinearFunctionParamsSchema,      // diagram_type: 'linear'
  QuadraticFunctionParamsSchema,   // diagram_type: 'quadratic'

  // 统计类型
  HistogramParamsSchema,            // diagram_type: 'histogram'
  BarChartParamsSchema,             // diagram_type: 'bar'
  ScatterParamsSchema,              // diagram_type: 'scatter'
  LineChartParamsSchema,            // diagram_type: 'line'
  PieChartParamsSchema,             // diagram_type: 'pie'
  BoxPlotParamsSchema,              // diagram_type: 'box'

  // 几何类型
  TriangleParamsSchema,             // diagram_type: 'triangle'
  QuadrilateralParamsSchema,        // diagram_type: 'quadrilateral'
  CircleParamsSchema,               // diagram_type: 'circle'
  PolygonParamsSchema,              // diagram_type: 'polygon'
]);

export type GenerationParams = z.infer<typeof GenerationParamsSchema>;

// ============================================================================
// API请求Schemas
// ============================================================================

/**
 * 生成数学题请求Schema
 */
export const GenerateMathQuestionRequestSchema = z.object({
  // 可选：使用预设模板
  template_name: z.string().optional().describe('模板名称（可选）'),

  // 必需：题型参数
  question_type: QuestionTypeSchema,
  diagram_type: z.string().describe('图表类型'),
  difficulty: DifficultySchema,

  // 自定义参数（根据题型不同）
  parameters: z.record(z.any()).describe('自定义参数'),
});

export type GenerateMathQuestionRequest = z.infer<
  typeof GenerateMathQuestionRequestSchema
>;

/**
 * 改编数学题请求Schema
 */
export const AdaptMathQuestionRequestSchema = z.object({
  parent_question_id: z.string().uuid('必须是有效的UUID'),
  parameter_overrides: z.record(z.any()).describe('参数覆盖'),
});

export type AdaptMathQuestionRequest = z.infer<
  typeof AdaptMathQuestionRequestSchema
>;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取线性函数默认参数
 */
export function getLinearFunctionDefaults(): LinearFunctionParams {
  return {
    question_type: 'function',
    diagram_type: 'linear',
    difficulty: 'medium',
    coef_a: 2,
    coef_b: 3,
    domain: [-10, 10],
  };
}

/**
 * 获取二次函数默认参数
 */
export function getQuadraticFunctionDefaults(): QuadraticFunctionParams {
  return {
    question_type: 'function',
    diagram_type: 'quadratic',
    difficulty: 'medium',
    coef_a: 1,
    coef_b: 0,
    coef_c: 0,
    domain: [-10, 10],
  };
}

/**
 * 验证并解析参数
 *
 * 使用统一的 discriminatedUnion 验证，提供清晰的错误消息。
 */
export function validateAndParseParams(
  questionType: string,
  diagramType: string,
  params: Record<string, any>
): GenerationParams {
  // 组合参数
  const fullParams = {
    question_type: questionType,
    diagram_type: diagramType,
    ...params,
  };

  // 验证（使用改进的 validateParameters）
  const validation = validateParameters(fullParams);

  if (!validation.valid) {
    throw new Error(`参数验证失败: ${validation.errors.join('; ')}`);
  }

  // 由于验证通过，可以安全地重新解析
  const result = GenerationParamsSchema.safeParse(fullParams);
  return result.data!;
}

/**
 * 仅校验参数合法性（前后端公用轻量校验）
 *
 * 使用 discriminatedUnion 后，错误消息更精确：
 * - invalid_union_discriminator: diagram_type 不在支持列表中
 * - 其他错误: 具体字段验证失败
 */
export function validateParameters(
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const result = GenerationParamsSchema.safeParse(params);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  // 改进错误消息格式
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.') || 'root';
    let message = err.message;

    // 为 discriminatedUnion 错误提供更友好的消息
    if (err.code === 'invalid_union_discriminator') {
      const supportedTypes = [
        'linear', 'quadratic',  // 函数类
        'histogram', 'bar', 'scatter', 'line', 'pie', 'box',  // 统计类
        'triangle', 'quadrilateral', 'circle', 'polygon'  // 几何类
      ];
      return `不支持的图表类型: diagram_type="${params.diagram_type}"。支持的类型: ${supportedTypes.join(', ')}`;
    }

    // 为类型错误提供更清晰的消息
    if (err.code === 'invalid_type') {
      const expected = (err as any).expected;
      const received = (err as any).received;
      message = `字段类型错误：期望 ${expected}，实际 ${received}`;
    }

    // 为必需字段缺失提供清晰消息
    if (err.code === 'invalid_literal') {
      const expected = (err as any).expected;
      message = `字段值错误：期望 ${JSON.stringify(expected)}`;
    }

    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}

/**
 * 前端参数验证（仅验证当前支持的题型）
 *
 * 这个函数专门用于前端表单验证，只验证当前 Week 支持的题型。
 * Week 3: 仅支持函数类（线性、二次）
 * Week 4+: 逐步添加统计类、几何类
 *
 * 现在使用统一的 discriminatedUnion 验证，但会额外检查前端UI支持范围。
 */
export function validateFrontendParameters(
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const { diagram_type } = params;

  // Week 3: 前端UI仅支持 linear 和 quadratic
  const frontendSupportedTypes = ['linear', 'quadratic'];

  if (!frontendSupportedTypes.includes(diagram_type)) {
    return {
      valid: false,
      errors: [
        `前端暂不支持的图表类型: diagram_type="${diagram_type}"。` +
        `当前版本（Week 3）仅支持: ${frontendSupportedTypes.join(', ')}。` +
        `完整支持将在后续版本中添加。`
      ],
    };
  }

  // 使用统一的验证逻辑（利用 discriminatedUnion 的优势）
  const result = GenerationParamsSchema.safeParse(params);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  // 改进错误消息格式
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.') || 'root';
    let message = err.message;

    // 为 discriminatedUnion 错误提供更友好的消息
    if (err.code === 'invalid_union_discriminator') {
      return `图表类型错误: diagram_type="${params.diagram_type}"。前端当前支持: ${frontendSupportedTypes.join(', ')}`;
    }

    // 为类型错误提供更清晰的消息
    if (err.code === 'invalid_type') {
      const expected = (err as any).expected;
      const received = (err as any).received;
      message = `字段类型错误：期望 ${expected}，实际 ${received}`;
    }

    // 为字面量错误提供清晰消息
    if (err.code === 'invalid_literal') {
      const expected = (err as any).expected;
      message = `字段值错误：期望 ${JSON.stringify(expected)}`;
    }

    // 为refine错误提供清晰消息（如 coef_a !== 0）
    if (err.code === 'custom') {
      message = err.message;  // 保留自定义错误消息
    }

    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}

/**
 * 生成随机参数（用于测试）
 */
export function generateRandomLinearParams(): LinearFunctionParams {
  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    question_type: 'function',
    diagram_type: 'linear',
    difficulty: ['easy', 'medium', 'hard'][randomInt(0, 2)] as any,
    coef_a: randomInt(-5, 5) || 1, // 避免0
    coef_b: randomInt(-10, 10),
    domain: [-10, 10],
  };
}

/**
 * 生成随机二次函数参数（用于测试）
 */
export function generateRandomQuadraticParams(): QuadraticFunctionParams {
  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    question_type: 'function',
    diagram_type: 'quadratic',
    difficulty: ['easy', 'medium', 'hard'][randomInt(0, 2)] as any,
    coef_a: randomInt(-3, 3) || 1, // 避免0
    coef_b: randomInt(-6, 6),
    coef_c: randomInt(-10, 10),
    domain: [-10, 10],
  };
}
