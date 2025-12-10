/**
 * AI鍒涗綔绯荤粺 - Server Actions
 *
 * 鍔熻兘锛?
 * - generateMathQuestion - 鐢熸垚鏁板棰橈紙DeepSeek + E2B + 7灞傞獙璇侊級
 * - getUserQuota - 鑾峰彇鐢ㄦ埛閰嶉
 * - getCreatedQuestions - 鑾峰彇鍒涗綔鍒楄〃
 * - deleteCreatedQuestion - 鍒犻櫎鍒涗綔
 *
 * 娴佺▼锛?
 * 1. 妫€鏌ラ厤棰濓紙鏃ラ檺棰濄€佸苟鍙戙€侀€熺巼锛?
 * 2. 璋冪敤DeepSeek鐢熸垚Python浠ｇ爜
 * 3. E2B娌欑鎵ц浠ｇ爜锛?5绉掕秴鏃讹級
 * 4. 7灞傞獙璇侊紙璇硶銆佸畨鍏ㄣ€佹墽琛屻€佹牸寮忋€佽川閲忋€佸潗鏍囥€佹暟瀛︼級
 * 5. 淇濆瓨PNG+SVG鍒癛2
 * 6. 璁板綍鍒版暟鎹簱
 * 7. 瀹¤鏃ュ織
 * 8. 澶辫触鍥炴粴閰嶉
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
import { DeepSeekClient } from '@/lib/ai-creator/deepseek-client';
import {
  executePythonCode,
  wrapPythonCode,
  E2BTimeoutError,
  SecurityBlockedError,
} from '@/lib/ai-creator/e2b-sandbox';
import { ValidationPipeline } from '@/lib/ai-creator/validators';
import { saveGeneratedImages } from '@/lib/ai-creator/storage-helpers';
import { replaceTemplateVariables } from '@/lib/ai-creator/deepseek-client';
import { getPromptTemplate } from '@/lib/ai-creator/prompts';
import { validateParameters } from '@/lib/ai-creator/schemas';
import type {
  GenerationParameters,
  QuestionType,
  DiagramType,
  AICreatedQuestion,
  UserQuota,
} from '@/lib/ai-creator/types';

// ============================================================================
// 杩斿洖绫诲瀷
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
// 鏍稿績鍑芥暟
// ============================================================================

/**
 * 鐢熸垚鏁板棰橈紙鏍稿績Server Action锛?
 *
 * @param parameters - 鐢熸垚鍙傛暟锛堝寘鍚鍨嬨€侀毦搴︺€佺郴鏁扮瓑锛?
 * @returns 鐢熸垚缁撴灉锛堝寘鍚鐩甀D銆佹枃鏈€佸浘鍍廢RL绛夛級
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
 *   console.log(`棰樼洰ID: ${result.data.questionId}`);
 *   console.log(`鍥惧儚URL: ${result.data.imageUrl}`);
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
    // 闃舵1锛氳韩浠介獙璇佸拰閰嶉妫€鏌?
    // ========================================================================

    // 1.1 楠岃瘉鐢ㄦ埛韬唤
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '鏈櫥褰曪紝璇峰厛鐧诲綍', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '鏈櫥褰曪紝璇峰厛鐧诲綍', code: 'UNAUTHORIZED' };
    }

    console.log(`[AI鍒涗綔] 鐢ㄦ埛 ${user.id} 璇锋眰鐢熸垚棰樼洰`);

    // 1.2 楠岃瘉鍙傛暟
    const paramValidation = validateParameters(parameters);
    if (!paramValidation.valid) {
      return {
        success: false,
        error: `鍙傛暟楠岃瘉澶辫触: ${paramValidation.errors.join(', ')}`,
        code: 'INVALID_PARAMETERS',
      };
    }

    // 1.3 妫€鏌ュ苟鎵ｉ櫎閰嶉
    try {
      const quotaResult = await QuotaManager.checkAndDeductQuota(user.id);
      quotaDeducted = true;
      console.log(
        `[AI鍒涗綔] 閰嶉宸叉墸闄わ紝鍓╀綑: ${quotaResult.remaining}`
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
    // 闃舵2锛氬垱寤烘暟鎹簱璁板綍锛堢姸鎬侊細pending锛?
    // ========================================================================

    const { data: questionRecord, error: insertError } = await supabase
      .from('ai_created_questions')
      .insert({
        user_id: user.id,
        question_text: '姝ｅ湪鐢熸垚涓?..',
        question_type: parameters.question_type,
        python_code: '',
        generation_parameters: parameters as any,
        generation_status: 'pending',
      })
      .select()
      .single();

    if (insertError || !questionRecord) {
      throw new Error(`鍒涘缓棰樼洰璁板綍澶辫触: ${insertError?.message}`);
    }

    questionId = questionRecord.id;
    console.log(`[AI鍒涗綔] 棰樼洰璁板綍宸插垱寤? ${questionId}`);

    // 鏇存柊鐘舵€佷负 generating
    await supabase
      .from('ai_created_questions')
      .update({ generation_status: 'generating' })
      .eq('id', questionId);

    // ========================================================================
    // 闃舵3锛欴eepSeek鐢熸垚Python浠ｇ爜
    // ========================================================================

    // 3.1 鑾峰彇鎻愮ず璇嶆ā鏉?
    const promptTemplate = getPromptTemplate(
      parameters.question_type as QuestionType,
      parameters.diagram_type as DiagramType
    );

    if (!promptTemplate) {
      throw new Error(
        `鏈壘鍒版彁绀鸿瘝妯℃澘锛?{parameters.question_type}/${parameters.diagram_type}`
      );
    }

    // 3.2 鏇挎崲鍙橀噺
    const finalPrompt = replaceTemplateVariables(
      promptTemplate,
      parameters as any
    );

    // 3.3 璋冪敤DeepSeek API
    const deepseekClient = new DeepSeekClient();
    const deepseekResult = await deepseekClient.generateMathQuestion(
      finalPrompt,
      parameters
    );

    const { question_text, python_code, coordinates } =
      deepseekResult.result;

    console.log(
      `[AI鍒涗綔] DeepSeek鐢熸垚鎴愬姛锛宼okens: ${deepseekResult.tokens_used}`
    );

    // ========================================================================
    // 闃舵4锛欵2B娌欑鎵цPython浠ｇ爜
    // ========================================================================

    // 4.1 鍖呰Python浠ｇ爜锛堟坊鍔犲畨鍏ㄦ墽琛岄€昏緫锛?
    const wrappedCode = wrapPythonCode(python_code);

    // 4.2 鎵ц浠ｇ爜锛?5绉掕秴鏃讹紝finally鍧楀叧闂矙绠憋級
    const executionResult = await executePythonCode(wrappedCode);

    if (!executionResult.success) {
      if (executionResult.exit_code === 403) {
        throw new SecurityBlockedError(
          executionResult.error || '浠ｇ爜鍖呭惈鍗遍櫓鎿嶄綔'
        );
      }
      throw new Error(
        `浠ｇ爜鎵ц澶辫触: ${executionResult.error || executionResult.stderr}`
      );
    }

    console.log(
      `[AI鍒涗綔] E2B鎵ц鎴愬姛锛岃€楁椂: ${executionResult.execution_time_ms}ms`
    );

    // ========================================================================
    // 闃舵5锛?灞傞獙璇?
    // ========================================================================

    const validator = new ValidationPipeline();
    const validationResult = await validator.validate({
      pythonCode: python_code,
      executionResult,
      coordinates,
      questionType: parameters.question_type as QuestionType,
      parameters,
    });

    if (!validationResult.passed) {
      throw new Error(
        `楠岃瘉澶辫触: ${validationResult.errors.join('; ')}`
      );
    }

    if (validationResult.warnings.length > 0) {
      console.warn(
        `[AI鍒涗綔] 楠岃瘉璀﹀憡: ${validationResult.warnings.join('; ')}`
      );
    }

    console.log(`[AI鍒涗綔] 7灞傞獙璇侀€氳繃`);

    // ========================================================================
    // 闃舵6锛氫繚瀛楶NG+SVG鍒癛2
    // ========================================================================

    const storageResult = await saveGeneratedImages(executionResult, {
      userId: user.id,
      questionId,
      questionType: parameters.question_type,
    });

    if (!storageResult.success) {
      throw new Error(
        `鍥惧儚淇濆瓨澶辫触: ${storageResult.error || '鏈煡閿欒'}`
      );
    }

    console.log(
      `[AI鍒涗綔] 鍥惧儚宸蹭繚瀛橈紝PNG: ${storageResult.pngUrl}, SVG: ${storageResult.svgUrl}`
    );

    // ========================================================================
    // 闃舵7锛氭洿鏂版暟鎹簱璁板綍锛堢姸鎬侊細completed锛?
    // ========================================================================

    const { error: updateError } = await supabase
      .from('ai_created_questions')
      .update({
        question_text,
        python_code,
        image_url: storageResult.pngUrl || null,
        svg_url: storageResult.svgUrl || null,
        coordinate_data: coordinates as any,
        generation_status: 'completed',
        tokens_used: deepseekResult.tokens_used,
        generation_latency_ms:
          deepseekResult.latency_ms + executionResult.execution_time_ms,
      })
      .eq('id', questionId);

    if (updateError) {
      console.error('[AI鍒涗綔] 鏇存柊棰樼洰璁板綍澶辫触:', updateError);
      // 涓嶆姏鍑哄紓甯革紝鍥惧儚宸蹭繚瀛樻垚鍔?
    }

    // ========================================================================
    // 闃舵8锛氳褰曞璁℃棩蹇?
    // ========================================================================

    const totalExecutionTime = Date.now() - startTime;
    const estimatedCost = estimateCost(
      deepseekResult.tokens_used,
      executionResult.execution_time_ms
    );

    await QuotaManager.logAction(user.id, 'generate', {
      questionId,
      parameters: parameters as any,
      status: 'success',
      executionTimeMs: totalExecutionTime,
      quotaDeducted: true,
      tokensUsed: deepseekResult.tokens_used,
      costUsd: estimatedCost,
    });

    console.log(
      `[AI鍒涗綔] 鐢熸垚鎴愬姛锛屾€昏€楁椂: ${totalExecutionTime}ms锛屾垚鏈? $${estimatedCost.toFixed(4)}`
    );

    // ========================================================================
    // 杩斿洖缁撴灉
    // ========================================================================

    return {
      success: true,
      data: {
        questionId,
        questionText: question_text,
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
    // 閿欒澶勭悊锛氬洖婊氶厤棰濄€佹洿鏂扮姸鎬併€佽褰曟棩蹇?
    // ========================================================================

    console.error('[AI鍒涗綔] 鐢熸垚澶辫触:', error);

    // 鍥炴粴閰嶉
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
          console.log('[AI鍒涗綔] 閰嶉宸插洖婊?);
        }
      } catch (rollbackError) {
        console.error('[AI鍒涗綔] 閰嶉鍥炴粴澶辫触:', rollbackError);
      }
    }

    // 鏇存柊棰樼洰鐘舵€佷负澶辫触
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
        console.error('[AI鍒涗綔] 鏇存柊澶辫触鐘舵€侀敊璇?', updateError);
      }
    }

    // 璁板綍瀹¤鏃ュ織
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
      console.error('[AI鍒涗綔] 瀹¤鏃ュ織璁板綍澶辫触:', logError);
    }

    // 杩斿洖鐢ㄦ埛鍙嬪ソ鐨勯敊璇俊鎭?
    if (error instanceof E2BTimeoutError) {
      return {
        success: false,
        error: '浠ｇ爜鎵ц瓒呮椂锛?5绉掞級锛岃绠€鍖栭鐩弬鏁?,
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
        error: `鐢熸垚澶辫触: ${error.message}`,
        code: 'GENERATION_FAILED',
      };
    } else {
      return {
        success: false,
        error: '鐢熸垚澶辫触锛岃绋嶅悗閲嶈瘯',
        code: 'UNKNOWN_ERROR',
      };
    }
  }
}

// ============================================================================
// 杈呭姪鍑芥暟
// ============================================================================

/**
 * 鑾峰彇鐢ㄦ埛閰嶉淇℃伅
 */
