/**
 * 日新平台 - 组件使用示例
 *
 * 展示如何使用设计系统创建一致的UI组件
 */

import React from 'react';
import { colors, spacing, borderRadius, boxShadow } from './tokens';

// ==========================================
// 示例1：题目卡片组件
// ==========================================

interface QuestionCardProps {
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  createdAt: string;
  onPreview: () => void;
  onAddToBasket: () => void;
}

export function QuestionCard({
  title,
  subject,
  difficulty,
  content,
  createdAt,
  onPreview,
  onAddToBasket,
}: QuestionCardProps) {
  const difficultyColors = {
    easy: colors.success[500],
    medium: colors.warning[500],
    hard: colors.error[500],
  };

  const difficultyLabels = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };

  return (
    <div
      className="group card-hover"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: borderRadius.lg,
        boxShadow: boxShadow.sm,
        overflow: 'hidden',
      }}
    >
      {/* 卡片头部 */}
      <div
        style={{
          padding: spacing[5],
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex justify-between items-start">
          <h3
            className="font-semibold line-clamp-2"
            style={{ fontSize: '1.25rem', lineHeight: '1.5' }}
          >
            {title}
          </h3>

          {/* 难度徽章 */}
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${difficultyColors[difficulty]}20`,
              color: difficultyColors[difficulty],
            }}
          >
            {difficultyLabels[difficulty]}
          </span>
        </div>

        {/* 科目标签 */}
        <p
          className="text-muted-foreground mt-2"
          style={{ fontSize: '0.875rem' }}
        >
          七年级上册 · {subject}
        </p>
      </div>

      {/* 卡片内容 */}
      <div style={{ padding: spacing[5] }}>
        <div
          className="formula-block line-clamp-3"
          style={{
            fontSize: '0.95rem',
            lineHeight: '1.6',
          }}
        >
          {content}
        </div>
      </div>

      {/* 卡片底部操作 */}
      <div
        className="flex justify-between items-center"
        style={{
          padding: `${spacing[4]} ${spacing[5]}`,
          background: 'hsl(var(--muted))',
          borderTop: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="btn-outline"
            style={{
              padding: `${spacing[2]} ${spacing[3]}`,
              fontSize: '0.875rem',
              borderRadius: borderRadius.md,
            }}
          >
            预览
          </button>
          <button
            onClick={onAddToBasket}
            className="gradient-primary"
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: '0.875rem',
              borderRadius: borderRadius.md,
              color: 'white',
              border: 'none',
            }}
          >
            添加到题篮
          </button>
        </div>

        <span
          className="text-muted-foreground"
          style={{ fontSize: '0.875rem' }}
        >
          {createdAt}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 示例2：按钮组件（带变体）
// ==========================================

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  onClick,
}: ButtonProps) {
  // 变体样式
  const variantStyles = {
    primary: {
      background: colors.gradients.primary,
      color: 'white',
      border: 'none',
      boxShadow: boxShadow.sm,
    },
    secondary: {
      background: colors.gray[200],
      color: colors.gray[900],
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: colors.gray[700],
      border: `1px solid ${colors.gray[300]}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.gray[700],
      border: 'none',
    },
    destructive: {
      background: colors.error[500],
      color: 'white',
      border: 'none',
    },
  };

  // 尺寸样式
  const sizeStyles = {
    sm: {
      height: '32px',
      padding: `0 ${spacing[3]}`,
      fontSize: '0.875rem',
    },
    default: {
      height: '40px',
      padding: `0 ${spacing[4]}`,
      fontSize: '1rem',
    },
    lg: {
      height: '48px',
      padding: `0 ${spacing[6]}`,
      fontSize: '1.125rem',
    },
    icon: {
      width: '40px',
      height: '40px',
      padding: '0',
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: borderRadius.md,
        fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
      }}
      className="hover:shadow-lg hover:-translate-y-0.5"
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        children
      )}
    </button>
  );
}

// ==========================================
// 示例3：输入框组件
// ==========================================

