/**
 * AI题库系统 - 显示辅助函数
 * @description 题目类型、难度等级的中文映射与格式化
 */

import type { QuestionType, DifficultyLevel } from './types';

/**
 * 题目类型中文映射
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: '选择题',
  fill: '填空题',
  essay: '简答题',
  proof: '证明题'
};

/**
 * 难度等级中文映射
 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

/**
 * 难度等级颜色映射（Tailwind CSS classes）
 */
export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  hard: 'bg-red-100 text-red-800 border-red-300'
};

/**
 * 获取题目类型的中文标签
 */
export function getQuestionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type] || type;
}

/**
 * 获取难度等级的中文标签
 */
export function getDifficultyLabel(difficulty: DifficultyLevel | string): string {
  return DIFFICULTY_LABELS[difficulty as DifficultyLevel] || difficulty;
}

/**
 * 获取难度等级的颜色class
 */
export function getDifficultyColor(difficulty: DifficultyLevel | string): string {
  return DIFFICULTY_COLORS[difficulty as DifficultyLevel] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * 格式化置信度为百分比
 */
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}

/**
 * 判断是否为低置信度
 */
export function isLowConfidence(confidence: number, threshold: number = 0.8): boolean {
  return confidence < threshold;
}
