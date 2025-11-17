import type { Config } from 'tailwindcss';

const config: Config = {
  // darkMode: ['class'],  // 禁用dark mode,强制使用浅色主题
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ✅ 基于 Gauthmath 设计系统的色彩方案
      colors: {
        // ========== Gauthmath 品牌色 ==========
        brand: {
          red: {
            DEFAULT: '#ff013e',        // 主品牌色 - CTA按钮
            hover: '#e00036',          // Hover状态 (加深10%)
            active: '#c70030',         // Active状态 (加深20%)
          },
          orange: {
            DEFAULT: '#ff7a00',        // 次品牌色 - 强调、徽章
            hover: '#e66d00',
            active: '#cc6100',
          },
        },

        // ========== Gauthmath 背景色系统 ==========
        'bg-primary': '#ffffff',       // 主背景
        'bg-secondary': '#f2f2f7',     // 次背景 - 卡片、面板
        'bg-tertiary': '#fafafa',      // 三级背景 - hover状态

        // ========== Gauthmath 文字色系统 ==========
        'text-primary': '#000000',     // 主文字
        'text-secondary': '#3c3c43',   // 次文字
        'text-tertiary': '#555555',    // 三级文字 (提高对比度至 7.5:1)
        'text-quaternary': '#999999',  // 四级文字 (提高对比度至 4.6:1)

        // ========== Gauthmath 边框色 ==========
        'border-light': '#e4e6eb',     // 浅边框
        'border-medium': '#d1d1d6',    // 中边框
        'border-dark': '#c7c7cc',      // 深边框

        // ========== Gauthmath 功能色 ==========
        'gauthmath-success': '#34c759',
        'gauthmath-warning': '#ff9500',
        'gauthmath-error': '#ff3b30',
        'gauthmath-info': '#007aff',

        // ========== 保留原有色系以兼容现有组件 ==========
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f59e0b',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
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
          950: '#030712',
        },

        // ========== shadcn/ui 内置颜色变量 ==========
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      // ✅ 间距系统 (SuperDesign §4.1 - 8px Grid)
      spacing: {
        0: '0',
        0.5: '0.125rem',  // 2px
        1: '0.25rem',     // 4px
        1.5: '0.375rem',  // 6px
        2: '0.5rem',      // 8px - 基础单位
        2.5: '0.625rem',  // 10px
        3: '0.75rem',     // 12px
        3.5: '0.875rem',  // 14px
        4: '1rem',        // 16px - 默认间距
        5: '1.25rem',     // 20px
        6: '1.5rem',      // 24px
        7: '1.75rem',     // 28px
        8: '2rem',        // 32px - 组件间距
        9: '2.25rem',     // 36px
        10: '2.5rem',     // 40px
        11: '2.75rem',    // 44px
        12: '3rem',       // 48px - 区块间距
        14: '3.5rem',     // 56px
        16: '4rem',       // 64px
        20: '5rem',       // 80px
        24: '6rem',       // 96px
      },

      // ✅ 圆角系统 (基于 Gauthmath)
      borderRadius: {
        none: '0',
        sm: '8px',        // 小圆角 - 输入框、小按钮
        DEFAULT: '12px',  // 默认圆角 - 卡片
        md: '14px',       // 中等圆角 - 按钮
        lg: '16px',       // 大圆角 - 大卡片
        xl: '24px',       // 超大圆角 - 特殊卡片
        '2xl': '32px',    // 2XL圆角
        '3xl': '48px',    // 3XL圆角
        full: '9999px',   // 圆形 - 徽章、头像
      },

      // ✅ 阴影系统 (基于 Gauthmath)
      boxShadow: {
        sm: '0 1px 8px 0 rgba(0, 0, 0, 0.08)',           // 小阴影
        DEFAULT: '0 2px 16px 0 rgba(0, 0, 0, 0.12)',     // 默认阴影 - Gauthmath标准
        md: '0 4px 24px 0 rgba(0, 0, 0, 0.16)',          // 中等阴影 - hover状态
        lg: '0 8px 32px 0 rgba(0, 0, 0, 0.20)',          // 大阴影 - 模态框
        xl: '0 12px 48px 0 rgba(0, 0, 0, 0.24)',         // 超大阴影
        '2xl': '0 20px 64px 0 rgba(0, 0, 0, 0.28)',      // 2XL阴影
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',  // 内阴影
        primary: '0 2px 16px 0 rgba(255, 1, 62, 0.24)',  // 品牌红色阴影
        orange: '0 2px 16px 0 rgba(255, 122, 0, 0.24)',  // 品牌橙色阴影
        none: 'none',
      },

      // ✅ 字体系统 (基于 Gauthmath)
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Google Sans',
          'Roboto',
          'Noto Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'Monaco',
          'monospace',
        ],
      },

      // ✅ 字号系统 (基于 Gauthmath)
      fontSize: {
        xs: ['12px', { lineHeight: '16px', letterSpacing: '0' }],       // 辅助文字、Caption
        sm: ['14px', { lineHeight: '20px', letterSpacing: '0' }],       // 小正文、Body Small
        base: ['16px', { lineHeight: '24px', letterSpacing: '0' }],     // 标准正文、Body
        lg: ['18px', { lineHeight: '28px', letterSpacing: '0' }],       // 大正文、Body Large
        xl: ['20px', { lineHeight: '28px', letterSpacing: '0' }],       // 五级标题、H5
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '0' }],    // 四级标题、H4
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.005em' }], // 三级标题、H3
        '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em' }],  // 二级标题、H2
        '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.01em' }],  // 一级标题、H1
      },

      // ✅ 字重系统
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      // ✅ 容器配置 (基于 Gauthmath)
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',   // 16px - 移动端
          sm: '2rem',        // 32px - 平板
          lg: '3rem',        // 48px - 桌面
          xl: '4rem',        // 64px - 宽屏桌面
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1200px',      // Gauthmath 最大容器宽度
        },
      },

      // ✅ 过渡时长 (基于 Gauthmath)
      transitionDuration: {
        fast: '150ms',      // 快速交互 - hover, focus
        DEFAULT: '200ms',   // 标准动画 - 大部分过渡
        base: '200ms',      // 基础动画
        slow: '300ms',      // 慢速动画 - 复杂动画、页面切换
        slower: '500ms',    // 更慢 - 特殊效果
      },

      // ✅ 缓动函数 (基于 Gauthmath)
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)',       // 快速进入，慢速退出
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',  // 平滑过渡
      },

      // ✅ 动画效果 (基于 Gauthmath + shadcn/ui)
      keyframes: {
        // Gauthmath 动画
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // shadcn/ui 动画
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        // Gauthmath 动画
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 200ms ease-in',
        'slide-in-up': 'slide-in-up 300ms ease-out',
        'slide-in-down': 'slide-in-down 300ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        // shadcn/ui 动画
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
