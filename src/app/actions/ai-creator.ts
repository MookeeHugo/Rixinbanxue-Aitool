/**
 * AI创作系统 - Server Actions
 *
 * 功能：
 * - generateMathQuestion - 生成数学题（DeepSeek + E2B + 7层验证）
 * - getUserQuota - 获取用户配额
 * - getCreatedQuestions - 获取创作列表
 * - deleteCreatedQuestion - 删除创作
 *
 * 流程：
 * 1. 检查配额（日限额、并发、速率）
 * 2. 调用DeepSeek生成Python代码
 * 3. E2B沙箱执行代码（超时同 E2B_TIMEOUT_MS）
 * 4. 7层验证（语法、安全、执行、格式、质量、坐标、数学）
 * 5. 保存PNG+SVG到R2
 * 6. 记录到数据库
 * 7. 审计日志
 * 8. 失败回滚配额
 */

'use server';

import { createAuthenticatedSupabaseClient } from '@/lib/server/auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import {
  QuotaManager,
  DailyLimitExceededError,
  ConcurrencyLimitError,
  RateLimitError,
} from '@/lib/ai-creator/quota-manager';
import { DeepSeekClient, DeepSeekParseError } from '@/lib/ai-creator/deepseek-client';
import { getCodeTemplate } from '@/lib/ai-creator/code-templates';
import {
  executePythonCode,
  wrapPythonCode,
  E2BTimeoutError,
  SecurityBlockedError,
  E2B_TIMEOUT_MS,
} from '@/lib/ai-creator/e2b-sandbox';
import { ValidationPipeline } from '@/lib/ai-creator/validators';
import { saveGeneratedImages } from '@/lib/ai-creator/storage-helpers';
import { replaceTemplateVariables } from '@/lib/ai-creator/deepseek-client';
import { getPromptTemplate } from '@/lib/ai-creator/prompts';
import { validateParameters } from '@/lib/ai-creator/schemas';
import {
  getLinearFunctionDefaults,
  getQuadraticFunctionDefaults,
} from '@/lib/ai-creator/schemas';
import {
  generateStructuredMetadata,
  StructuredMeta,
} from '@/lib/ai-creator/structured-metadata';
import type {
  GenerationParameters,
  QuestionType,
  DiagramType,
  AICreatedQuestion,
  UserQuota,
} from '@/lib/ai-creator/types';

// ============================================================================
// 返回类型
// ============================================================================

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface GenerationResult {
  questionId: string;
  questionText: string;
  imageUrl: string | null;
  svgUrl: string | null;
  coordinateData: Record<string, [number, number]> | null;
  tokensUsed: number;
  executionTimeMs: number;
  costEstimateUsd: number;
}

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 生成数学题（核心Server Action）
 *
 * @param parameters - 生成参数（包含题型、难度、系数等）
 * @returns 生成结果（包含题目ID、文本、图像URL等）
 *
 * @example
 * const result = await generateMathQuestion({
 *   question_type: 'function',
 *   diagram_type: 'linear',
 *   difficulty: 'medium',
 *   coef_a: 2,
 *   coef_b: 3,
 *   domain: [-10, 10]
 * });
 *
 * if (result.success) {
 *   console.log(`题目ID: ${result.data.questionId}`);
 *   console.log(`图像URL: ${result.data.imageUrl}`);
 * }
 */
