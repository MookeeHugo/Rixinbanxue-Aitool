# AI Creator 参数验证问题修复计划

## 🎯 目标

解决前端参数验证失败的问题，确保用户能够顺利创建数学题目。

## 📊 问题分析

### 根本原因

1. **Schema 结构问题**：
   - `GenerationParamsSchema` 使用了 `z.union`，包含三种题型
   - `FunctionParamsSchema` 本身是 `discriminatedUnion`
   - 嵌套的 discriminatedUnion 在 union 中无法正确工作
   - Zod 给出的错误信息不明确："root: Invalid input"

2. **前端与后端不匹配**：
   - 前端页面只支持 `function` 类型（Week 3）
   - 后端 schema 已经包含 `statistics` 和 `geometry`（为 Week 4-6 准备）
   - 验证时会尝试匹配所有类型，导致混淆

3. **错误消息问题**：
   - Zod 的 union 错误消息是所有分支错误的聚合
   - 用户只看到 "root: Invalid input"，无法定位具体问题

## 🔧 修复方案

### 方案A：重构 Schema 为单个 discriminatedUnion（推荐）

**优点**：
- 错误消息清晰
- 性能更好（Zod 直接使用鉴别字段）
- 符合最佳实践

**实施步骤**：

1. 修改 `src/lib/ai-creator/schemas.ts`：

```typescript
// 将所有题型的 schema 展平为单个 discriminatedUnion
export const GenerationParamsSchema = z.discriminatedUnion('question_type', [
  // 函数类 - 线性
  z.object({
    question_type: z.literal('function'),
    diagram_type: z.literal('linear'),
    difficulty: DifficultySchema,
    coef_a: z.number().refine((val) => val !== 0, {
      message: '系数a不能为0（否则不是线性函数）',
    }),
    coef_b: z.number(),
    domain: RangeSchema.default([-10, 10]),
    range: RangeSchema.optional(),
  }),

  // 函数类 - 二次
  z.object({
    question_type: z.literal('function'),
    diagram_type: z.literal('quadratic'),
    difficulty: DifficultySchema,
    coef_a: z.number().refine((val) => val !== 0, {
      message: '系数a不能为0（否则不是二次函数）',
    }),
    coef_b: z.number(),
    coef_c: z.number(),
    domain: RangeSchema.default([-10, 10]),
    range: RangeSchema.optional(),
  }),

  // 统计类
  StatisticsParamsSchema,

  // 几何类
  GeometryParamsSchema,
]);
```

2. 修改验证错误处理，提供更友好的错误消息：

```typescript
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

    // 为常见错误提供更友好的消息
    if (err.code === 'invalid_union_discriminator') {
      message = `不支持的题型组合：question_type="${params.question_type}", diagram_type="${params.diagram_type}"`;
    } else if (err.code === 'invalid_type') {
      message = `字段 ${path} 的类型错误：期望 ${err.expected}，实际 ${err.received}`;
    }

    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}
```

### 方案B：为前端创建专用验证函数（快速修复）

**优点**：
- 不需要大规模重构
- 快速解决当前问题

**实施步骤**：

1. 在 `src/lib/ai-creator/schemas.ts` 添加前端专用验证：

```typescript
/**
 * 前端参数验证（仅验证当前支持的题型）
 */
export function validateFrontendParameters(
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const { question_type, diagram_type } = params;

  // 只验证函数类型
  if (question_type === 'function') {
    let schema: z.ZodSchema;

    if (diagram_type === 'linear') {
      schema = LinearFunctionParamsSchema;
    } else if (diagram_type === 'quadratic') {
      schema = QuadraticFunctionParamsSchema;
    } else {
      return {
        valid: false,
        errors: [`不支持的图表类型: ${diagram_type}`],
      };
    }

    const result = schema.safeParse(params);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.errors.map(
      (err) => `${err.path.join('.') || 'root'}: ${err.message}`
    );

    return { valid: false, errors };
  }

  return {
    valid: false,
    errors: [`暂不支持的题型: ${question_type}`],
  };
}
```

2. 修改前端组件 `src/app/ai-creator/_components/ParameterEditor.tsx`：

```typescript
// 第 20 行，改为导入前端专用验证
import { validateFrontendParameters } from '@/lib/ai-creator/schemas';

// 第 101 行，使用前端专用验证
const validation = validateFrontendParameters(fullParams);
```

### 方案C：添加调试日志（临时诊断）

在修复之前，先添加详细日志以确认问题：

```typescript
// 在 ParameterEditor.tsx 的 useEffect 中添加
useEffect(() => {
  const fullParams = {
    question_type: questionType,
    diagram_type: diagramType,
    ...value,
  } as GenerationParameters;

  console.log('[ParameterEditor] 验证参数:', fullParams);

  const validation = validateParameters(fullParams);

  console.log('[ParameterEditor] 验证结果:', {
    valid: validation.valid,
    errors: validation.errors,
  });

  setErrors(validation.errors);

  if (onValidationChangeRef.current) {
    onValidationChangeRef.current(validation.valid, validation.errors);
  }
}, [questionType, diagramType, valueKey]);
```

## 🚀 实施建议

### 立即执行（修复当前问题）：

1. **采用方案B（快速修复）**：
   - 创建 `validateFrontendParameters` 函数
   - 修改 `ParameterEditor.tsx` 使用新函数
   - 测试线性和二次函数参数验证

### Week 4 执行（长期优化）：

2. **采用方案A（重构 Schema）**：
   - 重构为单个 `discriminatedUnion`
   - 统一前后端验证逻辑
   - 添加统计类参数表单

## 📝 测试清单

修复后需要验证：

- [ ] 线性函数参数验证通过
- [ ] 二次函数参数验证通过
- [ ] 错误消息清晰可读
- [ ] 前端表单显示正确的错误提示
- [ ] 后端 API 仍然能正确验证所有类型

## 🔗 相关文件

- `src/lib/ai-creator/schemas.ts` - 参数 Schema 定义
- `src/app/ai-creator/_components/ParameterEditor.tsx` - 前端参数编辑器
- `src/app/ai-creator/new/page.tsx` - 创建题目页面
- `src/app/actions/ai-creator.ts` - 后端 Server Action

## 📚 参考资料

- [Zod discriminatedUnion 文档](https://zod.dev/?id=discriminated-unions)
- [Zod union 文档](https://zod.dev/?id=unions)
- [Zod 错误处理](https://zod.dev/?id=error-handling)
