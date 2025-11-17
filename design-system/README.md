# 日新平台 - 设计系统

> **基于现代教育SaaS最佳实践，结合SuperDesign组件库，为K12数学题库系统打造的完整前端设计标准**

## 📁 文件结构

```
design-system/
├── README.md                    # 设计系统使用指南（本文件）
├── tailwind.config.ts           # Tailwind CSS 配置
├── globals.css                  # 全局样式 + CSS变量
├── tokens.ts                    # 设计令牌（颜色、间距、字体等）
└── components-example.tsx       # 组件使用示例
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 Tailwind CSS 和相关插件
npm install tailwindcss postcss autoprefixer
npm install @tailwindcss/forms @tailwindcss/typography
npm install class-variance-authority clsx tailwind-merge

# 安装UI组件库（shadcn/ui推荐）
npx shadcn-ui@latest init

# 安装图标库
npm install lucide-react

# 安装动画库
npm install framer-motion

# 安装数学公式渲染
npm install react-katex katex
npm install @types/katex -D
```

### 2. 配置 Tailwind

将 `tailwind.config.ts` 复制到项目根目录：

```typescript
// tailwind.config.ts
import config from './design-system/tailwind.config';
export default config;
```

### 3. 导入全局样式

在 `app/globals.css` 或 `styles/globals.css` 中导入：

```css
/* app/globals.css */
@import '../design-system/globals.css';
```

### 4. 使用设计令牌

```typescript
import { colors, spacing, borderRadius } from '@/design-system/tokens';

// 在组件中使用
function MyComponent() {
  return (
    <div style={{
      background: colors.primary[500],
      padding: spacing[4],
      borderRadius: borderRadius.lg,
    }}>
      Hello World
    </div>
  );
}
```

---

## 🎨 设计原则

### 1. **清晰易用** (Clarity First)
- 目标用户：K12教师、学生、家长（10-50岁）
- 设计导向：简洁、直观、零学习成本

### 2. **现代专业** (Modern & Professional)
- 视觉风格：扁平设计 + 轻微渐变
- 品牌调性：专业、可信赖、创新
- 差异化：AI驱动的智能体验

### 3. **性能优先** (Performance Optimized)
- 首屏加载 < 1.5s（国内）
- 60fps 流畅动画
- 渐进增强策略

---

## �� 配色系统

### 主色调 - 蓝紫渐变

```tsx
import { colors } from '@/design-system/tokens';

// 主色使用
<button className="bg-primary-500 hover:bg-primary-600">
  点击我
</button>

// 渐变背景
<div className="gradient-primary">
  渐变背景
</div>

// CSS变量方式
<div className="bg-primary text-primary-foreground">
  使用语义化变量
</div>
```

**色板预览**：
- `primary-50` 到 `primary-900`：紫色渐变色阶
- `success-*`：翡翠绿（成功、正确答案）
- `warning-*`：琥珀橙（警告、需注意）
- `error-*`：玫瑰红（错误、危险操作）

### 暗色模式

自动检测系统偏好或手动切换：

```tsx
// 使用 next-themes
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system">
  <App />
</ThemeProvider>
```

---

## 📝 排版系统

### 字体家族

```tsx
// 无衬线字体（UI元素）
className="font-sans"

// 等宽字体（代码、LaTeX）
className="font-mono"

// 衬线字体（长文本）
className="font-serif"
```

### 字号层级

| Tailwind类 | 字号 | 使用场景 |
|-----------|------|---------|
| `text-5xl` | 48px | 页面主标题 |
| `text-4xl` | 36px | 区块标题 |
| `text-3xl` | 30px | 子区块标题 |
| `text-2xl` | 24px | 卡片标题 |
| `text-xl` | 20px | 小标题 |
| `text-base` | 16px | 正文（默认） |
| `text-sm` | 14px | 次要文本 |
| `text-xs` | 12px | 辅助说明 |

### 字重

```tsx
<h1 className="font-bold">      {/* 700 - 标题 */}
<h2 className="font-semibold">  {/* 600 - 次级标题 */}
<p className="font-normal">      {/* 400 - 正文 */}
<button className="font-medium"> {/* 500 - 按钮 */}
```

---

## 📏 间距与布局

### 间距系统（8px Grid）

```tsx
// 基础间距单位：8px
<div className="p-4">  {/* padding: 16px (默认) */}
<div className="gap-6"> {/* gap: 24px (组件间距) */}
<div className="my-12"> {/* margin: 48px (区块间距) */}
```

**常用间距**：
- `spacing-1` = 4px（最小间距）
- `spacing-4` = 16px（组件内边距）
- `spacing-6` = 24px（组件间距）
- `spacing-12` = 48px（区块间距）

### 圆角半径

```tsx
<button className="rounded-md">   {/* 8px  - 按钮、输入框 */}
<div className="rounded-lg">      {/* 12px - 卡片 */}
<div className="rounded-xl">      {/* 16px - 大卡片、模态框 */}
<img className="rounded-full">    {/* 圆形 - 头像 */}
```

### 阴影层级

```tsx
<div className="shadow-sm">   {/* 轻微悬浮 */}
<div className="shadow-md">   {/* 卡片默认 */}
<div className="shadow-lg">   {/* 模态框 */}
<div className="shadow-primary"> {/* 主按钮悬停 */}
```

---

## 🧩 组件示例

### 按钮组件

```tsx
import { Button } from '@/design-system/components-example';

// 主要按钮（渐变背景）
<Button variant="primary">
  添加到题篮
</Button>

// 次要按钮
<Button variant="secondary">
  预览
</Button>

// 轮廓按钮
<Button variant="outline">
  取消
</Button>

// 危险按钮
<Button variant="destructive">
  删除题目
</Button>

// 尺寸变体
<Button size="sm">小按钮</Button>
<Button size="lg">大按钮</Button>
<Button size="icon"><IconPlus /></Button>
```

