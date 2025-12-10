/**
 * 配额管理器
 *
 * 功能：
 * - 日配额管理（默认20题/天，可手动调整）
 * - 并发限制（默认2个任务同时进行）
 * - 速率限制（默认5次/分钟）
 * - 配额扣除和回滚
 * - 与数据库函数集成
 *
 * Codex建议的增强：
 * - 三层限制防止滥用
 * - 失败回滚机制
 * - 重试不扣配额策略
 * - 审计日志记录
 */

import { createServiceSupabaseClient } from '@/lib/supabase/server';
import type { UserQuota, CheckQuotaResponse } from './types';

// ============================================================================
// 配置
// ============================================================================

const QUOTA_CONFIG = {
  defaultDailyLimit: parseInt(
    process.env.AI_CREATOR_DEFAULT_DAILY_LIMIT || '20',
    10
  ),
  defaultConcurrentLimit: parseInt(
    process.env.AI_CREATOR_CONCURRENT_LIMIT || '2',
    10
  ),
  defaultRateLimitPerMinute: parseInt(
    process.env.AI_CREATOR_RATE_LIMIT_PER_MINUTE || '5',
    10
  ),
  retryDeductQuota:
    process.env.AI_CREATOR_RETRY_DEDUCT_QUOTA === 'true',
} as const;

// ============================================================================
// 错误类
// ============================================================================

/**
 * 配额错误
 */
export class QuotaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly remaining: number = 0
  ) {
    super(message);
    this.name = 'QuotaError';
  }
}

/**
 * 日配额超限错误
 */
export class DailyLimitExceededError extends QuotaError {
  constructor(remaining: number) {
    super(
      '已达到每日生成限额，请明天再试',
      'DAILY_LIMIT_EXCEEDED',
      remaining
    );
  }
}

/**
 * 并发限制错误
 */
export class ConcurrencyLimitError extends QuotaError {
  constructor(limit: number) {
    super(
      `同时进行的任务数已达上限（${limit}），请等待其他任务完成`,
      'CONCURRENCY_LIMIT_EXCEEDED',
      0
    );
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends QuotaError {
  constructor(retryAfterSeconds: number) {
    super(
      `请求过于频繁，请${retryAfterSeconds}秒后重试`,
      'RATE_LIMIT_EXCEEDED',
      0
    );
  }
}

// ============================================================================
// 配额管理器类
// ============================================================================

export class QuotaManager {
  /**
   * 检查用户配额（三层检查）
   *
   * @param userId - 用户ID
   * @returns 配额检查结果
   */
  static async checkQuota(userId: string): Promise<CheckQuotaResponse> {
    const supabase = createServiceSupabaseClient();

    // 调用数据库函数：get_or_create_user_quota
    const { data: quotaData, error: quotaError } = await supabase.rpc(
      'get_or_create_user_quota',
      { p_user_id: userId }
    );

    if (quotaError) {
      console.error('[QuotaManager] 获取配额失败:', quotaError);
      throw new Error(`获取配额失败: ${quotaError.message}`);
    }

    const quota = quotaData as UserQuota;

    // 调用数据库函数：check_creation_quota
    const { data: checkData, error: checkError } = await supabase.rpc(
      'check_creation_quota',
      { p_user_id: userId }
    );

    if (checkError) {
      console.error('[QuotaManager] 检查配额失败:', checkError);
      throw new Error(`检查配额失败: ${checkError.message}`);
    }

    const result = checkData as {
      can_create: boolean;
      remaining: number;
      reason: string | null;
    };

    return {
      can_create: result.can_create,
      remaining: result.remaining,
      reason: result.reason,
      quota,
    };
  }

  /**
   * 检查并扣除配额
   *
   * @param userId - 用户ID
   * @returns 剩余配额
   */
  static async checkAndDeductQuota(
    userId: string
  ): Promise<{ remaining: number }> {
    // 1. 检查配额
    const checkResult = await this.checkQuota(userId);

    if (!checkResult.can_create) {
      // 根据原因抛出具体错误
      if (checkResult.reason?.includes('日限额')) {
        throw new DailyLimitExceededError(checkResult.remaining);
      } else if (checkResult.reason?.includes('并发')) {
        throw new ConcurrencyLimitError(
          checkResult.quota.concurrent_limit
        );
      } else if (checkResult.reason?.includes('频繁')) {
        // 从reason中提取秒数（如果有）
        throw new RateLimitError(60);
      } else {
        throw new QuotaError(
          checkResult.reason || '配额检查失败',
          'QUOTA_CHECK_FAILED',
          checkResult.remaining
        );
      }
    }

    // 2. 扣除配额
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.rpc('deduct_creation_quota', {
      p_user_id: userId,
      p_deduct_amount: 1,
    });

    if (error) {
      console.error('[QuotaManager] 扣除配额失败:', error);
      throw new Error(`扣除配额失败: ${error.message}`);
    }

    if (!data) {
      // 扣除失败（可能是并发竞争）
      throw new DailyLimitExceededError(0);
    }

    console.log(`[QuotaManager] 已扣除配额，用户: ${userId}`);

    return {
      remaining: checkResult.remaining - 1,
    };
  }

  /**
   * 回滚配额（失败时退还）
   *
   * @param userId - 用户ID
   * @param reason - 回滚原因
   */
  static async rollbackQuota(
    userId: string,
    reason: string
  ): Promise<void> {
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase.rpc(
      'rollback_creation_quota',
      {
        p_user_id: userId,
        p_rollback_amount: 1,
      }
    );

    if (error) {
      console.error('[QuotaManager] 回滚配额失败:', error);
      // 不抛出异常，避免掩盖原始错误
      return;
    }

    console.log(
      `[QuotaManager] 已回滚配额，用户: ${userId}，原因: ${reason}`
    );
  }

  /**
   * 获取用户配额信息
   *
   * @param userId - 用户ID
   * @returns 配额信息
   */
  static async getQuota(userId: string): Promise<UserQuota> {
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase.rpc(
      'get_or_create_user_quota',
      { p_user_id: userId }
    );

    if (error) {
      throw new Error(`获取配额失败: ${error.message}`);
    }

    return data as UserQuota;
  }

  /**
   * 更新用户配额（仅管理员）
   *
   * @param userId - 用户ID
   * @param updates - 更新内容
   */
  static async updateQuota(
    userId: string,
    updates: Partial<UserQuota>
  ): Promise<UserQuota> {
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from('ai_creation_quotas')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`更新配额失败: ${error.message}`);
    }

    console.log(`[QuotaManager] 已更新配额，用户: ${userId}`);

    return data as UserQuota;
  }

