# 日新教学平台 - 前端设计系统标准

> 基于 Gauthmath.com 设计分析 | 更新日期: 2025-11-17

## 📋 目录

- [设计理念](#设计理念)
- [色彩系统](#色彩系统)
- [排版系统](#排版系统)
- [间距系统](#间距系统)
- [组件规范](#组件规范)
- [动画系统](#动画系统)
- [响应式设计](#响应式设计)
- [实施指南](#实施指南)

---

## 🎨 设计理念

### 核心原则
- **现代简约主义 (Modern Minimalism)** - 清晰、简洁、注重内容
- **内容优先 (Content First)** - 设计服务于内容传达
- **一致性 (Consistency)** - 统一的视觉语言和交互模式
- **可访问性 (Accessibility)** - 确保所有用户都能轻松使用

### 设计语言特点
- 大量留白，突出核心内容
- 柔和的圆角设计 (8px-24px)
- 微妙的阴影效果 (0 2px 16px rgba(0,0,0,0.12))
- 流畅的动画过渡 (200-300ms)
- 清晰的视觉层次

---

## 🌈 色彩系统

### 主色调 (Primary Colors)

#### 品牌色
```css
--brand-red: #ff013e;     /* 主品牌色 - 用于CTA按钮、重要提示 */
--brand-orange: #ff7a00;  /* 次品牌色 - 用于强调、徽章 */
```

**Tailwind 配置 (HSL 格式)**:
```typescript
colors: {
  brand: {
    red: '348 100% 50%',      // #ff013e
    orange: '29 100% 50%',    // #ff7a00
  }
}
```

**使用场景**:
- `brand-red`: 主要CTA按钮、导航高亮、重要通知
- `brand-orange`: 次要操作、徽章、标签、图标强调

---

### 中性色 (Neutral Colors)

#### 背景色系统
```css
--bg-primary: #ffffff;    /* 主背景 - 页面主体 */
--bg-secondary: #f2f2f7;  /* 次背景 - 卡片、面板 */
--bg-tertiary: #fafafa;   /* 三级背景 - hover状态 */
```

#### 文字色系统
```css
--text-primary: #000000;      /* 主文字 - 标题、重要内容 */
--text-secondary: #3c3c43;    /* 次文字 - 正文、说明 */
--text-tertiary: #8e8e93;     /* 三级文字 - 辅助信息 */
--text-quaternary: #c7c7cc;   /* 四级文字 - 占位符 */
```

#### 边框色
```css
--border-light: #e4e6eb;      /* 浅边框 - 分割线、卡片边框 */
--border-medium: #d1d1d6;     /* 中边框 - 输入框、按钮 */
--border-dark: #c7c7cc;       /* 深边框 - 强调边框 */
```

**Tailwind 配置 (HSL 格式)**:
```typescript
colors: {
  background: {
    DEFAULT: '0 0% 100%',      // #ffffff
    secondary: '240 11% 95%',  // #f2f2f7
    tertiary: '0 0% 98%',      // #fafafa
  },
  foreground: {
    DEFAULT: '0 0% 0%',        // #000000
    secondary: '240 4% 24%',   // #3c3c43
    tertiary: '240 3% 56%',    // #8e8e93
    quaternary: '240 5% 79%',  // #c7c7cc
  },
  border: {
    light: '220 13% 91%',      // #e4e6eb
    DEFAULT: '240 4% 82%',     // #d1d1d6
    dark: '240 5% 79%',        // #c7c7cc
  }
}
```

---

### 功能色 (Functional Colors)

```css
--color-success: #34c759;   /* 成功 - 绿色 */
--color-warning: #ff9500;   /* 警告 - 橙色 */
--color-error: #ff3b30;     /* 错误 - 红色 */
--color-info: #007aff;      /* 信息 - 蓝色 */
```

**Tailwind 配置**:
```typescript
colors: {
  success: '145 80% 49%',   // #34c759
  warning: '36 100% 50%',   // #ff9500
  error: '4 100% 60%',      // #ff3b30
  info: '211 100% 50%',     // #007aff
}
```

---

## 📝 排版系统

### 字体家族 (Font Family)

**优先级顺序**:
```css
font-family:
  -apple-system,           /* macOS/iOS 系统字体 */
  BlinkMacSystemFont,      /* macOS Safari */
  'Google Sans',           /* Google 品牌字体 */
  'Roboto',                /* Android 系统字体 */
  'Noto Sans SC',          /* 中文无衬线字体 */
  'PingFang SC',           /* 苹果中文字体 */
  'Microsoft YaHei',       /* 微软雅黑 */
  sans-serif;              /* 通用后备 */
```

**Tailwind 配置**:
```typescript
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
}
```

---

### 字号系统 (Font Size Scale)

| 级别 | 字号 | 行高 | 用途 | Tailwind Class |
|------|------|------|------|----------------|
| **H1** | 48px | 56px | 一级标题 | `text-5xl` |
| **H2** | 36px | 44px | 二级标题 | `text-4xl` |
| **H3** | 28px | 36px | 三级标题 | `text-3xl` |
| **H4** | 24px | 32px | 四级标题 | `text-2xl` |
| **H5** | 20px | 28px | 五级标题 | `text-xl` |
| **Body Large** | 18px | 28px | 大正文 | `text-lg` |
| **Body** | 16px | 24px | 标准正文 | `text-base` |
| **Body Small** | 14px | 20px | 小正文 | `text-sm` |
| **Caption** | 12px | 16px | 辅助文字 | `text-xs` |
| **Tiny** | 10px | 14px | 极小文字 | `text-[10px]` |

**Tailwind 配置**:
```typescript
fontSize: {
  '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.01em' }],
  '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em' }],
  '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.005em' }],
  '2xl': ['24px', { lineHeight: '32px', letterSpacing: '0' }],
  'xl': ['20px', { lineHeight: '28px', letterSpacing: '0' }],
  'lg': ['18px', { lineHeight: '28px', letterSpacing: '0' }],
  'base': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
  'sm': ['14px', { lineHeight: '20px', letterSpacing: '0' }],
  'xs': ['12px', { lineHeight: '16px', letterSpacing: '0' }],
}
```

---

### 字重系统 (Font Weight)

```typescript
fontWeight: {
  light: '300',      // 轻字重 - 大标题
  normal: '400',     // 正常字重 - 正文
  medium: '500',     // 中等字重 - 小标题、强调
  semibold: '600',   // 半粗 - 按钮、标签
  bold: '700',       // 粗体 - 重要标题
}
```

**使用建议**:
- **标题**: `font-semibold` (600) 或 `font-bold` (700)
- **正文**: `font-normal` (400)
- **按钮/标签**: `font-medium` (500) 或 `font-semibold` (600)
- **强调文字**: `font-medium` (500)

---

## 📏 间距系统

### 容器宽度 (Container Width)

```typescript
container: {
  center: true,
  padding: {
    DEFAULT: '1rem',   // 16px - 移动端
    sm: '2rem',        // 32px - 平板
    lg: '4rem',        // 64px - 桌面
  },
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1200px',      // 最大容器宽度
  },
},
```

---

### 间距尺度 (Spacing Scale)

**基础单位**: 4px (0.25rem)

| Token | 值 | 用途 |
|-------|-----|------|
| `spacing-0` | 0px | 无间距 |
| `spacing-1` | 4px | 极小间距 - icon与文字间距 |
| `spacing-2` | 8px | 小间距 - 表单元素内边距 |
| `spacing-3` | 12px | 中小间距 - 按钮内边距 |
| `spacing-4` | 16px | 标准间距 - 卡片内边距、列表项间距 |
| `spacing-5` | 20px | 中大间距 - 区块间距 |
| `spacing-6` | 24px | 大间距 - 按钮横向内边距 |
| `spacing-8` | 32px | 更大间距 - section间距 |
| `spacing-10` | 40px | 超大间距 - 页面section |
| `spacing-12` | 48px | 主要section间距 |
| `spacing-16` | 64px | 页面级间距 |
| `spacing-20` | 80px | 大页面级间距 |

**Tailwind 配置** (使用默认4px基础系统):
```typescript
spacing: {
  '0': '0',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
}
```

---

## 🎯 组件规范

### 按钮 (Buttons)

#### 主要按钮 (Primary Button)
```css
/* 样式规范 */
background: #ff013e;           /* brand-red */
color: #ffffff;
padding: 14px 24px;
border-radius: 14px;
font-size: 14px;
font-weight: 600;
line-height: 20px;
transition: all 200ms ease;

/* Hover 状态 */
background: #e00036;           /* 加深10% */
box-shadow: 0 2px 16px 0 rgba(255, 1, 62, 0.24);

/* Active 状态 */
background: #c70030;           /* 加深20% */
transform: scale(0.98);

/* Disabled 状态 */
background: #c7c7cc;
color: #8e8e93;
cursor: not-allowed;
```

**Tailwind 实现**:
```tsx
<Button className="bg-brand-red hover:bg-[#e00036] active:scale-98
  disabled:bg-foreground-quaternary disabled:text-foreground-tertiary
  px-6 py-3.5 rounded-[14px] text-sm font-semibold
  transition-all duration-200 hover:shadow-[0_2px_16px_0_rgba(255,1,62,0.24)]">
  确认提交
</Button>
```

---

#### 次要按钮 (Secondary Button)
```css
background: transparent;
color: #000000;
border: 1px solid #e4e6eb;
padding: 14px 24px;
border-radius: 14px;
font-size: 14px;
font-weight: 500;

/* Hover 状态 */
background: #fafafa;
border-color: #d1d1d6;
```

**Tailwind 实现**:
```tsx
<Button variant="outline" className="border-border-light hover:bg-background-tertiary
  hover:border-border px-6 py-3.5 rounded-[14px] text-sm font-medium">
  取消
</Button>
```

---

#### 尺寸变体
```typescript
// Large
padding: 16px 28px;
font-size: 16px;
border-radius: 16px;

// Medium (默认)
padding: 14px 24px;
font-size: 14px;
border-radius: 14px;

// Small
padding: 10px 16px;
font-size: 12px;
border-radius: 10px;
```

---

### 卡片 (Cards)

```css
/* 基础卡片样式 */
background: #ffffff;
border: 1px solid #e4e6eb;
border-radius: 12px;
padding: 24px;
box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.12);
transition: all 200ms ease;

/* Hover 状态 */
box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.16);
transform: translateY(-2px);
border-color: #d1d1d6;
```

**Tailwind 实现**:
```tsx
<Card className="bg-white border border-border-light rounded-xl p-6
  shadow-[0_2px_16px_0_rgba(0,0,0,0.12)]
  hover:shadow-[0_4px_24px_0_rgba(0,0,0,0.16)]
  hover:-translate-y-0.5 hover:border-border
  transition-all duration-200">
  {children}
</Card>
```

---

### 输入框 (Inputs)

```css
/* 基础输入框 */
background: #ffffff;
border: 1px solid #e4e6eb;
border-radius: 8px;
padding: 12px 16px;
font-size: 14px;
line-height: 20px;
color: #000000;
transition: all 150ms ease;

/* Focus 状态 */
border-color: #ff013e;
box-shadow: 0 0 0 3px rgba(255, 1, 62, 0.12);
outline: none;

/* Error 状态 */
border-color: #ff3b30;
box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.12);

/* Disabled 状态 */
background: #f2f2f7;
color: #8e8e93;
cursor: not-allowed;
```

**Tailwind 实现**:
```tsx
<Input className="bg-white border border-border-light rounded-lg
  px-4 py-3 text-sm text-foreground
  focus:border-brand-red focus:ring-4 focus:ring-brand-red/12
  disabled:bg-background-secondary disabled:text-foreground-tertiary
  transition-all duration-150" />
```

---

### 标签/徽章 (Tags/Badges)

```css
/* 基础徽章 */
background: #ff7a00;           /* brand-orange */
color: #ffffff;
padding: 4px 12px;
border-radius: 24px;
font-size: 12px;
font-weight: 600;
line-height: 16px;
display: inline-flex;
align-items: center;
gap: 4px;
```

**变体**:
```typescript
// 成功徽章
background: #34c759;
color: #ffffff;

// 警告徽章
background: #ff9500;
color: #ffffff;

// 信息徽章
background: #007aff;
color: #ffffff;

// 中性徽章
background: #f2f2f7;
color: #3c3c43;
```

**Tailwind 实现**:
```tsx
<Badge className="bg-brand-orange text-white px-3 py-1 rounded-full
  text-xs font-semibold inline-flex items-center gap-1">
  AI生成
</Badge>
```

---

## 🎬 动画系统

### 动画时长 (Duration)

```typescript
transitionDuration: {
  fast: '150ms',      // 快速交互 - hover, focus
  base: '200ms',      // 标准动画 - 大部分过渡
  slow: '300ms',      // 慢速动画 - 复杂动画、页面切换
  slower: '500ms',    // 更慢 - 特殊效果
}
```

---

### 缓动函数 (Easing)

```typescript
transitionTimingFunction: {
  'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
  'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)',      // 快速进入，慢速退出
  'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)', // 平滑过渡
}
```

---

### 常用动画模式

#### 1. 淡入淡出 (Fade In/Out)
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

**Tailwind 配置**:
```typescript
keyframes: {
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'fade-out': {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
}
animation: {
  'fade-in': 'fade-in 200ms ease-out',
  'fade-out': 'fade-out 200ms ease-in',
}
```

---

#### 2. 滑入滑出 (Slide In/Out)
```css
@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**Tailwind 配置**:
```typescript
keyframes: {
  'slide-in-up': {
    '0%': { transform: 'translateY(20px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  'slide-in-down': {
    '0%': { transform: 'translateY(-20px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
}
animation: {
  'slide-in-up': 'slide-in-up 300ms ease-out',
  'slide-in-down': 'slide-in-down 300ms ease-out',
}
```

---

#### 3. 缩放动画 (Scale)
```css
@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Tailwind 配置**:
```typescript
keyframes: {
  'scale-in': {
    '0%': { transform: 'scale(0.95)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
}
animation: {
  'scale-in': 'scale-in 200ms ease-out',
}
```

---

## 📱 响应式设计

### 断点系统 (Breakpoints)

```typescript
screens: {
  'xs': '480px',      // 超小屏 - 手机横屏
  'sm': '640px',      // 小屏 - 平板竖屏
  'md': '768px',      // 中屏 - 平板横屏
  'lg': '1024px',     // 大屏 - 桌面
  'xl': '1200px',     // 超大屏 - 宽屏桌面
  '2xl': '1440px',    // 2K屏
}
```

**使用示例**:
```tsx
<div className="
  px-4              /* 移动端: 16px */
  sm:px-6           /* 平板: 24px */
  lg:px-12          /* 桌面: 48px */

  text-2xl          /* 移动端: 24px */
  md:text-3xl       /* 平板: 28px */
  lg:text-5xl       /* 桌面: 48px */

  grid-cols-1       /* 移动端: 单列 */
  md:grid-cols-2    /* 平板: 两列 */
  lg:grid-cols-3    /* 桌面: 三列 */
">
```

---

### 移动端优先策略

**设计原则**:
1. 默认样式针对移动端 (< 640px)
2. 使用 `sm:`, `md:`, `lg:` 等前缀向上扩展
3. 触摸目标最小 44x44px
4. 字体大小移动端适当缩小

**示例**:
```tsx
{/* 移动端优先按钮 */}
<Button className="
  w-full              /* 移动端全宽 */
  sm:w-auto           /* 平板及以上自适应 */

  text-sm             /* 移动端14px */
  md:text-base        /* 桌面16px */

  py-3                /* 移动端纵向内边距12px */
  md:py-3.5           /* 桌面14px */
">
  提交
</Button>
```

---

## 🛠️ 实施指南

### 第一步: 更新 Tailwind 配置

修改 `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 品牌色
        brand: {
          red: '348 100% 50%',      // #ff013e
          orange: '29 100% 50%',    // #ff7a00
        },
        // 背景色
        background: {
          DEFAULT: '0 0% 100%',      // #ffffff
          secondary: '240 11% 95%',  // #f2f2f7
          tertiary: '0 0% 98%',      // #fafafa
        },
        // 前景色
        foreground: {
          DEFAULT: '0 0% 0%',        // #000000
          secondary: '240 4% 24%',   // #3c3c43
          tertiary: '240 3% 56%',    // #8e8e93
          quaternary: '240 5% 79%',  // #c7c7cc
        },
        // 边框色
        border: {
          light: '220 13% 91%',      // #e4e6eb
          DEFAULT: '240 4% 82%',     // #d1d1d6
          dark: '240 5% 79%',        // #c7c7cc
        },
        // 功能色
        success: '145 80% 49%',      // #34c759
        warning: '36 100% 50%',      // #ff9500
        error: '4 100% 60%',         // #ff3b30
        info: '211 100% 50%',        // #007aff
      },
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
      },
      fontSize: {
        '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.01em' }],
        '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.005em' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'xs': ['12px', { lineHeight: '16px' }],
      },
      borderRadius: {
        'sm': '8px',
        'DEFAULT': '12px',
        'md': '14px',
        'lg': '16px',
        'xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 8px 0 rgba(0, 0, 0, 0.08)',
        'DEFAULT': '0 2px 16px 0 rgba(0, 0, 0, 0.12)',
        'md': '0 4px 24px 0 rgba(0, 0, 0, 0.16)',
        'lg': '0 8px 32px 0 rgba(0, 0, 0, 0.20)',
      },
      keyframes: {
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
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 200ms ease-in',
        'slide-in-up': 'slide-in-up 300ms ease-out',
        'slide-in-down': 'slide-in-down 300ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}

export default config
```

---

### 第二步: 更新全局 CSS

修改 `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* 基础样式重置 */
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* 标题样式 */
  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold tracking-tight text-foreground;
  }

  h1 {
    @apply text-5xl;
  }

  h2 {
    @apply text-4xl;
  }

  h3 {
    @apply text-3xl;
  }

  h4 {
    @apply text-2xl;
  }

  h5 {
    @apply text-xl;
  }

  p {
    @apply leading-relaxed text-foreground-secondary;
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-background-secondary;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-foreground-tertiary rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-foreground-secondary;
  }

  /* 选中文本样式 */
  ::selection {
    @apply bg-brand-red/20 text-foreground;
  }

  /* 焦点样式 */
  *:focus-visible {
    @apply outline-none ring-4 ring-brand-red/12;
  }

  *:focus:not(:focus-visible) {
    @apply outline-none;
  }
}

@layer components {
  /* 容器 */
  .container-page {
    @apply container mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 max-w-screen-xl;
  }

  /* 卡片悬停效果 */
  .card-hover {
    @apply transition-all duration-base ease-out;
    @apply hover:shadow-md hover:-translate-y-0.5 hover:border-border;
  }

  /* 链接样式 */
  .link {
    @apply text-brand-red hover:text-brand-red/80 underline-offset-4 hover:underline;
    @apply transition-colors duration-fast;
  }
}
```

---

### 第三步: 更新 Layout 主题配置

修改 `src/app/layout.tsx`:

```typescript
const lightThemeVars: React.CSSProperties = {
  "--background": "0 0% 100%",           // #ffffff
  "--foreground": "0 0% 0%",             // #000000

  "--background-secondary": "240 11% 95%", // #f2f2f7
  "--foreground-secondary": "240 4% 24%",  // #3c3c43
  "--foreground-tertiary": "240 3% 56%",   // #8e8e93

  "--brand-red": "348 100% 50%",         // #ff013e
  "--brand-orange": "29 100% 50%",       // #ff7a00

  "--border-light": "220 13% 91%",       // #e4e6eb
  "--border": "240 4% 82%",              // #d1d1d6

  "--success": "145 80% 49%",            // #34c759
  "--warning": "36 100% 50%",            // #ff9500
  "--error": "4 100% 60%",               // #ff3b30
  "--info": "211 100% 50%",              // #007aff

  "--radius": "0.75rem",                 // 12px
} as React.CSSProperties;

// Ant Design 主题配置
theme={{
  token: {
    colorPrimary: "#ff013e",             // 品牌红色
    colorSuccess: "#34c759",
    colorWarning: "#ff9500",
    colorError: "#ff3b30",
    colorInfo: "#007aff",

    colorText: "#000000",                 // 主文字色
    colorTextSecondary: "#3c3c43",        // 次文字色
    colorTextTertiary: "#8e8e93",         // 三级文字色
    colorTextQuaternary: "#c7c7cc",       // 四级文字色

    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBgLayout: "#ffffff",

    colorBorder: "#e4e6eb",

    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,

    fontFamily: "-apple-system, BlinkMacSystemFont, 'Google Sans', Roboto, 'Noto Sans SC', sans-serif",
    fontSize: 16,
    fontSizeLG: 18,
    fontSizeSM: 14,
  },
  components: {
    Button: {
      borderRadius: 14,
      controlHeight: 44,
      paddingContentHorizontal: 24,
      primaryShadow: "0 2px 16px 0 rgba(255, 1, 62, 0.24)",
    },
    Card: {
      borderRadius: 12,
      boxShadow: "0 2px 16px 0 rgba(0, 0, 0, 0.12)",
    },
    Input: {
      borderRadius: 8,
      controlHeight: 44,
      paddingBlock: 12,
      paddingInline: 16,
    },
    Table: {
      borderRadius: 12,
      headerBg: "#f2f2f7",
      headerColor: "#000000",
      colorText: "#000000",
    },
  },
}}
```

---

### 第四步: 组件迁移示例

#### 迁移前 (旧样式):
```tsx
<button className="bg-purple-600 text-white px-4 py-2 rounded">
  提交
</button>
```

#### 迁移后 (新样式):
```tsx
<Button className="bg-brand-red hover:bg-[#e00036] text-white
  px-6 py-3.5 rounded-[14px] text-sm font-semibold
  transition-all duration-base
  hover:shadow-[0_2px_16px_0_rgba(255,1,62,0.24)]">
  提交
</Button>
```

---

## 📚 参考资源

- **设计系统来源**: [Gauthmath.com](https://www.gauthmath.com/)
- **Tailwind CSS 文档**: [tailwindcss.com](https://tailwindcss.com/)
- **Ant Design 文档**: [ant.design](https://ant.design/)
- **shadcn/ui 文档**: [ui.shadcn.com](https://ui.shadcn.com/)

---

## 📝 更新日志

### v1.0.0 - 2025-11-17
- 基于 Gauthmath.com 设计分析创建初始版本
- 定义完整色彩系统
- 定义排版系统和间距系统
- 定义组件规范和动画系统
- 提供完整实施指南

---

**文档维护**: 前端开发团队
**最后更新**: 2025-11-17
**版本**: v1.0.0
