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
      // ✅ RixinMate 品牌色彩系统（森系配色）
      colors: {
        // ========== 主色系统（青葱系 #0AA344）==========
        primary: {
          DEFAULT: '#0AA344',    // 青葱绿 - 导航栏、链接、主按钮边框
          50: '#E6F7ED',
          100: '#CCEFE0',
          200: '#99DFC1',
          300: '#66CFA2',
          400: '#33BF83',
          500: '#0AA344',        // 核心色
          600: '#088336',        // Hover态
          700: '#066328',        // Active态
          800: '#04421A',
          900: '#02210D',
          950: '#011107',
        },
        // ========== 辅色系统（石青绿系 #92C292）==========
        accent: {
          DEFAULT: '#92C292',    // 石青绿 - 卡片、标签、次要按钮
          50: '#F3F9F3',
          100: '#E7F3E7',
          200: '#CFE7CF',
          300: '#B7DBB7',
          400: '#9FCF9F',
          500: '#92C292',        // 核心色
          600: '#75A875',
          700: '#5A8A5A',
          800: '#3E6C3E',
          900: '#1F361F',
          950: '#101B10',
        },

        // ========== 森系辅助色 ==========
        nature: {
          moss: '#6B8E6B',       // 苔藓绿
          sprout: '#D4E8D4',     // 嫩芽绿
          sage: '#A8BCA8',       // 鼠尾草绿
        },

        // ========== 已废弃：旧的紫色系统（保留以防兼容性问题）==========
        // slate: {
        //   50: '#f8f7fc',
        //   100: '#f1f0f9',
        //   200: '#e4e2f3',
        //   300: '#d1cee8',
        //   400: '#a8a3d4',
        //   500: '#8881e9',
        //   600: '#6b63c7',
        //   700: '#564cec',
        //   800: '#483ece',
        //   900: '#2d2680',
        //   950: '#090813',
        // },

        // ========== 语义色（森系配色） ==========
        success: {
          DEFAULT: '#0AA344',    // 使用青葱绿
          50: '#E6F7ED',
          100: '#CCEFE0',
          200: '#99DFC1',
          300: '#66CFA2',
          400: '#33BF83',
          500: '#0AA344',
          600: '#088336',
          700: '#066328',
          800: '#04421A',
          900: '#02210D',
        },
        info: {
          DEFAULT: '#92C292',    // 使用石青绿
          50: '#F3F9F3',
          100: '#E7F3E7',
          200: '#CFE7CF',
          300: '#B7DBB7',
          400: '#9FCF9F',
          500: '#92C292',
          600: '#75A875',
          700: '#5A8A5A',
          800: '#3E6C3E',
          900: '#1F361F',
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

        // ========== 已废弃：Gauthmath 遗留品牌色 ==========
        // brand: {
        //   red: '#ff013e',     // ❌ 已删除玫红色
        //   orange: '#ff7a00',  // ✅ 已迁移到 accent (#FF6B00)
        // },

        // ========== shadcn/ui 内置颜色变量 ==========
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
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

      // ✅ 阴影系统 (Swiss Spa 美学 - 超柔和阴影)
      boxShadow: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.02)',             // 微妙提升
        sm: '0 2px 4px rgba(0, 0, 0, 0.03)',             // 轻微提升
        DEFAULT: '0 2px 10px rgba(0, 0, 0, 0.03)',       // 卡片默认
        md: '0 2px 10px rgba(0, 0, 0, 0.03)',            // 卡片默认（别名）
        lg: '0 4px 20px rgba(0, 0, 0, 0.06)',            // 卡片悬停
        xl: '0 8px 40px rgba(0, 0, 0, 0.12)',            // 弹窗、抽屉
        '2xl': '0 12px 60px rgba(0, 0, 0, 0.16)',        // 大型模态框
        inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)',    // 内阴影
        none: 'none',
        // Gauthmath 兼容（保留）
        'gauthmath-sm': '0 1px 8px 0 rgba(0, 0, 0, 0.08)',
        'gauthmath-default': '0 2px 16px 0 rgba(0, 0, 0, 0.12)',
        'gauthmath-primary': '0 2px 16px 0 rgba(255, 1, 62, 0.24)',
      },

      // ✅ 字体系统 (基于设计系统)
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
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

      // ✅ 字号系统 (基于设计系统)
      fontSize: {
        xs: ['12px', { lineHeight: '18px', letterSpacing: '0' }],       // 辅助说明、标签
        sm: ['14px', { lineHeight: '21px', letterSpacing: '0' }],       // 次要文字、表单
        base: ['16px', { lineHeight: '24px', letterSpacing: '0' }],     // 正文
        lg: ['18px', { lineHeight: '27px', letterSpacing: '0' }],       // 大正文
        xl: ['20px', { lineHeight: '30px', letterSpacing: '0' }],       // 小标题
        '2xl': ['24px', { lineHeight: '36px', letterSpacing: '0' }],    // 中标题
        '3xl': ['30px', { lineHeight: '45px', letterSpacing: '0' }],    // 大标题
        '4xl': ['36px', { lineHeight: '43px', letterSpacing: '-0.01em' }],  // 页面标题
        '5xl': ['48px', { lineHeight: '58px', letterSpacing: '-0.01em' }],  // 超大标题
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
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
