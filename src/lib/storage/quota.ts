/**
 * 存储配额管理
 * 用于检查和管理录制文件的存储配额
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// 默认配额配置（字节）
export const QUOTA_CONFIG = {
  // 每个用户的存储配额 (5 GB)
  PER_USER_QUOTA: 5 * 1024 * 1024 * 1024,

  // 每个会话的最大录制数量
  MAX_RECORDINGS_PER_SESSION: 10,

  // 单个录制文件的最大大小 (2 GB)
  MAX_SINGLE_FILE_SIZE: 2 * 1024 * 1024 * 1024,

  // 全局存储配额 (100 GB)
  GLOBAL_QUOTA: 100 * 1024 * 1024 * 1024,
};

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  quota?: number;
  remainingQuota?: number;
}

/**
 * 存储配额管理器
 */
export class StorageQuotaManager {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * 检查用户存储配额
   * @param userId 用户ID
   * @param additionalSize 要添加的文件大小（字节）
   */
  async checkUserQuota(
    userId: string,
    additionalSize: number = 0
  ): Promise<QuotaCheckResult> {
    try {
      // 获取用户当前存储使用量
      const { data, error } = await this.supabase
        .from('live_recordings')
        .select('file_size')
        .eq('recorded_by', userId);

      if (error) {
        logger.error('Failed to fetch user storage usage', error, { userId });
        return {
          allowed: false,
          reason: 'Failed to check storage quota',
        };
      }

      const currentUsage = data.reduce(
        (sum, rec) => sum + (rec.file_size || 0),
        0
      );

      const newUsage = currentUsage + additionalSize;
      const quota = QUOTA_CONFIG.PER_USER_QUOTA;

      if (newUsage > quota) {
        logger.warn('User storage quota exceeded', {
          userId,
          currentUsage,
          additionalSize,
          newUsage,
          quota,
        });

        return {
          allowed: false,
          reason: `Storage quota exceeded. Current usage: ${this.formatBytes(currentUsage)}, Quota: ${this.formatBytes(quota)}`,
          currentUsage,
          quota,
          remainingQuota: Math.max(0, quota - currentUsage),
        };
      }

      return {
        allowed: true,
        currentUsage,
        quota,
        remainingQuota: quota - newUsage,
      };
    } catch (error: unknown) {
      logger.error('User quota check error', error, { userId });
      return {
        allowed: false,
        reason: 'Internal error checking quota',
      };
    }
  }

  /**
   * 检查会话录制数量限制
   * @param sessionId 会话ID
   */
  async checkSessionRecordingLimit(sessionId: string): Promise<QuotaCheckResult> {
    try {
      const { count, error } = await this.supabase
        .from('live_recordings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (error) {
        logger.error('Failed to fetch session recording count', error, { sessionId });
        return {
          allowed: false,
          reason: 'Failed to check recording limit',
        };
      }

      const currentCount = count || 0;
      const limit = QUOTA_CONFIG.MAX_RECORDINGS_PER_SESSION;

      if (currentCount >= limit) {
        logger.warn('Session recording limit exceeded', {
          sessionId,
          currentCount,
          limit,
        });

        return {
          allowed: false,
          reason: `Recording limit exceeded. Maximum ${limit} recordings per session.`,
          currentUsage: currentCount,
          quota: limit,
        };
      }

      return {
        allowed: true,
        currentUsage: currentCount,
        quota: limit,
      };
    } catch (error: unknown) {
      logger.error('Session recording limit check error', error, { sessionId });
      return {
        allowed: false,
        reason: 'Internal error checking recording limit',
      };
    }
  }

  /**
   * 检查单个文件大小限制
   * @param fileSize 文件大小（字节）
   */
  checkFileSizeLimit(fileSize: number): QuotaCheckResult {
    const limit = QUOTA_CONFIG.MAX_SINGLE_FILE_SIZE;

    if (fileSize > limit) {
      logger.warn('File size limit exceeded', {
        fileSize,
        limit,
      });

      return {
        allowed: false,
        reason: `File size exceeds limit. File: ${this.formatBytes(fileSize)}, Limit: ${this.formatBytes(limit)}`,
        quota: limit,
      };
    }

    return {
      allowed: true,
      quota: limit,
    };
  }