  /**
   * 检查速率限制（应用层实现）
   *
   * 使用Redis或内存缓存实现滑动窗口速率限制
   * 注：这是简化版本，生产环境建议使用Redis
   */
  static async checkRateLimit(
    userId: string,
    windowMs: number = 60000 // 1分钟
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    // TODO: 使用Redis实现滑动窗口速率限制
    // 当前简化版本：查询最近1分钟的审计日志数量

    const supabase = createServiceSupabaseClient();
    const oneMinuteAgo = new Date(Date.now() - windowMs).toISOString();

    const { data, error } = await supabase
      .from('ai_creation_audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo);

    if (error) {
      console.error('[QuotaManager] 检查速率限制失败:', error);
      // 失败时允许通过，避免误杀
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const recentCount = data?.length || 0;
    const limit = QUOTA_CONFIG.defaultRateLimitPerMinute;

    if (recentCount >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  /**
   * 获取当前并发任务数
   */
  static async getConcurrentGenerations(
    userId: string
  ): Promise<number> {
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from('ai_created_questions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('generation_status', 'generating');

    if (error) {
      console.error(
        '[QuotaManager] 获取并发任务数失败:',
        error
      );
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * 记录审计日志
   */
  static async logAction(
    userId: string,
    action: string,
    details: {
      questionId?: string;
      parameters?: Record<string, any>;
      status: 'success' | 'failed' | 'timeout' | 'security_blocked';
      errorMessage?: string;
      executionTimeMs?: number;
      quotaDeducted?: boolean;
      tokensUsed?: number;
      costUsd?: number;
    }
  ): Promise<void> {
    const supabase = createServiceSupabaseClient();

    const { error } = await supabase
      .from('ai_creation_audit_logs')
      .insert({
        user_id: userId,
        action,
        question_id: details.questionId || null,
        parameters: details.parameters || null,
        status: details.status,
        error_message: details.errorMessage || null,
        execution_time_ms: details.executionTimeMs || null,
        quota_deducted: details.quotaDeducted ?? true,
        tokens_used: details.tokensUsed || null,
        cost_usd: details.costUsd || null,
      });

    if (error) {
      console.error('[QuotaManager] 记录审计日志失败:', error);
      // 不抛出异常，避免影响主流程
    }
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 处理重试策略
 *
 * @param userId - 用户ID
 * @param questionId - 题目ID
 * @returns 是否需要扣除配额
 */
export async function shouldDeductQuotaForRetry(
  userId: string,
  questionId: string
): Promise<boolean> {
  // 如果配置为重试扣除配额，返回true
  if (QUOTA_CONFIG.retryDeductQuota) {
    return true;
  }

  // 否则检查重试次数（如果超过一定次数，开始扣除）
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('ai_creation_audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .eq('action', 'retry');

  if (error || !data) {
    // 查询失败，默认不扣除
    return false;
  }

  const retryCount = data.length || 0;
  const maxFreeRetries = 2; // 前2次重试不扣配额

  return retryCount >= maxFreeRetries;
}

/**
 * 估算总成本（用户累计）
 */
export async function getUserTotalCost(
  userId: string
): Promise<number> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('ai_creation_audit_logs')
    .select('cost_usd')
    .eq('user_id', userId)
    .not('cost_usd', 'is', null);

  if (error) {
    console.error('[QuotaManager] 获取总成本失败:', error);
    return 0;
  }

  const totalCost = data.reduce(
    (sum, log) => sum + (log.cost_usd || 0),
    0
  );

  return totalCost;
}
