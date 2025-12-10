'use client';

/**
 * AI创作 - 列表页
 *
 * 功能：
 * - 显示用户创作的题目列表
 * - 状态筛选（全部、生成中、已完成、失败）
 * - 分页加载
 * - 快速预览和操作
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCreatedQuestions, deleteCreatedQuestion } from '@/app/actions/ai-creator';
import { QuotaIndicator } from './_components/QuotaIndicator';
import type { AICreatedQuestion } from '@/lib/ai-creator/types';

// ============================================================================
// 状态标签组件
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: '等待中', color: 'bg-neutral-100 text-neutral-700' },
    generating: { label: '生成中', color: 'bg-blue-100 text-blue-700' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
    failed: { label: '失败', color: 'bg-red-100 text-red-700' },
  }[status] || { label: status, color: 'bg-neutral-100 text-neutral-700' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// 题目卡片组件
// ============================================================================

function QuestionCard({
  question,
  onDelete,
}: {
  question: AICreatedQuestion;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('确定要删除这道题目吗？')) return;

    setDeleting(true);
    const result = await deleteCreatedQuestion(question.id);

    if (result.success) {
      onDelete(question.id);
    } else {
      alert(`删除失败: ${result.error}`);
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow">
      {/* 头部：状态和时间 */}
      <div className="flex items-start justify-between mb-3">
        <StatusBadge status={question.generation_status} />
        <span className="text-xs text-neutral-500">
          {new Date(question.created_at).toLocaleString('zh-CN')}
        </span>
      </div>

      {/* 题目内容 */}
      <div className="mb-4">
        <h3 className="text-base font-medium text-neutral-900 mb-2 line-clamp-2">
          {question.question_text}
        </h3>
        <div className="flex items-center gap-3 text-xs text-neutral-600">
          <span className="px-2 py-1 bg-neutral-100 rounded">
            {question.question_type === 'function'
              ? '函数图像'
              : question.question_type === 'statistics'
              ? '统计图表'
              : '几何图形'}
          </span>
          {question.generation_parameters?.difficulty && (
            <span className="px-2 py-1 bg-neutral-100 rounded">
              {
                {
                  easy: '简单',
                  medium: '中等',
                  hard: '困难',
                }[question.generation_parameters.difficulty as string]
              }
            </span>
          )}
        </div>
      </div>

      {/* 图像预览 */}
      {question.image_url && (
        <div className="mb-4">
          <img
            src={question.image_url}
            alt="题目图像"
            className="w-full h-32 object-cover rounded-lg border border-neutral-200"
          />
        </div>
      )}

      {/* 统计信息 */}
      {question.generation_status === 'completed' && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-neutral-600">
          {question.deepseek_tokens_used && (
            <div>
              <span className="block text-neutral-500">Tokens</span>
              <span className="font-medium text-neutral-900">
                {question.deepseek_tokens_used}
              </span>
            </div>
          )}
          {question.e2b_execution_seconds && (
            <div>
              <span className="block text-neutral-500">执行时间</span>
              <span className="font-medium text-neutral-900">
                {question.e2b_execution_seconds.toFixed(1)}s
              </span>
            </div>
          )}
          {question.submitted_to_library && (
            <div>
              <span className="block text-neutral-500">状态</span>
              <span className="font-medium text-green-600">已入库</span>
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {question.generation_status === 'failed' && question.error_message && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{question.error_message}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/ai-creator/${question.id}`)}
          className="flex-1 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors text-sm font-medium"
        >
          查看详情
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {deleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function AICreatorListPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<AICreatedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'generating' | 'completed' | 'failed'
  >('all');

  // 加载题目列表
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const result = await getCreatedQuestions({
        limit: 50,
        status: filter === 'all' ? undefined : filter,
      });

      if (result.success && result.data) {
        setQuestions(result.data);
      } else {
        setError(result.error || '加载失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  // 处理删除
  const handleDelete = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                AI创作中心
              </h1>
              <p className="mt-2 text-neutral-600">
                管理你创作的数学题目
              </p>
            </div>
            <button
              onClick={() => router.push('/ai-creator/new')}
              className="px-6 py-3 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors font-medium"
            >
              + 创作新题目
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：配额和筛选 */}
          <div className="space-y-6">
            {/* 配额指示器 */}
            <QuotaIndicator />

            {/* 状态筛选 */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-3">
                状态筛选
              </h3>
              <div className="space-y-2">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'completed', label: '已完成' },
                  { value: 'generating', label: '生成中' },
                  { value: 'pending', label: '等待中' },
                  { value: 'failed', label: '失败' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFilter(item.value as any)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      filter === item.value
                        ? 'bg-forest-100 text-forest-700 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 快速入口 */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                💡 快速入口
              </h4>
              <div className="space-y-2 text-xs text-blue-700">
                <a
                  href="/questions"
                  className="block hover:underline"
                >
                  → 浏览题库
                </a>
                <a
                  href="/analytics"
                  className="block hover:underline"
                >
                  → 查看统计
                </a>
              </div>
            </div>
          </div>

          {/* 右侧：题目列表 */}
          <div className="lg:col-span-3">
            {/* 加载状态 */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-forest-600 border-r-transparent"></div>
                <p className="mt-4 text-neutral-600">加载中...</p>
              </div>
            )}

            {/* 错误状态 */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={loadQuestions}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  重试
                </button>
              </div>
            )}

            {/* 空状态 */}
            {!loading && !error && questions.length === 0 && (
              <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  还没有创作记录
                </h3>
                <p className="text-neutral-600 mb-6">
                  点击右上角&ldquo;创作新题目&rdquo;开始你的第一道AI创作
                </p>
                <button
                  onClick={() => router.push('/ai-creator/new')}
                  className="px-6 py-3 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors font-medium"
                >
                  开始创作
                </button>
              </div>
            )}

            {/* 题目列表 */}
            {!loading && !error && questions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
