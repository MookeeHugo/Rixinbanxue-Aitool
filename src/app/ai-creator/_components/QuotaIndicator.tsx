'use client';

/**
 * 配额指示器组件
 *
 * 功能：
 * - 显示日配额使用情况
 * - 实时更新剩余配额
 * - 配额不足时警告
 */

import { useEffect, useState } from 'react';
import { getUserQuota } from '@/app/actions/ai-creator';
import type { UserQuota } from '@/lib/ai-creator/types';

interface QuotaIndicatorProps {
  onQuotaUpdate?: (quota: UserQuota) => void;
}

export function QuotaIndicator({ onQuotaUpdate }: QuotaIndicatorProps) {
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = async () => {
    try {
      setLoading(true);
      const result = await getUserQuota();

      if (result.success && result.data) {
        setQuota(result.data);
        if (onQuotaUpdate) {
          onQuotaUpdate(result.data);
        }
      } else {
        setError(result.error || '获取配额失败');
      }
    } catch (err) {
      setError('获取配额失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    // 每30秒刷新一次
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 p-4 bg-white">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-4 w-4 bg-neutral-200 rounded"></div>
          <div className="h-4 flex-1 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error || '配额信息不可用'}</p>
      </div>
    );
  }

  const usedToday = quota.daily_used;
  const dailyRemaining = quota.daily_limit - quota.daily_used;
  const usagePercent = (usedToday / quota.daily_limit) * 100;
  const isLowQuota = dailyRemaining <= 5;
  const isNoQuota = dailyRemaining === 0;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isNoQuota
          ? 'border-red-300 bg-red-50'
          : isLowQuota
          ? 'border-yellow-300 bg-yellow-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-900">
          今日配额
        </h3>
        <button
          onClick={fetchQuota}
          className="text-xs text-forest-600 hover:text-forest-700 transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-neutral-600">
            已使用 {usedToday} / {quota.daily_limit}
          </span>
          <span
            className={`font-medium ${
              isNoQuota
                ? 'text-red-700'
                : isLowQuota
                ? 'text-yellow-700'
                : 'text-forest-700'
            }`}
          >
            剩余 {dailyRemaining} 次
          </span>
        </div>
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isNoQuota
                ? 'bg-red-500'
                : isLowQuota
                ? 'bg-yellow-500'
                : 'bg-forest-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
      </div>

      {/* 配额信息 */}
      <div className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
        <div>
          <span className="block text-neutral-500">并发限制</span>
          <span className="font-medium text-neutral-900">
            {quota.concurrent_limit} 个任务
          </span>
        </div>
        <div>
          <span className="block text-neutral-500">速率限制</span>
          <span className="font-medium text-neutral-900">
            {quota.rate_limit_per_minute} 次/分钟
          </span>
        </div>
      </div>

      {/* 警告信息 */}
      {isNoQuota && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-sm text-red-700">
            今日配额已用完，请明天再试
          </p>
        </div>
      )}

      {isLowQuota && !isNoQuota && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <p className="text-sm text-yellow-700">
            配额即将用完，请谨慎使用
          </p>
        </div>
      )}
    </div>
  );
}