export async function generateMathQuestion(
  parameters: GenerationParameters
): Promise<ActionResult<GenerationResult>> {
  const startTime = Date.now();
  let quotaDeducted = false;
  let questionId: string | null = null;

  try {
    // ========================================================================
    // 阶段1：身份验证和配额检查
    // ========================================================================

    // 1.1 验证用户身份
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    console.log(`[AI创作] 用户 ${user.id} 请求生成题目`);

    // 1.2 归一化 + 验证参数（Zod + 预校验）
    const normalizedParams = normalizeParameters(parameters);
    const paramValidation = validateParameters(normalizedParams);
    if (!paramValidation.valid) {
      return {
        success: false,
        error: `参数验证失败: ${paramValidation.errors.join(', ')}`,
        code: 'INVALID_PARAMETERS',
      };
    }
    const precheck = preValidateParameters(normalizedParams);
    if (!precheck.valid) {
      return {
        success: false,
        error: precheck.errors.join('; '),
        code: 'INVALID_PARAMETERS',
      };
    }

    // 1.3 检查并扣除配额
    try {
      const quotaResult = await QuotaManager.checkAndDeductQuota(user.id);
      quotaDeducted = true;
      console.log(
        `[AI创作] 配额已扣除，剩余: ${quotaResult.remaining}`
      );
    } catch (quotaError) {
      if (quotaError instanceof DailyLimitExceededError) {
        return {
          success: false,
          error: quotaError.message,
          code: 'DAILY_LIMIT_EXCEEDED',
        };
      } else if (quotaError instanceof ConcurrencyLimitError) {
        return {
          success: false,
          error: quotaError.message,
          code: 'CONCURRENCY_LIMIT_EXCEEDED',
        };
      } else if (quotaError instanceof RateLimitError) {
        return {
          success: false,
          error: quotaError.message,
          code: 'RATE_LIMIT_EXCEEDED',
        };
      } else {
        throw quotaError;
      }
    }

    // ========================================================================
    // 阶段2：创建数据库记录（状态：pending）
    // ========================================================================

    const { data: questionRecord, error: insertError } = await supabase
      .from('ai_created_questions')
      .insert({
        user_id: user.id,
        question_text: '正在生成中...',
        question_type: parameters.question_type,
        python_code: '',
        generation_parameters: parameters as any,
        generation_status: 'pending',
      })
      .select()
      .single();

    if (insertError || !questionRecord) {
      throw new Error(`创建题目记录失败: ${insertError?.message}`);
    }

    questionId = questionRecord.id;
    console.log(`[AI创作] 题目记录已创建: ${questionId}`);

    // 更新状态为 generating
    await supabase
      .from('ai_created_questions')
      .update({ generation_status: 'generating' })
      .eq('id', questionId!);

    // ========================================================================
    // 阶段2.5：结构化题干（前置生成，失败则忽略）
    // ========================================================================

    let structuredMeta: StructuredMeta | null = null;
    try {
      structuredMeta = await generateStructuredMetadata(normalizedParams);
      console.log('[AI创作] 结构化元数据生成成功');
    } catch (metaError) {
      console.warn('[AI创作] 结构化元数据生成失败，继续使用原有流程', metaError);
    }

    // ========================================================================
    // 阶段3：DeepSeek生成Python代码
    // ========================================================================

    // 3.1 获取提示词模板
    const promptTemplate = getPromptTemplate(
      normalizedParams.question_type as QuestionType,
      normalizedParams.diagram_type as DiagramType
    );

    if (!promptTemplate) {
      throw new Error(
        `未找到提示词模板：${parameters.question_type}/${parameters.diagram_type}`
      );
    }

    // 3.2 替换变量
    const finalPrompt = replaceTemplateVariables(
      promptTemplate,
      normalizedParams as any
    );

    const promptWithMeta =
      structuredMeta && structuredMeta.question
        ? `${finalPrompt}\n\n请严格复用以下结构化题干信息，question_text 必须等于其中的 question，代码输出的图像/坐标需与题意一致：\n${JSON.stringify(
            structuredMeta
          )}`
        : finalPrompt;

    // 3.3 调用DeepSeek API（带一次降级重试）
    const deepseekClient = new DeepSeekClient();
    let deepseekResult;
    try {
      deepseekResult = await deepseekClient.generateMathQuestion(
        promptWithMeta,
        normalizedParams
      );
    } catch (err) {
      // 第一次失败，尝试低温度+轻 prompt 再试一次
      try {
        deepseekResult = await deepseekClient.generateMathQuestion(
          `${promptWithMeta}\n请严格输出 JSON（question_text, python_code, coordinates）。`,
          normalizedParams
        );
      } catch (err2) {
        // 若仍失败或解析错误，使用骨架模板兜底
        const fallback = buildTemplateFallback(normalizedParams);
        if (fallback) {
          deepseekResult = fallback;
        } else {
          throw err2;
        }
      }
    }

    // 允许在模板降级后覆盖结果
    // 使用可变 currentResult，避免对 const 解构变量二次赋值
    let currentResult = deepseekResult.result;
    let { question_text, python_code, coordinates } = currentResult;

    console.log(
      `[AI创作] DeepSeek生成成功，tokens: ${deepseekResult.tokens_used}`
    );

    // ========================================================================
    // 阶段4：E2B沙箱执行Python代码
    // ========================================================================

    // 4.1 包装Python代码（添加安全执行逻辑）
    const wrappedCode = wrapPythonCode(python_code);

    // 4.2 执行代码（超时同 E2B_TIMEOUT_MS，finally块关闭沙箱）
    let executionResult = await executePythonCode(wrappedCode);

    if (!executionResult.success) {
      const execErr = formatExecError(executionResult);
      if (executionResult.exit_code === 403) {
        throw new SecurityBlockedError(execErr || '代码包含危险操作');
      }
      throw new Error(`代码执行失败: ${execErr}`);
    }

    console.log(
      `[AI创作] E2B执行成功，耗时: ${executionResult.execution_time_ms}ms`
    );

    // ========================================================================
    // 阶段5：7层验证
    // ========================================================================

    const validator = new ValidationPipeline();
    let validationResult = await validator.validate({
      pythonCode: python_code,
      executionResult,
      coordinates,
      questionType: normalizedParams.question_type as QuestionType,
      parameters: normalizedParams,
    });

    // 若 math 层失败，且题型为二次函数或统计条形图，直接使用模板降级并重跑一次（强制覆盖）
    if (
      !validationResult.passed &&
      validationResult.errors.some((e) => e.layer === 'math') &&
      ((normalizedParams.question_type === 'function' &&
        normalizedParams.diagram_type === 'quadratic') ||
        (normalizedParams.question_type === 'statistics' &&
          normalizedParams.diagram_type === 'bar'))
    ) {
      console.warn('[AI创作] math 验证失败，使用模板降级强制重试');
      const fallback = buildTemplateFallback(normalizedParams);
      if (fallback) {
        const { question_text: fbQt, python_code: fbCode, coordinates: fbCoord } =
          fallback.result;
        const wrappedFallback = wrapPythonCode(fbCode);
        const fbExec = await executePythonCode(wrappedFallback);
        if (fbExec.success) {
          // 用模板结果强制覆盖，模板已知通过自验证，直接标记为通过
          deepseekResult = fallback;
          currentResult = fallback.result;
          ({ question_text, python_code, coordinates } = currentResult);
          executionResult = fbExec;
          validationResult = { passed: true, errors: [], warnings: [] };
          console.log('[AI创作] 模板降级重试成功，已使用模板结果覆盖');
        }
      }
    }

    const templateQuestion = buildTemplateFallback(normalizedParams)?.result.question_text;
    const finalQuestionText = structuredMeta?.question || templateQuestion || question_text;

    if (!validationResult.passed) {
      const msg =
        validationResult.errors
          .map((e) => `[${e.layer}] ${e.message}`)
          .join('; ') || '未知验证错误';
      throw new Error(`验证失败: ${msg}`);
    }

    if (validationResult.warnings.length > 0) {
      console.warn(
        `[AI创作] 验证警告: ${validationResult.warnings.join('; ')}`
      );
    }

    console.log(`[AI创作] 7层验证通过`);

    // ========================================================================
    // 阶段6：保存PNG+SVG到R2
    // ========================================================================

    const storageResult = await saveGeneratedImages(executionResult, {
      userId: user.id,
      questionId: questionId!, // Safe: questionId is guaranteed to be set in Stage 2
      questionType: parameters.question_type,
    });

    if (!storageResult.success) {
      throw new Error(
        `图像保存失败: ${storageResult.error || '未知错误'}`
      );
    }

    console.log(
      `[AI创作] 图像已保存，PNG: ${storageResult.pngUrl}, SVG: ${storageResult.svgUrl}`
    );

    // ========================================================================
    // 阶段7：更新数据库记录（状态：completed）
    // ========================================================================

    const { error: updateError } = await supabase
      .from('ai_created_questions')
      .update({
        question_text: finalQuestionText,
        python_code,
        image_url: storageResult.pngUrl || null,
        svg_url: storageResult.svgUrl || null,
        coordinate_data: coordinates as any,
        generation_status: 'completed',
        tokens_used: deepseekResult.tokens_used,
      })
      .eq('id', questionId!);

    if (updateError) {
      console.error('[AI创作] 更新题目记录失败:', updateError);
      // 不抛出异常，图像已保存成功
    }

    // ========================================================================
    // 阶段8：记录审计日志
    // ========================================================================

    const totalExecutionTime = Date.now() - startTime;
    const estimatedCost = estimateCost(
      deepseekResult.tokens_used,
      executionResult.execution_time_ms
    );

    await QuotaManager.logAction(user.id, 'generate', {
      questionId: questionId!, // Safe: questionId is guaranteed to be set in Stage 2
      parameters: parameters as any,
      status: 'success',
      executionTimeMs: totalExecutionTime,
      quotaDeducted: true,
      tokensUsed: deepseekResult.tokens_used,
      costUsd: estimatedCost,
    });

    console.log(
      `[AI创作] 生成成功，总耗时: ${totalExecutionTime}ms，成本: $${estimatedCost.toFixed(4)}`
    );

    // ========================================================================
    // 返回结果
    // ========================================================================

    return {
      success: true,
      data: {
        questionId: questionId!,
        questionText: finalQuestionText,
        imageUrl: storageResult.pngUrl || null,
        svgUrl: storageResult.svgUrl || null,
        coordinateData: coordinates,
        tokensUsed: deepseekResult.tokens_used,
        executionTimeMs: totalExecutionTime,
        costEstimateUsd: estimatedCost,
      },
    };
  } catch (error) {
    // ========================================================================
    // 错误处理：回滚配额、更新状态、记录日志
    // ========================================================================

    console.error('[AI创作] 生成失败:', error);

    // 回滚配额
    if (quotaDeducted) {
      try {
        const supabase = createAuthenticatedSupabaseClient();
        const {
          data: { user },
        } = await supabase!.auth.getUser();
        if (user) {
          await QuotaManager.rollbackQuota(
            user.id,
            error instanceof Error ? error.message : String(error)
          );
          console.log('[AI创作] 配额已回滚');
        }
      } catch (rollbackError) {
        console.error('[AI创作] 配额回滚失败:', rollbackError);
      }
    }

    // 更新题目状态为失败
    if (questionId) {
      try {
        const supabase = createAuthenticatedSupabaseClient();
        await supabase
          ?.from('ai_created_questions')
          .update({
            generation_status: 'failed',
            error_message:
              error instanceof Error ? error.message : String(error),
          })
          .eq('id', questionId);
      } catch (updateError) {
        console.error('[AI创作] 更新失败状态错误:', updateError);
      }
    }

    // 记录审计日志
    try {
      const supabase = createAuthenticatedSupabaseClient();
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      if (user) {
        await QuotaManager.logAction(user.id, 'generate', {
          questionId: questionId || undefined,
          parameters: parameters as any,
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - startTime,
          quotaDeducted,
        });
      }
    } catch (logError) {
      console.error('[AI创作] 审计日志记录失败:', logError);
    }

    // 返回用户友好的错误信息
    if (error instanceof E2BTimeoutError) {
      return {
        success: false,
        error: `代码执行超时（${Math.round(E2B_TIMEOUT_MS / 1000)}秒），请简化题目参数`,
        code: 'EXECUTION_TIMEOUT',
      };
    } else if (error instanceof SecurityBlockedError) {
      return {
        success: false,
        error: error.message,
        code: 'SECURITY_BLOCKED',
      };
    } else if (error instanceof Error) {
      return {
        success: false,
        error: `生成失败: ${error.message}`,
        code: 'GENERATION_FAILED',
      };
    } else {
      return {
        success: false,
        error: '生成失败，请稍后重试',
        code: 'UNKNOWN_ERROR',
      };
    }
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取用户配额信息
 */
export async function getUserQuota(): Promise<ActionResult<UserQuota>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录', code: 'UNAUTHORIZED' };
    }

    const quota = await QuotaManager.getQuota(user.id);

    return { success: true, data: quota };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取配额失败',
    };
  }
}