interface InputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  type?: 'text' | 'email' | 'password' | 'number';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  type = 'text',
  leftIcon,
  rightIcon,
}: InputProps) {
  return (
    <div style={{ position: 'relative' }}>
      {leftIcon && (
        <div
          style={{
            position: 'absolute',
            left: spacing[3],
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.gray[400],
          }}
        >
          {leftIcon}
        </div>
      )}

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          height: '40px',
          padding: `0 ${rightIcon ? spacing[10] : spacing[3]} 0 ${leftIcon ? spacing[10] : spacing[3]}`,
          background: 'hsl(var(--input))',
          border: error
            ? `1px solid ${colors.error[500]}`
            : '1px solid hsl(var(--border))',
          borderRadius: borderRadius.md,
          fontSize: '1rem',
          color: 'hsl(var(--foreground))',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
        className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
      />

      {rightIcon && (
        <div
          style={{
            position: 'absolute',
            right: spacing[3],
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.gray[400],
          }}
        >
          {rightIcon}
        </div>
      )}

      {error && (
        <p
          style={{
            marginTop: spacing[1],
            fontSize: '0.875rem',
            color: colors.error[500],
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ==========================================
// 示例4：徽章组件
// ==========================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'ai';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variantStyles = {
    default: {
      background: colors.gray[100],
      color: colors.gray[700],
    },
    success: {
      background: `${colors.success[500]}20`,
      color: colors.success[700],
    },
    warning: {
      background: `${colors.warning[500]}20`,
      color: colors.warning[600],
    },
    error: {
      background: `${colors.error[500]}20`,
      color: colors.error[700],
    },
    ai: {
      background: colors.gradients.primary,
      color: 'white',
    },
  };

  return (
    <span
      style={{
        ...variantStyles[variant],
        padding: `${spacing[1]} ${spacing[3]}`,
        borderRadius: borderRadius.full,
        fontSize: '0.75rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[1],
      }}
    >
      {children}
    </span>
  );
}

// ==========================================
// 示例5：骨架屏加载组件
// ==========================================

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  variant = 'rectangular',
  width = '100%',
  height = '20px',
  className,
}: SkeletonProps) {
  const borderRadiusMap = {
    text: borderRadius.sm,
    circular: borderRadius.full,
    rectangular: borderRadius.md,
  };

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        background: colors.gray[200],
        borderRadius: borderRadiusMap[variant],
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}

// ==========================================
// 示例6：使用设计令牌的完整页面
// ==========================================

export function QuestionLibraryPage() {
  const mockQuestions = [
    {
      id: 1,
      title: '因式分解：x² + 5x + 6',
      subject: '代数',
      difficulty: 'easy' as const,
      content: '将多项式 x² + 5x + 6 进行因式分解。',
      createdAt: '2025-11-15',
    },
    {
      id: 2,
      title: '解一元二次方程：2x² - 3x - 2 = 0',
      subject: '代数',
      difficulty: 'medium' as const,
      content: '使用公式法或配方法求解该方程。',
      createdAt: '2025-11-14',
    },
  ];

  return (
    <main
      className="container mx-auto"
      style={{
        maxWidth: '1280px',
        padding: spacing[12],
      }}
    >
      {/* 页面标题 */}
      <div style={{ marginBottom: spacing[8] }}>
        <h1
          className="gradient-text"
          style={{
            fontSize: '3rem',
            fontWeight: '700',
            marginBottom: spacing[2],
          }}
        >
          题库浏览
        </h1>
        <p
          className="text-muted-foreground"
          style={{ fontSize: '1.125rem' }}
        >
          探索海量优质数学题目，AI辅助题目管理
        </p>
      </div>

      {/* 搜索栏 */}
      <div style={{ marginBottom: spacing[6] }}>
        <Input
          placeholder="搜索题目标题、知识点..."
          leftIcon={<span>🔍</span>}
        />
      </div>

      {/* 题目卡片网格 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: spacing[6],
        }}
      >
        {mockQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            {...question}
            onPreview={() => alert(`预览题目 ${question.id}`)}
            onAddToBasket={() => alert(`添加题目 ${question.id}`)}
          />
        ))}
      </div>
    </main>
  );
}

// ==========================================
// 导出所有组件
// ==========================================

export default {
  QuestionCard,
  Button,
  Input,
  Badge,
  Skeleton,
  QuestionLibraryPage,
};
