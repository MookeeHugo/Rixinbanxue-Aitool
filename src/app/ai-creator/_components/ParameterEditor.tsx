'use client';

/**
 * 参数编辑器组件
 *
 * 功能：
 * - 根据题型动态显示参数表单
 * - 实时验证参数（Zod schema）
 * - 支持预设模板
 * - 可视化参数说明
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type {
  GenerationParameters,
  QuestionType,
  DiagramType,
  Difficulty,
} from '@/lib/ai-creator/types';
import { validateFrontendParameters } from '@/lib/ai-creator/schemas';

// ============================================================================
// Props类型
// ============================================================================

interface ParameterEditorProps {
  questionType: QuestionType;
  diagramType: DiagramType;
  value: Partial<GenerationParameters>;
  onChange: (params: Partial<GenerationParameters>) => void;
  onValidationChange?: (valid: boolean, errors: string[]) => void;
}

// ============================================================================
// 预设模板
// ============================================================================

const PRESETS = {
  function: {
    linear: [
      {
        name: '基础线性函数',
        params: { coef_a: 2, coef_b: 3, domain: [-10, 10] as [number, number], difficulty: 'easy' as Difficulty },
      },
      {
        name: '斜率为负',
        params: { coef_a: -1, coef_b: 5, domain: [-10, 10] as [number, number], difficulty: 'medium' as Difficulty },
      },
      {
        name: '通过原点',
        params: { coef_a: 3, coef_b: 0, domain: [-10, 10] as [number, number], difficulty: 'easy' as Difficulty },
      },
    ],
    quadratic: [
      {
        name: '开口向上',
        params: { coef_a: 1, coef_b: 0, coef_c: -4, domain: [-10, 10] as [number, number], difficulty: 'medium' as Difficulty },
      },
      {
        name: '开口向下',
        params: { coef_a: -1, coef_b: 2, coef_c: 3, domain: [-10, 10] as [number, number], difficulty: 'medium' as Difficulty },
      },
      {
        name: '完全平方',
        params: { coef_a: 1, coef_b: -4, coef_c: 4, domain: [-10, 10] as [number, number], difficulty: 'hard' as Difficulty },
      },
    ],
  },
} as const;

// ============================================================================
// 组件
// ============================================================================

export function ParameterEditor({
  questionType,
  diagramType,
  value,
  onChange,
  onValidationChange,
}: ParameterEditorProps) {
  const [errors, setErrors] = useState<string[]>([]);

  // 使用 ref 保存最新的 onValidationChange，避免依赖变化
  const onValidationChangeRef = useRef(onValidationChange);
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  // 使用 useMemo 创建稳定的参数序列化 key
  const valueKey = useMemo(() => JSON.stringify(value), [value]);

  // 验证参数（只依赖参数的序列化值，不依赖对象引用）
  useEffect(() => {
    const fullParams = {
      question_type: questionType,
      diagram_type: diagramType,
      ...value,
    } as GenerationParameters;

    // 使用前端专用验证函数（仅验证当前支持的题型）
    const validation = validateFrontendParameters(fullParams);
    setErrors(validation.errors);

    if (onValidationChangeRef.current) {
      onValidationChangeRef.current(validation.valid, validation.errors);
    }
  }, [questionType, diagramType, valueKey]);

  // 更新参数
  const updateParam = (key: string, val: any) => {
    onChange({ ...value, [key]: val });
  };

  // 加载预设
  const loadPreset = (preset: any) => {
    onChange(preset.params);
  };

  // 获取当前预设列表
  const currentPresets = (PRESETS as any)[questionType]?.[diagramType] || [];

  return (
    <div className="space-y-6">
      {/* 预设模板 */}
      {currentPresets.length > 0 && (
        <div className="rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">
            预设模板
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {currentPresets.map((preset: any, index: number) => (
              <button
                key={index}
                onClick={() => loadPreset(preset)}
                className="px-3 py-2 text-sm rounded-md border border-neutral-300 hover:border-forest-500 hover:bg-forest-50 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 参数表单 */}
      <div className="space-y-4">
        {/* 难度 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            难度
          </label>
          <select
            value={value.difficulty || 'medium'}
            onChange={(e) => updateParam('difficulty', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </div>

        {/* 函数类型参数 */}
        {questionType === 'function' && (
          <>
            {diagramType === 'linear' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    系数 a（斜率）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={value.coef_a ?? 1}
                    onChange={(e) =>
                      updateParam('coef_a', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="例：2"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    a ≠ 0，正数表示上升，负数表示下降
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    系数 b（截距）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={value.coef_b ?? 0}
                    onChange={(e) =>
                      updateParam('coef_b', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="例：3"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    函数与y轴的交点
                  </p>
                </div>
              </>
            )}

            {diagramType === 'quadratic' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    系数 a（开口方向）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={value.coef_a ?? 1}
                    onChange={(e) =>
                      updateParam('coef_a', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="例：1"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    a &gt; 0 开口向上，a &lt; 0 开口向下
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    系数 b
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={value.coef_b ?? 0}
                    onChange={(e) =>
                      updateParam('coef_b', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="例：0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    系数 c（截距）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={value.coef_c ?? 0}
                    onChange={(e) =>
                      updateParam('coef_c', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="例：-4"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    函数与y轴的交点
                  </p>
                </div>
              </>
            )}

            {/* 定义域 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                定义域（x范围）
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={(value.domain as [number, number])?.[0] ?? -10}
                  onChange={(e) =>
                    updateParam('domain', [
                      parseFloat(e.target.value),
                      (value.domain as [number, number])?.[1] ?? 10,
                    ])
                  }
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="最小值"
                />
                <input
                  type="number"
                  value={(value.domain as [number, number])?.[1] ?? 10}
                  onChange={(e) =>
                    updateParam('domain', [
                      (value.domain as [number, number])?.[0] ?? -10,
                      parseFloat(e.target.value),
                    ])
                  }
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="最大值"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                推荐范围：-10 到 10
              </p>
            </div>
          </>
        )}
      </div>

      {/* 验证错误 */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <h4 className="text-sm font-medium text-red-900 mb-2">
            参数验证失败
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 参数预览 */}
      <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
        <h4 className="text-sm font-medium text-neutral-900 mb-2">
          参数预览
        </h4>
        <pre className="text-xs text-neutral-600 overflow-x-auto">
          {JSON.stringify(
            {
              question_type: questionType,
              diagram_type: diagramType,
              ...value,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