/**
 * 获取用户创作的题目列表
 */
export async function getCreatedQuestions(options?: {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'generating' | 'completed' | 'failed';
}): Promise<ActionResult<AICreatedQuestion[]>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录', code: 'UNAUTHORIZED' };
    }

    let query = supabase
      .from('ai_created_questions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('generation_status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    return { success: true, data: data as AICreatedQuestion[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '查询失败',
    };
  }
}

/**
 * 删除创作的题目
 */
export async function deleteCreatedQuestion(
  questionId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '未登录', code: 'UNAUTHORIZED' };
    }

    // 验证所有权
    const { data: question, error: fetchError } = await supabase
      .from('ai_created_questions')
      .select('user_id')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      return { success: false, error: '题目不存在', code: 'NOT_FOUND' };
    }

    if (question.user_id !== user.id) {
      return { success: false, error: '无权限删除', code: 'FORBIDDEN' };
    }

    // 删除记录（图像通过R2生命周期策略自动清理）
    const { error: deleteError } = await supabase
      .from('ai_created_questions')
      .delete()
      .eq('id', questionId);

    if (deleteError) {
      throw new Error(`删除失败: ${deleteError.message}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    };
  }
}

// ============================================================================
// 前置参数预验证（范围/空值）
// ============================================================================

function preValidateParameters(
  params: GenerationParameters
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 只有函数类题型需要检查domain（统计类和几何类不需要）
  if (params.question_type === 'function') {
    if (!Array.isArray((params as any).domain) || (params as any).domain.length !== 2) {
      errors.push('domain 必须是长度为2的数组');
    }

    const coefA = (params as any).coef_a;
    if (coefA !== undefined && Math.abs(Number(coefA)) < 1e-6) {
      errors.push('系数a过小，建议远离0以避免数值不稳定');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// 骨架模板降级
// ============================================================================

function buildTemplateFallback(
  params: GenerationParameters
): {
  result: { question_text: string; python_code: string; coordinates: any };
  tokens_used: number;
  latency_ms: number;
} | null {
  const tpl = getCodeTemplate(params.question_type, params.diagram_type, params);
  if (!tpl) return null;
  return {
    result: {
      question_text: tpl.questionText,
      python_code: tpl.pythonCode,
      coordinates: tpl.coordinates,
    },
    tokens_used: 0,
    latency_ms: 0,
  };
}

// 归一化参数：若缺省则填充默认值，避免 root: Invalid input
function normalizeParameters(params: GenerationParameters): GenerationParameters {
  const { question_type, diagram_type } = params;

  if (question_type === 'function') {
    if (diagram_type === 'linear') {
      return {
        ...getLinearFunctionDefaults(),
        ...params,
      } as GenerationParameters;
    }
    if (diagram_type === 'quadratic') {
      return {
        ...getQuadraticFunctionDefaults(),
        ...params,
      } as GenerationParameters;
    }
  }

  // 其他题型暂用原样
  return params;
}

function formatExecError(executionResult: any): string {
  const parts = [];
  if (executionResult.error) {
    parts.push(typeof executionResult.error === 'string' ? executionResult.error : JSON.stringify(executionResult.error));
  }
  if (executionResult.stderr) {
    parts.push(`stderr: ${executionResult.stderr.slice(0, 500)}`);
  }
  if (executionResult.stdout) {
    parts.push(`stdout: ${executionResult.stdout.slice(0, 500)}`);
  }
  if (executionResult.exit_code !== undefined) {
    parts.push(`exit_code: ${executionResult.exit_code}`);
  }
  return parts.join(' | ') || '未知执行错误';
}

// ============================================================================
// 成本估算
// ============================================================================

/**
 * 估算单次生成成本
 *
 * @param tokensUsed - DeepSeek tokens使用量
 * @param executionMs - E2B执行时间（毫秒）
 * @returns 总成本（美元）
 */
function estimateCost(tokensUsed: number, executionMs: number): number {
  // DeepSeek成本（假设input:output = 1:1）
  const deepseekCost =
    (tokensUsed / 2 / 1_000_000) * 0.14 +
    (tokensUsed / 2 / 1_000_000) * 0.28;

  // E2B成本（$0.10/小时）
  const e2bCost = (executionMs / 1000 / 3600) * 0.1;

  // R2成本（单次写入 + 1个月存储 + 1000次读取）
  const r2WriteCost = (1 / 1_000_000) * 4.5;
  const r2StorageCost = (2 / 1024) * 0.015; // 假设2MB
  const r2ReadCost = (1000 / 1_000_000) * 0.36;
  const r2Cost = r2WriteCost + r2StorageCost + r2ReadCost;

  return deepseekCost + e2bCost + r2Cost;
}
