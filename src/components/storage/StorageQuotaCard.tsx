/**
 * 存储配额卡片组件
 * 显示用户的存储使用情况
 */

'use client';

import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Progress } from '@/components/ui/progress';

interface StorageStats {
  userId: string;
  totalSize: number;
  recordingCount: number;
  completedCount: number;
  quota: number;
  remainingQuota: number;
  usagePercentage: number;
  formattedTotalSize: string;
  formattedQuota: string;
  formattedRemaining: string;
}

interface StorageQuotaCardProps {
  className?: string;
  autoRefresh?: boolean; // 是否自动刷新
  refreshInterval?: number; // 刷新间隔（毫秒）
}

export function StorageQuotaCard({
  className = '',
  autoRefresh = true,
  refreshInterval = 30000, // 默认 30 秒
}: StorageQuotaCardProps) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取存储统计
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/storage/stats');

      if (!res.ok) {
        if (res.status === 401) {
          setError('请先登录');
          return;
        }
        throw new Error('Failed to fetch storage stats');
      }

      const data = await res.json();
      setStats(data.stats);
      setError(null);
    } catch (err: any) {
      logger.error('Failed to fetch storage stats', err);
      setError('获取存储信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和自动刷新
  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // 手动刷新
  const handleRefresh = () => {
    setLoading(true);
    fetchStats();
  };

  // 获取配额使用状态颜色
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-orange-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  // 获取进度条颜色
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 border border-slate-700 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-400">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 border border-slate-700 ${className}`}>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-6 border border-slate-700 ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">存储使用情况</h3>
        <button
          onClick={handleRefresh}
          className="text-sm text-slate-400 hover:text-white transition-colors"
          title="刷新"
        >
          🔄
        </button>
      </div>

      {/* 使用量显示 */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-2xl font-bold text-white">
            {stats.formattedTotalSize}
          </div>
          <div className="text-sm text-slate-400">
            / {stats.formattedQuota}
          </div>
        </div>

        {/* 进度条 */}
        <div className="relative">
          <Progress
            value={stats.usagePercentage}
            className="h-3 bg-slate-700"
          />
          <div
            className={`absolute inset-0 h-3 rounded-full transition-all ${getProgressColor(stats.usagePercentage)}`}
            style={{ width: `${Math.min(stats.usagePercentage, 100)}%` }}
          />
        </div>

        {/* 百分比显示 */}
        <div className={`text-sm font-medium mt-2 ${getUsageColor(stats.usagePercentage)}`}>
          {stats.usagePercentage}% 已使用
        </div>
      </div>

      {/* 详细信息 */}
      <div className="space-y-3 border-t border-slate-700 pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">剩余空间</span>
          <span className="text-white font-medium">{stats.formattedRemaining}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">录制文件总数</span>
          <span className="text-white font-medium">{stats.recordingCount} 个</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">已完成录制</span>
          <span className="text-white font-medium">{stats.completedCount} 个</span>
        </div>
      </div>

      {/* 配额警告 */}
      {stats.usagePercentage >= 90 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-400">存储空间即将用完</div>
              <div className="text-xs text-red-300 mt-1">
                请删除不需要的录制文件以释放空间
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.usagePercentage >= 75 && stats.usagePercentage < 90 && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-orange-500 text-lg">💡</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-orange-400">存储空间偏高</div>
              <div className="text-xs text-orange-300 mt-1">
                建议定期清理旧的录制文件
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 简化版存储配额显示（用于嵌入其他页面）
 */
export function StorageQuotaBadge({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/storage/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        logger.error('Failed to fetch storage stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // 每分钟刷新
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return null;
  }

  const getColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500/20 border-red-500/50 text-red-400';
    if (percentage >= 75) return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    return 'bg-slate-700/50 border-slate-600 text-slate-300';
  };

  return (
    <div
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${getColor(stats.usagePercentage)} ${className}`}
    >
      存储: {stats.formattedTotalSize} / {stats.formattedQuota}
      {stats.usagePercentage >= 90 && ' ⚠️'}
    </div>
  );
}
