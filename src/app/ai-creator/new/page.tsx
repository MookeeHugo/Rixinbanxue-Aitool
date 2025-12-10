'use client';

/**
 * AI创作 - 新建题目页面
 *
 * 功能：
 * - 题型选择（函数、统计、几何）
 * - 参数编辑
 * - 生成预览
 * - 配额管理
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ParameterEditor } from '../_components/ParameterEditor';
import { QuotaIndicator } from '../_components/QuotaIndicator';
import { generateMathQuestion } from '@/app/actions/ai-creator';
import { QuestionType, DiagramType, Difficulty } from '@/lib/ai-creator/types';
import type {
  GenerationParameters,
  UserQuota,
} from '@/lib/ai-creator/types';
import type { GenerationResult } from '@/app/actions/ai-creator';

// ============================================================================
// 题型配置
// ============================================================================

const QUESTION_TYPES = [
  {
    value: 'function' as QuestionType,
    label: '函数图像',
    description: '线性函数、二次函数等',
    diagrams: [
      { value: 'linear' as DiagramType, label: '线性函数', icon: '📈' },
      { value: 'quadratic' as DiagramType, label: '二次函数', icon: '📊' },
    ],
  },
  // Week 4: 添加统计图表
  // Week 5-6: 添加几何图形
] as const;

// ============================================================================
// 组件
// ============================================================================

export default function NewQuestionPage() {
  const router = useRouter();

  // 题型选择
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.FUNCTION);
  const [diagramType, setDiagramType] = useState<DiagramType>(DiagramType.LINEAR);

  // 参数
  const [parameters, setParameters] = useState<Partial<GenerationParameters>>({
    difficulty: Difficulty.MEDIUM,
    coef_a: 2,
    coef_b: 3,
    domain: [-10, 10],
  });
  const [parametersValid, setParametersValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 生成状态
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 配额
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const canGenerate = quota && quota.daily_used < quota.daily_limit && parametersValid && !generating;

  // 获取当前题型配置
  const currentType = QUESTION_TYPES.find((t) => t.value === questionType);
  const currentDiagrams = currentType?.diagrams || [];

  // 处理题型切换
  const handleQuestionTypeChange = (type: QuestionType) => {
    setQuestionType(type);
    const newType = QUESTION_TYPES.find((t) => t.value === type);
    if (newType && newType.diagrams.length > 0) {
      const firstDiagram = newType.diagrams[0].value;
      setDiagramType(firstDiagram);

      // 根据默认图表类型设置参数
      if (firstDiagram === DiagramType.LINEAR) {
        setParameters({
          difficulty: Difficulty.MEDIUM,
          coef_a: 2,
          coef_b: 3,
          domain: [-10, 10],
        });
      } else if (firstDiagram === DiagramType.QUADRATIC) {
        setParameters({
          difficulty: Difficulty.MEDIUM,
          coef_a: 1,
          coef_b: 0,
          coef_c: -4,
          domain: [-10, 10],
        });
      }
    }
    setResult(null);
    setError(null);
  };

  // 处理图表类型切换
  const handleDiagramTypeChange = (type: DiagramType) => {
    setDiagramType(type);

    // 根据图表类型设置默认参数
    if (type === DiagramType.LINEAR) {
      setParameters({
        difficulty: parameters.difficulty || Difficulty.MEDIUM,
        coef_a: parameters.coef_a ?? 2,
        coef_b: parameters.coef_b ?? 3,
        domain: parameters.domain ?? [-10, 10],
      });
    } else if (type === DiagramType.QUADRATIC) {
      setParameters({
        difficulty: parameters.difficulty || Difficulty.MEDIUM,
        coef_a: parameters.coef_a ?? 1,
        coef_b: parameters.coef_b ?? 0,
        coef_c: (parameters as any).coef_c ?? -4,
        domain: parameters.domain ?? [-10, 10],
      });
    }

    setResult(null);
    setError(null);
  };

  // 生成题目
  const handleGenerate = async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const fullParams: GenerationParameters = {
        question_type: questionType,
        diagram_type: diagramType,
        ...parameters,
      } as GenerationParameters;

      const response = await generateMathQuestion(fullParams);

      if (response.success && response.data) {
        setResult(response.data);
        // 刷新配额
        const quotaResult = await import('@/app/actions/ai-creator').then((m) =>
          m.getUserQuota()
        );
        if (quotaResult.success && quotaResult.data) {
          setQuota(quotaResult.data);
        }
      } else {
        setError(response.error || '生成失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/ai-creator')}
            className="text-sm text-forest-600 hover:text-forest-700 mb-4 flex items-center gap-1"
          >
            ← 返回列表
          </button>
          <h1 className="text-3xl font-bold text-neutral-900">
            AI创作数学题
          </h1>
          <p className="mt-2 text-neutral-600">
            选择题型和参数，AI将自动生成专业的数学题目和配图
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：配置区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 题型选择 */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                1. 选择题型
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleQuestionTypeChange(type.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      questionType === type.value
                        ? 'border-forest-500 bg-forest-50'
                        : 'border-neutral-200 hover:border-forest-300'
                    }`}
                  >
                    <h3 className="font-medium text-neutral-900">
                      {type.label}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 图表类型选择 */}
            {currentDiagrams.length > 0 && (
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                  2. 选择图表类型
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {currentDiagrams.map((diagram) => (
                    <button
                      key={diagram.value}
                      onClick={() => handleDiagramTypeChange(diagram.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        diagramType === diagram.value
                          ? 'border-forest-500 bg-forest-50'
                          : 'border-neutral-200 hover:border-forest-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{diagram.icon}</div>
                      <div className="text-sm font-medium text-neutral-900">
                        {diagram.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 参数编辑 */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                3. 配置参数
              </h2>
              <ParameterEditor
                questionType={questionType}
                diagramType={diagramType}
                value={parameters}
                onChange={setParameters}
                onValidationChange={(valid, errors) => {
                  setParametersValid(valid);
                  setValidationErrors(errors);
                }}
              />
            </div>

            {/* 生成按钮 */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                  canGenerate
                    ? 'bg-forest-600 hover:bg-forest-700 active:scale-95'
                    : 'bg-neutral-300 cursor-not-allowed'
                }`}
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    正在生成中...
                  </span>
                ) : (
                  '🚀 开始生成'
                )}
              </button>

              {!parametersValid && validationErrors.length > 0 && (
                <p className="mt-3 text-sm text-red-600">
                  请修正参数错误后重试
                </p>
              )}

              {quota && quota.daily_used >= quota.daily_limit && (
                <p className="mt-3 text-sm text-red-600">
                  今日配额已用完
                </p>
              )}
            </div>
          </div>

          {/* 右侧：配额和结果 */}
          <div className="space-y-6">
            {/* 配额指示器 */}
            <QuotaIndicator onQuotaUpdate={setQuota} />

            {/* 生成结果 */}
            {result && (
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  ✅ 生成成功
                </h3>

                {/* 题目文本 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    题目
                  </label>
                  <p className="text-neutral-900 leading-relaxed">
                    {result.questionText}
                  </p>
                </div>

                {/* 图像预览 */}
                {result.imageUrl && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      图像
                    </label>
                    <img
                      src={result.imageUrl}
                      alt="生成的数学题图像"
                      className="w-full rounded-lg border border-neutral-200"
                    />
                  </div>
                )}

                {/* 统计信息 */}
                <div className="grid grid-cols-2 gap-3 text-xs text-neutral-600 border-t border-neutral-200 pt-4">
                  <div>
                    <span className="block text-neutral-500">耗时</span>
                    <span className="font-medium text-neutral-900">
                      {(result.executionTimeMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-500">成本</span>
                    <span className="font-medium text-neutral-900">
                      ${result.costEstimateUsd.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-500">Tokens</span>
                    <span className="font-medium text-neutral-900">
                      {result.tokensUsed}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-500">题目ID</span>
                    <span className="font-medium text-neutral-900 truncate">
                      {result.questionId.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => router.push(`/ai-creator/${result.questionId}`)}
                    className="flex-1 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors text-sm font-medium"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                    }}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
                  >
                    继续创作
                  </button>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="bg-white rounded-lg border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  ❌ 生成失败
                </h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  关闭
                </button>
              </div>
            )}

            {/* 使用提示 */}
            {!result && !error && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  💡 使用提示
                </h4>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>生成时间约10-30秒</li>
                  <li>建议先使用预设模板</li>
                  <li>支持实时参数调整</li>
                  <li>生成后可编辑和提交到题库</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