### 输入框组件

```tsx
import { Input } from '@/design-system/components-example';

// 标准输入框
<Input placeholder="搜索题目..." />

// 带图标
<Input
  leftIcon={<IconSearch />}
  placeholder="搜索..."
/>

// 错误状态
<Input
  error="标题不能为空"
  value={title}
  onChange={setTitle}
/>
```

### 题目卡片

```tsx
import { QuestionCard } from '@/design-system/components-example';

<QuestionCard
  title="因式分解：x² + 5x + 6"
  subject="代数"
  difficulty="easy"
  content="将多项式 x² + 5x + 6 进行因式分解。"
  createdAt="2025-11-15"
  onPreview={() => {}}
  onAddToBasket={() => {}}
/>
```

### 徽章组件

```tsx
import { Badge } from '@/design-system/components-example';

<Badge variant="success">简单</Badge>
<Badge variant="warning">中等</Badge>
<Badge variant="error">困难</Badge>
<Badge variant="ai">AI生成</Badge>
```

---

## 🎬 动画与交互

### 过渡动画

```tsx
// 标准过渡（200ms）
<button className="transition-all duration-200 ease-out">
  悬停我
</button>

// 悬停效果
<div className="card-hover">
  {/* 自动应用：阴影、位移、边框变化 */}
</div>
```

### 关键帧动画

```tsx
// 淡入
<div className="animate-fadeIn">
  淡入内容
</div>

// 加载旋转
<div className="animate-spin">⏳</div>

// 脉冲（通知）
<div className="animate-pulse">新消息</div>
```

### Framer Motion 示例

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  页面内容
</motion.div>
```

---

## 📱 响应式设计

### 断点系统

```tsx
// 移动端优先
<div className="
  grid grid-cols-1        // 默认1列（移动端）
  md:grid-cols-2          // 平板2列（≥768px）
  lg:grid-cols-3          // 桌面3列（≥1024px）
  gap-4 md:gap-6          // 响应式间距
">
```

### 移动端适配

```tsx
// 隐藏/显示
<div className="hidden md:block">  {/* 仅桌面显示 */}
<div className="md:hidden">        {/* 仅移动端显示 */}

// 字体缩放
<h1 className="text-3xl md:text-5xl"> {/* 移动32px, 桌面48px */}
```

---

## ♿ 无障碍设计

### ARIA 标签

```tsx
// 按钮标签
<button aria-label="添加到题篮">
  <IconPlus />
</button>

// 表单标签
<label htmlFor="title">题目标题</label>
<Input id="title" aria-required="true" />

// 错误提示
<Input
  aria-invalid="true"
  aria-describedby="error-msg"
/>
<span id="error-msg" role="alert">
  标题不能为空
</span>
```

### 键盘导航

```tsx
// 快捷键示例
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K 打开搜索
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

## 🛠️ 开发工具

### VS Code 插件推荐

- **Tailwind CSS IntelliSense** - 自动补全Tailwind类
- **PostCSS Language Support** - CSS语法支持
- **Prettier** - 代码格式化

### Tailwind工具函数

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 使用
<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)}>
```

### 颜色对比度检查

使用 [WebAIM对比度检查器](https://webaim.org/resources/contrastchecker/) 确保：
- 正文文本对比度 ≥ 4.5:1（WCAG AA）
- 大文本对比度 ≥ 3:1

---

## 📚 参考资源

### 设计参考
- [StudyFetch](https://www.studyfetch.com/) - AI教育平台设计
- [Linear](https://linear.app/) - 简洁UI设计
- [Vercel](https://vercel.com/) - 渐变与暗色模式
- [Notion](https://www.notion.so/) - 侧边栏与卡片布局

### 技术文档
- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Radix UI 无障碍组件](https://www.radix-ui.com/)
- [Framer Motion 动画](https://www.framer.com/motion/)

### 图标与插图
- [Lucide Icons](https://lucide.dev/)
- [unDraw 插图](https://undraw.co/)
- [Storyset 动画插图](https://storyset.com/)

---

## 📋 设计检查清单

上线前请确认：

- [ ] 所有文本对比度 ≥ 4.5:1
- [ ] 支持键盘导航（Tab键可访问所有交互元素）
- [ ] 支持暗色模式
- [ ] 响应式适配（375px - 1920px）
- [ ] 加载状态有骨架屏或Spinner
- [ ] 错误状态有明确提示
- [ ] 空状态有引导插图
- [ ] 所有图片有alt属性
- [ ] 表单有验证提示
- [ ] 动画时长 < 500ms

---

## 🔄 设计系统版本管理

- **v1.0.0**（当前）：初始版本，包含核心组件和配色系统
- **主版本**：重大视觉改版（v1 → v2）
- **次版本**：新增组件（v1.1 → v1.2）
- **补丁版本**：颜色/间距微调（v1.1.0 → v1.1.1）

---

## 📞 联系方式

**设计系统维护人**：张伟（全栈工程师）
**审核人**：王强（后端）、李娜（前端）
**最后更新**：2025-11-17

---

## 📄 许可证

MIT License - 日新平台内部使用

---

## 🔗 相关文档

- [日新平台_前端设计标准_v1.md](../日新平台_前端设计标准_v1.md) - 完整设计规范文档
- [日新平台_技术设计文档_v5.md](../日新平台_技术设计文档_v5.md) - 技术架构文档
- [日新平台_技术运维手册_v5.md](../日新平台_技术运维手册_v5.md) - 运维指南
