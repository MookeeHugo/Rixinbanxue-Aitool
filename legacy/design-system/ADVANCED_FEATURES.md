# 日新平台 - 高级功能集成指南

> **shadcn/ui组件、Storybook文档、主题定制器、性能监控**

---

## 📦 已实现的高级功能

### ✅ 1. shadcn/ui 组件集成

基于设计令牌扩展的完整UI组件库。

#### 已实现组件

| 组件 | 文件路径 | 特性 |
|------|---------|------|
| **Button** | `components/ui/button.tsx` | 8种变体（含AI/Success）+ 加载状态 + 左右图标 |
| **Card** | `components/ui/card.tsx` | 悬停效果 + AI徽章 + 完整子组件 |
| **Badge** | `components/ui/badge.tsx` | 难度等级（简单/中等/困难）+ AI标识 |
| **Input** | `components/ui/input.tsx` | 左右图标 + 错误提示 + 标签支持 |

#### 快速使用

```bash
# 安装依赖
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react

# 使用组件
import { Button } from '@/components/ui/button';

<Button variant="ai" leftIcon={<Sparkles />}>
  AI生成题目
</Button>
```

#### Button组件完整API

```tsx
<Button
  variant="default | secondary | outline | ghost | link | destructive | success | ai"
  size="default | sm | lg | icon"
  loading={boolean}
  disabled={boolean}
  leftIcon={ReactNode}
  rightIcon={ReactNode}
  onClick={() => {}}
>
  按钮文字
</Button>
```

---

### ✅ 2. Storybook 组件文档系统

完整的组件展示和文档平台，支持交互式测试。

#### 目录结构

```
.storybook/
├── main.ts          # Storybook配置
└── preview.ts       # 全局参数（主题、视口）

components/ui/
├── button.stories.tsx  # Button文档（12个Story）
└── card.stories.tsx    # Card文档（6个Story）
```

#### 启动Storybook

```bash
# 安装Storybook
npx storybook@latest init

# 安装插件
npm install -D @storybook/addon-a11y @storybook/addon-themes @storybook/addon-viewport

# 启动开发服务器
npm run storybook
```

#### 可用功能

1. **组件预览** - 实时查看所有组件变体
2. **交互测试** - Controls面板调整Props
3. **无障碍测试** - a11y插件自动检查
4. **响应式测试** - 切换移动端/平板/桌面视口
5. **主题切换** - Light/Dark模式切换
6. **自动文档** - 从JSDoc生成文档

#### Story示例

```tsx
// button.stories.tsx
export const AIButton: Story = {
  args: {
    children: 'AI生成题目',
    variant: 'ai',
    leftIcon: <Sparkles />,
  },
  parameters: {
    docs: {
      description: {
        story: 'AI功能专用按钮，带有紫粉渐变。',
      },
    },
  },
};
```

---

### ✅ 3. 主题定制器

允许管理员可视化自定义品牌色、字体、圆角等设计令牌。

#### 功能特性

- ✅ **实时预览** - 修改即时生效
- ✅ **颜色选择器** - 支持色板和HEX输入
- ✅ **配置导出/导入** - JSON格式，便于团队共享
- ✅ **localStorage持久化** - 配置自动保存
- ✅ **重置功能** - 一键恢复默认主题
- ✅ **预览模式** - 测试主题效果

#### 可自定义选项

| 类别 | 可配置项 | 默认值 |
|------|---------|--------|
| **颜色** | 主色调 (Primary) | #8b5cf6 (紫色) |
| | 成功色 (Success) | #10b981 (绿色) |
| | 警告色 (Warning) | #f59e0b (橙色) |
| | 错误色 (Error) | #ef4444 (红色) |
| **圆角** | 基础圆角 | 0.5rem (8px) |
| | 卡片圆角 | 0.75rem (12px) |
| **字体** | UI字体 | Inter |
| | 代码字体 | JetBrains Mono |

#### 使用方法

```tsx
// 在页面中引入
import { ThemeCustomizer } from '@/components/theme-customizer';

// 添加到管理后台
<ThemeCustomizer />
```

#### 配置示例（JSON）

```json
{
  "colors": {
    "primary": "#3b82f6",  // 改为蓝色
    "success": "#10b981",
    "warning": "#f59e0b",
    "error": "#ef4444"
  },
  "borderRadius": {
    "base": "0.25rem",  // 更尖锐的圆角
    "card": "0.5rem"
  },
  "fontFamily": {
    "sans": "Roboto",
    "mono": "Fira Code"
  }
}
```

---

### ✅ 4. 性能监控组件

实时监控动画帧率（FPS）和页面加载性能（Web Vitals）。

#### 监控指标

| 指标 | 说明 | 优秀标准 | 警告阈值 |
|------|------|---------|---------|
| **FPS** | 动画帧率 | ≥55 FPS | <30 FPS |
| **LCP** | 首次内容绘制 | ≤2.5s | >4s |
| **FID** | 首次输入延迟 | ≤100ms | >300ms |
| **CLS** | 布局偏移 | ≤0.1 | >0.25 |
| **Load Time** | 页面加载时间 | ≤1.5s | >3s |
| **Memory** | 内存使用（仅Chrome） | - | - |

