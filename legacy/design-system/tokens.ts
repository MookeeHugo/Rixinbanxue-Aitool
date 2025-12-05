/**
 * 日新平台 - 设计令牌（Design Tokens）
 *
 * 基于 Style Dictionary 规范，提供类型安全的设计变量
 * https://amzn.github.io/style-dictionary
 */

export const colors = {
  // ===== 主色调 - 蓝紫渐变 =====
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',  // 默认主色
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // ===== 功能色 =====
  success: {
    50: '#ecfdf5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // ===== 中性色 =====
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // ===== 渐变色 =====
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primaryHover: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
    secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", monospace',
    serif: '"Merriweather", "Noto Serif SC", "Georgia", serif',
  },
  fontSize: {
    '5xl': ['3rem', { lineHeight: '1.2' }],        // 48px
    '4xl': ['2.25rem', { lineHeight: '1.3' }],     // 36px
    '3xl': ['1.875rem', { lineHeight: '1.3' }],    // 30px
    '2xl': ['1.5rem', { lineHeight: '1.4' }],      // 24px
    'xl': ['1.25rem', { lineHeight: '1.5' }],      // 20px
    'base': ['1rem', { lineHeight: '1.6' }],       // 16px (默认)
    'sm': ['0.875rem', { lineHeight: '1.5' }],     // 14px
    'xs': ['0.75rem', { lineHeight: '1.4' }],      // 12px
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px (默认)
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px  - Tag
  md: '0.5rem',     // 8px  - 按钮、输入框 (默认)
  lg: '0.75rem',    // 12px - 卡片
  xl: '1rem',       // 16px - 大卡片
  '2xl': '1.5rem',  // 24px - Hero
  full: '9999px',   // 圆形 - 头像、徽章
} as const;

export const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  primary: '0 10px 30px -5px rgba(139, 92, 246, 0.3)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

export const transitions = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  1: '1',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
} as const;

// ===== 类型导出 =====
export type ColorKey = keyof typeof colors;
export type ColorShade = keyof typeof colors.primary;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type BoxShadow = keyof typeof boxShadow;
export type Breakpoint = keyof typeof breakpoints;
export type ZIndex = keyof typeof zIndex;

// ===== 工具函数 =====

/**
 * 获取颜色值
 * @example getColor('primary', 500) => '#8b5cf6'
 */
export function getColor(
  color: 'primary' | 'success' | 'warning' | 'error' | 'gray',
  shade: number
): string {
  const colorObj = colors[color] as any;
  return colorObj[shade] || colorObj[500]; // 回退到 500 如果 shade 不存在
}

/**
 * 获取间距值
 * @example getSpacing(4) => '1rem' (16px)
 */
export function getSpacing(size: keyof typeof spacing): string {
  return spacing[size];
}

/**
 * 获取阴影值
 * @example getShadow('md') => '0 4px 6px -1px rgba(0, 0, 0, 0.1)...'
 */
export function getShadow(level: keyof typeof boxShadow): string {
  return boxShadow[level];
}

/**
 * 媒体查询工具
 * @example mediaQuery('md') => '@media (min-width: 768px)'
 */
export function mediaQuery(breakpoint: keyof typeof breakpoints): string {
  return `@media (min-width: ${breakpoints[breakpoint]})`;
}

// ===== 语义化令牌（Semantic Tokens） =====
export const semanticTokens = {
  colors: {
    // 页面
    background: {
      default: 'hsl(0 0% 100%)',
      muted: colors.gray[50],
      card: 'hsl(0 0% 100%)',
    },
    foreground: {
      default: colors.gray[900],
      muted: colors.gray[500],
      subtle: colors.gray[400],
    },

    // 边框
    border: {
      default: colors.gray[200],
      muted: colors.gray[100],
    },

    // 状态色
    state: {
      success: colors.success[500],
      warning: colors.warning[500],
      error: colors.error[500],
      info: colors.primary[500],
    },

    // 交互
    interactive: {
      primary: colors.primary[500],
      primaryHover: colors.primary[600],
      secondary: colors.gray[200],
      secondaryHover: colors.gray[300],
    },

    // 功能色（日新平台专用）
    custom: {
      formulaBg: colors.primary[50],
      formulaBorder: colors.primary[200],
      aiBadge: '#667eea',
      difficultyEasy: colors.success[500],
      difficultyMedium: colors.warning[500],
      difficultyHard: colors.error[500],
    },
  },

  spacing: {
    componentPadding: spacing[4],    // 16px - 组件内边距
    componentGap: spacing[6],        // 24px - 组件间距
    sectionGap: spacing[12],         // 48px - 区块间距
    pagePadding: spacing[6],         // 24px - 页面边距
  },

  borderRadius: {
    component: borderRadius.md,      // 8px  - 组件默认圆角
    card: borderRadius.lg,           // 12px - 卡片圆角
    modal: borderRadius.xl,          // 16px - 模态框圆角
  },
} as const;

// ===== 导出所有令牌 =====
export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  boxShadow,
  transitions,
  breakpoints,
  zIndex,
  semanticTokens,
} as const;

export default tokens;