  /**
   * 检查全局存储配额
   * @param additionalSize 要添加的文件大小（字节）
   */
  async checkGlobalQuota(additionalSize: number = 0): Promise<QuotaCheckResult> {
    try {
      // 获取全局存储使用量
      const { data, error } = await this.supabase
        .from('live_recordings')
        .select('file_size');

      if (error) {
        logger.error('Failed to fetch global storage usage', error);
        return {
          allowed: false,
          reason: 'Failed to check global storage quota',
        };
      }

      const currentUsage = data.reduce(
        (sum, rec) => sum + (rec.file_size || 0),
        0
      );

      const newUsage = currentUsage + additionalSize;
      const quota = QUOTA_CONFIG.GLOBAL_QUOTA;

      if (newUsage > quota) {
        logger.error('Global storage quota exceeded', {
          currentUsage,
          additionalSize,
          newUsage,
          quota,
        });

        return {
          allowed: false,
          reason: 'System storage quota exceeded. Please contact support.',
          currentUsage,
          quota,
          remainingQuota: Math.max(0, quota - currentUsage),
        };
      }

      return {
        allowed: true,
        currentUsage,
        quota,
        remainingQuota: quota - newUsage,
      };
    } catch (error: unknown) {
      logger.error('Global quota check error', error);
      return {
        allowed: false,
        reason: 'Internal error checking global quota',
      };
    }
  }

  /**
   * 综合检查所有配额限制
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param fileSize 文件大小（字节）
   */
  async checkAllQuotas(
    userId: string,
    sessionId: string,
    fileSize: number
  ): Promise<QuotaCheckResult> {
    // 1. 检查文件大小限制
    const fileSizeCheck = this.checkFileSizeLimit(fileSize);
    if (!fileSizeCheck.allowed) {
      return fileSizeCheck;
    }

    // 2. 检查会话录制数量限制
    const sessionLimitCheck = await this.checkSessionRecordingLimit(sessionId);
    if (!sessionLimitCheck.allowed) {
      return sessionLimitCheck;
    }

    // 3. 检查用户存储配额
    const userQuotaCheck = await this.checkUserQuota(userId, fileSize);
    if (!userQuotaCheck.allowed) {
      return userQuotaCheck;
    }

    // 4. 检查全局存储配额
    const globalQuotaCheck = await this.checkGlobalQuota(fileSize);
    if (!globalQuotaCheck.allowed) {
      return globalQuotaCheck;
    }

    return {
      allowed: true,
      currentUsage: userQuotaCheck.currentUsage,
      quota: userQuotaCheck.quota,
      remainingQuota: userQuotaCheck.remainingQuota,
    };
  }

  /**
   * 获取用户存储使用统计
   * @param userId 用户ID
   */
  async getUserStorageStats(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('live_recordings')
        .select('file_size, status')
        .eq('recorded_by', userId);

      if (error) {
        logger.error('Failed to fetch user storage stats', error, { userId });
        return null;
      }

      const totalSize = data.reduce((sum, rec) => sum + (rec.file_size || 0), 0);
      const recordingCount = data.length;
      const completedCount = data.filter((rec) => rec.status === 'completed').length;
      const quota = QUOTA_CONFIG.PER_USER_QUOTA;

      return {
        userId,
        totalSize,
        recordingCount,
        completedCount,
        quota,
        remainingQuota: Math.max(0, quota - totalSize),
        usagePercentage: Math.round((totalSize / quota) * 100),
        formattedTotalSize: this.formatBytes(totalSize),
        formattedQuota: this.formatBytes(quota),
        formattedRemaining: this.formatBytes(Math.max(0, quota - totalSize)),
      };
    } catch (error: unknown) {
      logger.error('User storage stats error', error, { userId });
      return null;
    }
  }

  /**
   * 格式化字节数为可读字符串
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

/**
 * 创建存储配额管理器实例
 */
export function createQuotaManager(): StorageQuotaManager {
  return new StorageQuotaManager();
}