#### 功能特性

- ✅ **实时FPS监控** - requestAnimationFrame精确测量
- ✅ **Web Vitals采集** - PerformanceObserver API
- ✅ **快捷键切换** - Ctrl + Shift + P
- ✅ **浮动面板** - 不影响正常操作
- ✅ **性能建议** - 自动分析并给出优化建议
- ✅ **颜色编码** - 绿色（优秀）/橙色（警告）/红色（差）

#### 使用方法

```tsx
// 在 _app.tsx 或 layout.tsx 中全局引入
import { PerformanceMonitor } from '@/components/performance-monitor';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </body>
    </html>
  );
}
```

#### 快捷键

- **Ctrl + Shift + P** - 打开/关闭监控面板
- **点击浮动按钮** - 展开监控面板

#### 性能建议示例

当检测到性能问题时，会自动显示优化建议：

```
⚠️ 性能建议
• 帧率较低，建议减少复杂动画或使用CSS动画
• 首屏加载较慢，建议优化图片或使用懒加载
• 布局偏移较大，建议为图片/iframe设置固定尺寸
```

---

## 🚀 完整集成步骤

### 步骤1：安装所有依赖

```bash
# shadcn/ui核心依赖
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# 图标库
npm install lucide-react

# Storybook
npx storybook@latest init
npm install -D @storybook/addon-a11y @storybook/addon-themes @storybook/addon-viewport

# 其他工具
npm install framer-motion  # 高级动画（可选）
```

### 步骤2：配置package.json脚本

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### 步骤3：添加工具函数

```tsx
// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 步骤4：引入全局组件

```tsx
// app/layout.tsx
import { PerformanceMonitor } from '@/components/performance-monitor';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </body>
    </html>
  );
}
```

### 步骤5：添加主题定制器页面

```tsx
// app/admin/theme/page.tsx
import { ThemeCustomizer } from '@/components/theme-customizer';

export default function ThemePage() {
  return <ThemeCustomizer />;
}
```

---

## 📚 使用示例

### 示例1：完整题目卡片

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus } from 'lucide-react';

export function QuestionCard({ question }) {
  return (
    <Card hover aiGenerated={question.isAI}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-2">
            {question.title}
          </CardTitle>
          <Badge variant={question.difficulty}>
            {question.difficultyText}
          </Badge>
        </div>
        <CardDescription>
          {question.subject} · {question.chapter}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="formula-block">
          {question.content}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Eye />}>
            预览
          </Button>
          <Button variant="default" size="sm" leftIcon={<Plus />}>
            添加
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {question.createdAt}
        </span>
      </CardFooter>
    </Card>
  );
}
```

### 示例2：AI功能入口

```tsx
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function AIGenerateButton() {
  return (
    <Button
      variant="ai"
      size="lg"
      leftIcon={<Sparkles />}
      onClick={handleAIGenerate}
      loading={isGenerating}
    >
      AI生成相似题目
    </Button>
  );
}
```

---

## 🔧 故障排查

### 问题1：Tailwind类不生效

**解决方案**：确认 `tailwind.config.ts` 的 `content` 包含所有组件路径

```typescript
content: [
  './pages/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  './app/**/*.{js,ts,jsx,tsx,mdx}',
],
```

### 问题2：Storybook无法加载全局样式

**解决方案**：在 `.storybook/preview.ts` 中导入全局CSS

```typescript
import "../design-system/globals.css";
```

### 问题3：主题定制器颜色不生效

**解决方案**：检查CSS变量是否正确应用到 `:root`

```typescript
// 在浏览器控制台检查
console.log(getComputedStyle(document.documentElement).getPropertyValue('--primary'));
```

### 问题4：性能监控FPS显示0

**解决方案**：确保组件在客户端渲染（使用 `'use client'` 指令）

---

## 📊 性能优化建议

### 1. 代码分割

```tsx
// 懒加载主题定制器
const ThemeCustomizer = dynamic(() => import('@/components/theme-customizer'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### 2. 图标优化

```tsx
// 仅导入需要的图标
import { Search, Plus } from 'lucide-react';

// 而不是
import * as Icons from 'lucide-react';
```

### 3. Storybook构建优化

```bash
# 生产环境构建时排除Storybook
npm run build-storybook
# 部署到 /storybook 路径（仅内部访问）
```

---

## 🔗 相关资源

- [shadcn/ui 官方文档](https://ui.shadcn.com/)
- [Storybook 官方文档](https://storybook.js.org/)
- [Radix UI](https://www.radix-ui.com/)
- [Web Vitals 介绍](https://web.dev/vitals/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

**维护人**：张伟（全栈工程师）
**最后更新**：2025-11-17