export async function getUserQuota(): Promise<ActionResult<UserQuota>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '鏈櫥褰?, code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '鏈櫥褰?, code: 'UNAUTHORIZED' };
    }

    const quota = await QuotaManager.getQuota(user.id);

    return { success: true, data: quota };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '鑾峰彇閰嶉澶辫触',
    };
  }
}

/**
 * 鑾峰彇鐢ㄦ埛鍒涗綔鐨勯鐩垪琛?
 */
export async function getCreatedQuestions(options?: {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'generating' | 'completed' | 'failed';
}): Promise<ActionResult<AICreatedQuestion[]>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '鏈櫥褰?, code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '鏈櫥褰?, code: 'UNAUTHORIZED' };
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
      throw new Error(`鏌ヨ澶辫触: ${error.message}`);
    }

    return { success: true, data: data as AICreatedQuestion[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '鏌ヨ澶辫触',
    };
  }
}

/**
 * 鍒犻櫎鍒涗綔鐨勯鐩?
 */
export async function deleteCreatedQuestion(
  questionId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '鏈櫥褰?, code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '鏈櫥褰?, code: 'UNAUTHORIZED' };
    }

    // 楠岃瘉鎵€鏈夋潈
    const { data: question, error: fetchError } = await supabase
      .from('ai_created_questions')
      .select('user_id')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      return { success: false, error: '棰樼洰涓嶅瓨鍦?, code: 'NOT_FOUND' };
    }

    if (question.user_id !== user.id) {
      return { success: false, error: '鏃犳潈闄愬垹闄?, code: 'FORBIDDEN' };
    }

    // 鍒犻櫎璁板綍锛堝浘鍍忛€氳繃R2鐢熷懡鍛ㄦ湡绛栫暐鑷姩娓呯悊锛?
    const { error: deleteError } = await supabase
      .from('ai_created_questions')
      .delete()
      .eq('id', questionId);

    if (deleteError) {
      throw new Error(`鍒犻櫎澶辫触: ${deleteError.message}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '鍒犻櫎澶辫触',
    };
  }
}

// ============================================================================
// 鎴愭湰浼扮畻
// ============================================================================

/**
 * 浼扮畻鍗曟鐢熸垚鎴愭湰
 *
 * @param tokensUsed - DeepSeek tokens浣跨敤閲?
 * @param executionMs - E2B鎵ц鏃堕棿锛堟绉掞級
 * @returns 鎬绘垚鏈紙缇庡厓锛?
 */
function estimateCost(tokensUsed: number, executionMs: number): number {
  // DeepSeek鎴愭湰锛堝亣璁緄nput:output = 1:1锛?
  const deepseekCost =
    (tokensUsed / 2 / 1_000_000) * 0.14 +
    (tokensUsed / 2 / 1_000_000) * 0.28;

  // E2B鎴愭湰锛?0.10/灏忔椂锛?
  const e2bCost = (executionMs / 1000 / 3600) * 0.1;

  // R2鎴愭湰锛堝崟娆″啓鍏?+ 1涓湀瀛樺偍 + 1000娆¤鍙栵級
  const r2WriteCost = (1 / 1_000_000) * 4.5;
  const r2StorageCost = (2 / 1024) * 0.015; // 鍋囪2MB
  const r2ReadCost = (1000 / 1_000_000) * 0.36;
  const r2Cost = r2WriteCost + r2StorageCost + r2ReadCost;

  return deepseekCost + e2bCost + r2Cost;
}

