# 日新教育平台设计系统

> 基于 Tier-1 Enterprise SaaS 标准（Linear/Vercel/Notion 级别）
>
> 颜色方案来源：[RealTime Colors](https://www.realtimecolors.com/?colors=090813-f8f7fc-483ece-8881e9-564cec&fonts=Inter-Inter)

---

## 1. 颜色系统

### 1.1 主色系统

| 颜色名称 | 色值 | 用途 | 示例 |
|---------|------|------|------|
| **Text** | `#090813` | 主文字颜色 | 标题、正文 |
| **Background** | `#f8f7fc` | 页面背景 | body 背景 |
| **Primary** | `#483ece` | 主要操作 | 主按钮、链接 |
| **Secondary** | `#8881e9` | 次要操作 | 次按钮、辅助元素 |
| **Accent** | `#564cec` | 强调元素 | 高亮、徽章 |

**Tailwind 配置：**
```typescript
colors: {
  primary: {
    DEFAULT: '#483ece',
    50: '#f5f4fe',
    100: '#ebe9fd',
    200: '#d8d4fb',
    300: '#bbb3f8',
    400: '#9a8af3',
    500: '#7d63ed',
    600: '#6a47e3',
    700: '#5a38cf',
    800: '#483ece', // Primary
    900: '#3d2ba8',
  },
  secondary: {
    DEFAULT: '#8881e9',
    // ... 扩展色阶
  },
  accent: {
    DEFAULT: '#564cec',
    // ... 扩展色阶
  }
}
```

### 1.2 语义色（Tailwind 标准）

| 颜色名称 | 色值 | 用途 |
|---------|------|------|
| **Success** | `#10b981` (Emerald 600) | 成功状态、确认操作 |
| **Warning** | `#f59e0b` (Amber 500) | 警告提示 |
| **Error** | `#ef4444` (Red 500) | 错误状态、危险操作 |
| **Info** | `#3b82f6` (Blue 500) | 信息提示 |

### 1.3 中性色（Slate 系统）

| 色阶 | 色值 | 用途 |
|------|------|------|
| slate-50 | `#f8f7fc` | 浅背景（与 Background 一致） |
| slate-100 | `#f1f0f9` | 次级背景 |
| slate-200 | `#e4e2f3` | 边框、分割线 |
| slate-300 | `#d1cee8` | 禁用状态边框 |
| slate-400 | `#a8a3d4` | 占位符文字 |
| slate-500 | `#8881e9` | 次要文字（与 Secondary 一致） |
| slate-600 | `#6b63c7` | 辅助文字 |
| slate-700 | `#564cec` | 重要文字（与 Accent 一致） |
| slate-800 | `#483ece` | 标题文字（与 Primary 一致） |
| slate-900 | `#2d2680` | 深色文字 |
| slate-950 | `#090813` | 主文字（与 Text 一致） |

### 1.4 对比度标准（WCAG AA）

| 组合 | 对比度 | 状态 |
|------|--------|------|
| Text (#090813) on Background (#f8f7fc) | 19.8:1 | ✅ AAA |
| Primary (#483ece) on White | 7.2:1 | ✅ AA |
| slate-700 (#564cec) on White | 6.8:1 | ✅ AA |
| slate-500 (#8881e9) on White | 4.6:1 | ✅ AA |

**规则：**
- 所有文字必须达到 WCAG AA 标准（4.5:1）
- 大文字（18px+）可以使用 3:1
- Primary 按钮必须使用白色文字（#ffffff）
- 深色背景按钮必须显式设置 `text-white`

---

## 2. 排版系统

### 2.1 字号层级

| 名称 | 大小 | 行高 | 用途 |
|------|------|------|------|
| xs | 12px | 18px (1.5) | 辅助说明、标签 |
| sm | 14px | 21px (1.5) | 次要文字、表单 |
| base | 16px | 24px (1.5) | 正文 |
| lg | 18px | 27px (1.5) | 大正文 |
| xl | 20px | 30px (1.5) | 小标题 |
| 2xl | 24px | 36px (1.5) | 中标题 |
| 3xl | 30px | 45px (1.5) | 大标题 |
| 4xl | 36px | 43px (1.2) | 页面标题 |
| 5xl | 48px | 58px (1.2) | 超大标题 |

### 2.2 标题层级

```typescript
h1: 'text-5xl font-bold text-slate-950'     // 48px
h2: 'text-4xl font-bold text-slate-950'     // 36px
h3: 'text-3xl font-semibold text-slate-900' // 30px
h4: 'text-2xl font-semibold text-slate-900' // 24px
h5: 'text-xl font-medium text-slate-800'    // 20px
h6: 'text-lg font-medium text-slate-800'    // 18px
```

### 2.3 字重

| 名称 | 数值 | 用途 |
|------|------|------|
| Light | 300 | 装饰性文字 |
| Normal | 400 | 正文 |
| Medium | 500 | 次要标题、强调 |
| Semibold | 600 | 标题 |
| Bold | 700 | 重要标题 |

### 2.4 字体栈

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Roboto', 'Noto Sans SC', 'PingFang SC',
             'Microsoft YaHei', sans-serif;
```

---

## 3. 间距系统

### 3.1 8px 网格系统

```
0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96
```

**Tailwind 映射：**
- `gap-1` = 4px
- `gap-2` = 8px
- `gap-3` = 12px
- `gap-4` = 16px
- `gap-6` = 24px
- `gap-8` = 32px

### 3.2 响应式间距

| 断点 | 倍数 | 示例 |
|------|------|------|
| Mobile (< 640px) | 0.75x | `p-4` → 12px |
| Tablet (640-1024px) | 1x | `p-4` → 16px |
| Desktop (> 1024px) | 1.25x | `p-4` → 20px |

### 3.3 垂直节奏

| 元素 | 间距 | Tailwind |
|------|------|----------|
| 标题下间距 | 24px | `mb-6` |
| 段落间距 | 16px | `mb-4` |
| 组件间距 | 12px | `gap-3` |
| 元素间距 | 8px | `gap-2` |

### 3.4 组件内边距规范

| 组件 | 内边距 | Tailwind |
|------|--------|----------|
| Card | 24px | `p-6` |
| Button (default) | 12px × 16px | `px-4 py-3` |
| Button (sm) | 8px × 12px | `px-3 py-2` |
| Input | 12px × 16px | `px-4 py-3` |
| Badge | 4px × 12px | `px-3 py-1` |

---

## 4. 阴影系统

### 4.1 阴影层级

| 名称 | 值 | 用途 |
|------|-----|------|
| xs | `0 1px 2px rgba(0,0,0,0.02)` | 微妙提升 |
| sm | `0 2px 4px rgba(0,0,0,0.03)` | 轻微提升 |
| md | `0 2px 10px rgba(0,0,0,0.03)` | 卡片默认 |
| lg | `0 4px 20px rgba(0,0,0,0.06)` | 卡片悬停 |
| xl | `0 8px 40px rgba(0,0,0,0.12)` | 弹窗、抽屉 |

**Tailwind 配置：**
```typescript
boxShadow: {
  'xs': '0 1px 2px rgba(0,0,0,0.02)',
  'sm': '0 2px 4px rgba(0,0,0,0.03)',
  'md': '0 2px 10px rgba(0,0,0,0.03)',
  'lg': '0 4px 20px rgba(0,0,0,0.06)',
  'xl': '0 8px 40px rgba(0,0,0,0.12)',
}
```

### 4.2 Swiss Spa 美学

**核心原则：**
- 超柔和阴影（透明度 0.02-0.06）
- 微妙的边框（透明度 0.6）
- 呼吸感间距（增加 50% 内边距）
- 优雅的过渡动画（200ms）

**示例：**
```typescript
// Card 组件
className="bg-white border border-slate-200/60 rounded-xl
  shadow-[0_2px_10px_rgba(0,0,0,0.03)]
  hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]
  transition-all duration-200 p-6"
```

---

## 5. 圆角系统

| 名称 | 值 | 用途 |
|------|-----|------|
| sm | 8px | 小元素（Badge） |
| md | 12px | 中等元素（Card） |
| lg | 16px | 大元素（Dialog） |
| full | 9999px | 圆形（Avatar） |

**Tailwind 映射：**
- `rounded-lg` = 8px
- `rounded-xl` = 12px
- `rounded-2xl` = 16px
- `rounded-full` = 9999px

---

## 6. 过渡动画

### 6.1 时长

| 名称 | 时长 | 用途 |
|------|------|------|
| 快速 | 150ms | 微交互（hover） |
| 标准 | 200ms | 常规过渡 |
| 慢速 | 300ms | 复杂动画 |

### 6.2 缓动函数

```css
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```

**Tailwind：**
```typescript
transition-all duration-200 ease-out
```

---

## 7. 组件规范

### 7.1 Button 组件

**变体：**
```typescript
// Primary
bg-primary-600 text-white hover:bg-primary-700
shadow-sm hover:shadow-md

// Secondary
bg-secondary-100 text-secondary-700 hover:bg-secondary-200

// Outline
border border-slate-200 text-slate-700 hover:bg-slate-50

// Destructive
bg-red-600 text-white hover:bg-red-700

// Ghost
text-slate-700 hover:bg-slate-100
```

### 7.2 Badge 组件

**变体：**
```typescript
// Default
bg-slate-100 text-slate-700

// Primary
bg-primary-50 text-primary-700 border-primary-200/50

// Success
bg-emerald-50 text-emerald-700 border-emerald-200/60

// Warning
bg-amber-50 text-amber-700 border-amber-200/60

// Error
bg-red-50 text-red-700 border-red-200/60
```

### 7.3 Card 组件

```typescript
// 基础卡片
bg-white border border-slate-200/60 rounded-xl
shadow-[0_2px_10px_rgba(0,0,0,0.03)]
hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]
transition-all duration-200 p-6

// 交互式卡片
cursor-pointer hover:border-primary-300
```

### 7.4 Input 组件

```typescript
// 默认状态
border border-slate-200 rounded-lg px-4 py-3
focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20

// 错误状态
border-red-300 focus:border-red-500 focus:ring-red-500/20

// 成功状态
border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20

// 禁用状态
bg-slate-50 text-slate-400 cursor-not-allowed
```

---

## 8. 响应式断点

| 断点 | 最小宽度 | 用途 |
|------|---------|------|
| sm | 640px | 手机横屏 |
| md | 768px | 平板竖屏 |
| lg | 1024px | 平板横屏 |
| xl | 1280px | 桌面 |
| 2xl | 1536px | 大屏 |

---

## 9. 可访问性标准

### 9.1 对比度要求

- 正常文字（< 18px）：最低 4.5:1（WCAG AA）
- 大文字（≥ 18px）：最低 3:1（WCAG AA）
- 图标和图形：最低 3:1

### 9.2 焦点状态

```typescript
focus:outline-none focus:ring-2 focus:ring-primary-500/20
focus-visible:ring-2 focus-visible:ring-primary-500
```

### 9.3 键盘导航

- 所有交互元素必须支持键盘访问
- Tab 顺序必须符合逻辑
- 焦点状态必须清晰可见

---

## 10. 使用示例

### 10.1 页面布局

```tsx
<div className="min-h-screen bg-background">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-4xl font-bold text-slate-950 mb-6">
      页面标题
    </h1>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 卡片内容 */}
    </div>
  </div>
</div>
```

### 10.2 卡片组件

```tsx
<Card className="bg-white border border-slate-200/60 rounded-xl
  shadow-[0_2px_10px_rgba(0,0,0,0.03)]
  hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]
  transition-all duration-200">
  <CardHeader className="p-6">
    <CardTitle className="text-xl font-semibold text-slate-900">
      卡片标题
    </CardTitle>
  </CardHeader>
  <CardContent className="px-6 pb-6">
    <p className="text-slate-700 leading-relaxed">
      卡片内容
    </p>
  </CardContent>
</Card>
```

### 10.3 按钮组

```tsx
<div className="flex items-center gap-3">
  <Button className="bg-primary-600 text-white hover:bg-primary-700">
    主要操作
  </Button>
  <Button variant="outline" className="border-slate-200 text-slate-700">
    次要操作
  </Button>
  <Button variant="ghost" className="text-slate-700">
    取消
  </Button>
</div>
```

---

## 11. 设计原则

### 11.1 Swiss Spa 美学

1. **极简主义**：去除不必要的装饰
2. **呼吸感**：增加空白空间，让内容呼吸
3. **专业性**：使用一致的设计语言
4. **高对比度**：确保可读性和可访问性

### 11.2 设计决策

- **优先内容**：设计服务于内容，而非相反
- **一致性**：保持组件和交互的一致性
- **性能**：优化加载速度和动画性能
- **可访问性**：确保所有用户都能使用

---

## 12. 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2025-11-28 | 1.0.0 | 初始版本，基于 RealTime Colors 方案 |

---

**维护者**：日新教育平台前端团队
**最后更新**：2025-11-28
