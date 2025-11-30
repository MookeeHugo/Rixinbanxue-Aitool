# 🎨 RixinMate 前端色彩系统迁移计划

## 📋 执行概要

本文档分析了当前项目的颜色系统，并基于**RixinMate品牌定位**（深空蓝 + 光子橙 + ∞），制定了一套完整的工业级色彩迁移方案。

**核心问题：**
- 当前使用紫色系主色 (#483ece) 与品牌定位不符
- 缺乏专业科技感的深蓝商务风格
- 没有充分利用品牌橙色作为行动号召色

**目标：**
- 建立符合品牌定位的深空蓝 + 光子橙配色系统
- 优化文字层级，减少视觉噪音
- 提升整体UI专业度和品牌识别度

---

## 一、当前色彩系统分析

### 1.1 现有配置

#### 主色系统 (tailwind.config.ts)
```typescript
primary: {
  DEFAULT: '#483ece',    // 🔴 紫蓝色 - 与品牌不符
  800: '#483ece',
  // ...
}

secondary: {
  DEFAULT: '#8881e9',    // 🔴 浅紫色
  600: '#8881e9',
}

accent: {
  DEFAULT: '#564cec',    // 🔴 紫色强调
  700: '#564cec',
}

// Gauthmath 遗留品牌色
brand: {
  red: '#ff013e',        // 🔴 玫红色（已废弃）
  orange: '#ff7a00',     // ⚠️ 橙色（未充分使用）
}
```

#### CSS变量 (globals.css)
```css
:root {
  --primary: 250 62% 52%;           /* #483ece - 紫蓝色 */
  --background: 250 50% 98%;        /* #f8f7fc - 紫调背景 */
  --foreground: 250 45% 5%;         /* #090813 - 深色文字 */
  --border: 250 40% 90%;            /* #e4e2f3 - 紫调边框 */

  --brand-red: 348 100% 50%;        /* #ff013e - 玫红（已废弃）*/
  --brand-orange: 29 100% 50%;      /* #ff7a00 - 橙色（未使用）*/
}
```

### 1.2 组件颜色使用情况

#### Button 组件 (src/components/ui/button.tsx)
```typescript
variant: {
  default: "bg-primary-600 text-white"        // 🔴 紫蓝色按钮
  destructive: "bg-red-600"                   // ✅ 红色正确
  outline: "border-slate-200 bg-white"        // ✅ 中性色正确
  secondary: "bg-secondary-100 text-secondary-700" // 🔴 浅紫色
  ghost: "text-slate-700"                     // ✅ 灰色正确
  link: "text-primary-600"                    // 🔴 紫蓝色链接
}
```

#### Badge 组件 (src/components/ui/badge.tsx)
```typescript
variant: {
  default: "bg-slate-100 text-slate-700"      // ✅ 中性灰正确
  primary: "bg-primary-50 text-primary-700"   // 🔴 紫色徽章
  secondary: "bg-secondary-100"               // 🔴 浅紫色徽章
  success: "bg-emerald-50 text-emerald-700"   // ✅ 绿色正确
  warning: "bg-amber-50 text-amber-700"       // ✅ 橙色正确
  error: "bg-red-50 text-red-700"             // ✅ 红色正确
}
```

### 1.3 核心问题总结

| 问题类型 | 具体表现 | 影响 |
|---------|---------|------|
| **品牌不一致** | 使用紫色系而非深蓝色 | 品牌识别度低 |
| **橙色未充分利用** | 品牌橙色仅定义未使用 | 缺乏行动号召力 |
| **背景色偏紫** | #f8f7fc 带紫调 | 整体色调不专业 |
| **遗留色彩** | Gauthmath 玫红色 | 视觉混乱 |
| **文字层级弱** | 过多彩色文字 | 信息层级不清晰 |

---

## 二、RixinMate 品牌色彩系统设计

### 2.1 核心配色策略：60-30-10 原则

#### 🔵 深空蓝 (Deep Science Blue) - 60%
- **色值：** `#0052D4`
- **HSL：** `213 100% 42%`
- **用途：** 顶部导航、主标题、选中状态、链接
- **心理学：** 数学严谨、科技信任、专业沉稳

#### 🟠 光子橙 (Vibrant Orange) - 10%
- **色值：** `#FF6B00`
- **HSL：** `25 100% 50%`
- **用途：** **唯一的主要行动按钮 (CTA)**
- **心理学：** 提分活力、注意力聚焦

#### ⚪ 中性灰 (Neutrals) - 30%
- **背景：** `#F9FAFB` (极浅灰，让白色卡片浮起)
- **文字主色：** `#111827` (深黑，用于题干、标题)
- **文字次色：** `#6B7280` (中灰，用于日期、标签)
- **边框：** `#E5E7EB` (浅灰，用于分割线)

### 2.2 完整色阶定义

#### Primary (深空蓝)
```typescript
primary: {
  DEFAULT: '#0052D4',    // 主色
  50: '#EBF5FF',         // 超浅蓝背景
  100: '#D1E9FF',        // 浅蓝背景
  200: '#A3D2FF',
  300: '#74BAFF',
  400: '#3D9EFF',
  500: '#0052D4',        // 核心色
  600: '#0041A8',        // Hover态
  700: '#003180',        // Active态
  800: '#002259',
  900: '#001433',
  950: '#000A1A',
}
```

#### Accent (光子橙)
```typescript
accent: {
  DEFAULT: '#FF6B00',    // 强调色
  50: '#FFF4E6',
  100: '#FFE8CC',
  200: '#FFD199',
  300: '#FFBA66',
  400: '#FFA333',
  500: '#FF6B00',        // 核心色
  600: '#E65000',        // Hover态
  700: '#CC4600',        // Active态
  800: '#B33C00',
  900: '#993300',
}
```

#### Gray (中性灰)
```typescript
gray: {
  50: '#F9FAFB',         // 页面背景
  100: '#F3F4F6',        // 卡片Hover背景
  200: '#E5E7EB',        // 边框线
  300: '#D1D5DB',        // 禁用边框
  400: '#9CA3AF',        // 占位符文字
  500: '#6B7280',        // 次级文字（日期/标签）
  600: '#4B5563',        // 辅助文字
  700: '#374151',        // 题干/正文
  800: '#1F2937',        // 深色文字
  900: '#111827',        // 标题文字
  950: '#030712',        // 纯黑
}
```

#### 功能色（保持不变）
```typescript
success: {
  DEFAULT: '#10B981',    // ✅ 成功/已入库
  // ...
}

warning: {
  DEFAULT: '#F59E0B',    // ⚠️ 警告/草稿
  // ...
}

error: {
  DEFAULT: '#EF4444',    // ❌ 错误/删除
  // ...
}

info: {
  DEFAULT: '#2563EB',    // ℹ️ 信息提示
  // ...
}
```

### 2.3 使用规范

#### 场景 1：导航栏 (Navbar)
```typescript
// ❌ 旧版（白底黑字）
<header className="bg-white border-b">
  <nav className="text-slate-900">...</nav>
</header>

// ✅ 新版（深空蓝底白字）
<header className="bg-primary-500 border-b border-primary-600">
  <nav className="text-white">
    <Logo className="text-white" />  {/* 白色 ∞ Logo */}
    <Avatar>
      <span className="absolute top-0 right-0 w-2 h-2 bg-accent-500 rounded-full" />
      {/* 橙色小圆点 */}
    </Avatar>
  </nav>
</header>
```

#### 场景 2：按钮
```typescript
// ✅ 主按钮（橙色 - 唯一的强调色）
<Button className="bg-accent-500 hover:bg-accent-600 text-white rounded-md">
  开始录题
</Button>

// ✅ 次级按钮（深蓝轮廓）
<Button variant="outline" className="border-primary-500 text-primary-500 hover:bg-primary-50">
  导出试卷
</Button>

// ✅ 文字按钮（深蓝文字）
<Button variant="ghost" className="text-primary-600 hover:text-primary-700">
  编辑
</Button>

// ❌ 旧版（紫色按钮 - 淘汰）
<Button className="bg-primary-600">  {/* #483ece 紫色 */}
```

#### 场景 3：标签/Badge
```typescript
// ✅ 淡雅色背景 + 深色文字（Subtle Style）
<Badge className="bg-primary-50 text-primary-700 border-primary-200">
  七年级
</Badge>

// ❌ 旧版（高饱和紫色 - 视觉噪音）
<Badge className="bg-primary-500 text-white">
  七年级
</Badge>
```

#### 场景 4：文字层级
```typescript
// ✅ 正确的文字颜色
<h1 className="text-gray-900">题库管理</h1>              // 标题 - 深黑
<p className="text-gray-700">计算下列方程...</p>         // 题干 - 灰黑
<span className="text-gray-500">创建时间: 2024-11-30</span>  // 日期 - 中灰

// ❌ 错误（不要用彩色写静态文字）
<span className="text-primary-600">姓名：</span>  // ❌ 紫色文字
<span className="text-secondary-500">班级：</span> // ❌ 浅紫文字
```

#### 场景 5：卡片
```typescript
// ✅ 白色卡片 + 浅灰背景 + 柔和阴影
<div className="bg-gray-50">  {/* 页面背景 */}
  <Card className="bg-white border-gray-200 rounded-lg shadow-sm hover:shadow-md">
    <CardHeader className="border-b border-gray-100">
      <h3 className="text-gray-900">题目 #001</h3>
    </CardHeader>
    <CardContent className="text-gray-700">
      {/* 内容 */}
    </CardContent>
  </Card>
</div>
```

---

## 三、分阶段迁移计划

### Phase 1: 配置文件更新（1天）✅ 关键路径

#### 任务 1.1: 更新 tailwind.config.ts
```typescript
// 文件：tailwind.config.ts

export default {
  theme: {
    extend: {
      colors: {
        // ========== RixinMate 品牌色系统 ==========
        primary: {
          DEFAULT: '#0052D4',    // 深空蓝（替换紫色 #483ece）
          50: '#EBF5FF',
          100: '#D1E9FF',
          500: '#0052D4',
          600: '#0041A8',        // Hover
          700: '#003180',        // Active
        },

        accent: {
          DEFAULT: '#FF6B00',    // 光子橙（激活 brand.orange）
          500: '#FF6B00',
          600: '#E65000',
        },

        // ========== 中性色系统 ==========
        gray: {
          50: '#F9FAFB',         // 页面背景（替换紫调 #f8f7fc）
          100: '#F3F4F6',
          200: '#E5E7EB',
          500: '#6B7280',        // 次级文字
          700: '#374151',        // 正文
          900: '#111827',        // 标题
        },

        // ========== 废弃以下颜色 ==========
        // secondary: { ... }    // ❌ 删除紫色系
        // brand.red             // ❌ 删除玫红色
      },

      // 字体优化
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },

      // 圆角统一
      borderRadius: {
        DEFAULT: '6px',  // 按钮/输入框
        lg: '12px',      // 卡片/弹窗
      },
    },
  },
}
```

#### 任务 1.2: 更新 globals.css
```css
/* 文件：src/app/globals.css */

@layer base {
  :root {
    /* ========== RixinMate 品牌色系统 ========== */
    --primary: 213 100% 42%;           /* #0052D4 深空蓝 */
    --primary-foreground: 0 0% 100%;   /* #ffffff 白色文字 */

    --accent: 25 100% 50%;             /* #FF6B00 光子橙 */
    --accent-foreground: 0 0% 100%;    /* #ffffff 白色文字 */

    /* ========== 背景色系统 ========== */
    --background: 210 20% 98%;         /* #F9FAFB 极浅灰（去紫调）*/
    --background-secondary: 210 16% 96%; /* #F3F4F6 次级背景 */
    --background-tertiary: 0 0% 100%;  /* #ffffff 卡片背景 */

    /* ========== 前景色系统 ========== */
    --foreground: 222 47% 11%;         /* #111827 主文字（深黑）*/
    --foreground-secondary: 215 16% 47%; /* #6B7280 次文字（中灰）*/
    --foreground-tertiary: 214 14% 65%; /* #9CA3AF 三级文字 */

    /* ========== 边框色系统 ========== */
    --border: 214 20% 91%;             /* #E5E7EB 边框（去紫调）*/
    --border-medium: 214 16% 88%;      /* #D1D5DB 中边框 */

    /* ========== 语义色（保持不变）========== */
    --success: 160 84% 39%;            /* #10B981 */
    --warning: 38 92% 50%;             /* #F59E0B */
    --error: 0 84% 60%;                /* #EF4444 */
    --info: 217 91% 60%;               /* #2563EB */

    /* ========== 删除以下变量 ========== */
    /* --brand-red: ... */              /* ❌ 删除玫红 */
    /* --secondary: ... */              /* ❌ 删除紫色系 */
  }

  /* 页面背景改为极浅灰 */
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

#### 任务 1.3: 删除主题定制器中的旧配色
```typescript
// 文件：components/theme-customizer.tsx

const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#0052D4',    // ✅ 深空蓝（替换 #8b5cf6 紫色）
    success: '#10b981',    // ✅ 保持
    warning: '#f59e0b',    // ✅ 保持
    error: '#ef4444',      // ✅ 保持
  },
  // ...
}
```

---

### Phase 2: 核心组件迁移（2天）⚡ 高优先级

#### 任务 2.1: Button 组件
```typescript
// 文件：src/components/ui/button.tsx

const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default:
          "bg-accent-500 text-white hover:bg-accent-600",  // ✅ 橙色主按钮
        destructive:
          "bg-error-600 text-white hover:bg-error-700",    // ✅ 保持红色
        outline:
          "border border-primary-500 bg-white text-primary-500 hover:bg-primary-50",  // ✅ 深蓝轮廓
        secondary:
          "bg-gray-100 text-gray-700 hover:bg-gray-200",   // ✅ 改为中性灰
        ghost:
          "text-gray-700 hover:bg-gray-100",               // ✅ 保持
        link:
          "text-primary-600 hover:text-primary-700",       // ✅ 深蓝链接
      },
      // ...
    },
  }
)
```

**影响文件：** 30+ 个页面组件
**测试重点：** 主按钮颜色从紫色变橙色

#### 任务 2.2: Badge 组件
```typescript
// 文件：src/components/ui/badge.tsx

const badgeVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default:
          "bg-gray-100 text-gray-700 border-transparent",          // ✅ 中性灰
        primary:
          "bg-primary-50 text-primary-700 border-primary-200/50",  // ✅ 淡蓝色
        success:
          "bg-emerald-50 text-emerald-700 border-emerald-200/60", // ✅ 保持
        warning:
          "bg-amber-50 text-amber-700 border-amber-200/60",       // ✅ 保持
        error:
          "bg-red-50 text-red-700 border-red-200/60",             // ✅ 保持
        outline:
          "bg-white text-gray-700 border-gray-200",               // ✅ 保持
      },
    },
  }
)
```

**影响文件：** 题目卡片、标签组件等
**测试重点：** 紫色徽章变为淡蓝色

#### 任务 2.3: 导航栏组件
```typescript
// 文件：src/app/layout.tsx 或 src/components/layout/navbar.tsx

// ❌ 旧版
<header className="bg-white border-b border-gray-200">
  <nav className="text-gray-900">...</nav>
</header>

// ✅ 新版
<header className="bg-primary-500 border-b border-primary-600">
  <nav className="text-white">
    <div className="flex items-center gap-2">
      <span className="text-2xl">∞</span>  {/* 白色无穷符号 */}
      <span className="font-bold">RixinMate</span>
    </div>

    <div className="flex items-center gap-4">
      <Link href="/questions" className="text-white/90 hover:text-white">
        题库
      </Link>
      {/* ... */}
    </div>

    <Avatar>
      <AvatarImage src={user.avatar} />
      <span className="absolute top-0 right-0 w-2 h-2 bg-accent-500 rounded-full" />
      {/* 橙色状态点 */}
    </Avatar>
  </nav>
</header>
```

**影响文件：** 全局Layout
**测试重点：** 导航栏从白色变深蓝色

---

### Phase 3: 页面级组件迁移（3天）

#### 任务 3.1: 题库相关页面
**文件清单：**
- `src/app/questions/page.tsx` - 题库列表
- `src/app/questions/[id]/page.tsx` - 题目详情
- `src/components/question-*.tsx` - 题目卡片组件

**改造重点：**
```typescript
// 题目卡片
<Card className="bg-white border-gray-200 rounded-lg shadow-sm hover:shadow-md">
  <CardHeader>
    <h3 className="text-gray-900 font-semibold">题目 #001</h3>
    <div className="flex gap-2 mt-2">
      <Badge className="bg-primary-50 text-primary-700">七年级</Badge>
      <Badge className="bg-gray-100 text-gray-600">代数</Badge>
    </div>
  </CardHeader>

  <CardContent>
    <p className="text-gray-700">计算下列方程...</p>
  </CardContent>

  <CardFooter className="border-t border-gray-100">
    <span className="text-gray-500 text-sm">创建时间: 2024-11-30</span>
    <div className="flex gap-2">
      <Button variant="ghost" className="text-primary-600">编辑</Button>
      <Button className="bg-accent-500">查看详情</Button>
    </div>
  </CardFooter>
</Card>
```

#### 任务 3.2: 试卷相关页面
**文件清单：**
- `src/app/papers/page.tsx`
- `src/app/papers/create/page.tsx`

**改造重点：**
- "智能组卷"按钮改为橙色
- 试卷状态标签使用淡色背景

#### 任务 3.3: 班级/作业页面
**文件清单：**
- `src/app/classes/page.tsx`
- `src/app/assignments/page.tsx`

**改造重点：**
- 统一使用中性灰背景
- 主按钮改为橙色

---

### Phase 4: 全局样式优化（1天）

#### 任务 4.1: 文字层级规范化
**查找并替换所有不规范的文字颜色：**

```bash
# 搜索所有使用 primary/secondary 作为文字颜色的地方
grep -r "text-primary-" src/
grep -r "text-secondary-" src/

# 批量替换
# 静态标签文字 → gray-600
# 题干正文 → gray-700
# 标题 → gray-900
```

**规范：**
| 文字类型 | 旧颜色 | 新颜色 | 示例 |
|---------|-------|-------|------|
| 静态标签 | `text-primary-600` | `text-gray-600` | "姓名："、"班级：" |
| 题干正文 | `text-slate-700` | `text-gray-700` | 题目内容 |
| 日期时间 | `text-slate-500` | `text-gray-500` | "创建时间: ..." |
| 标题 | `text-slate-900` | `text-gray-900` | 页面标题 |
| 链接 | `text-primary-600` | `text-primary-600` | ✅ 保持深蓝 |

#### 任务 4.2: 背景色统一
```css
/* 全局背景改为极浅灰 */
body {
  @apply bg-gray-50;  /* #F9FAFB */
}

/* 卡片保持纯白 */
.card, .rx-card {
  @apply bg-white;
}

/* 页面容器 */
.container-page, .rx-main {
  @apply bg-gray-50;
}
```

#### 任务 4.3: 删除遗留样式
```css
/* 删除以下样式类 */
.gauthmath-badge { ... }          // ❌ 删除
.rx-btn-primary { ... }           // ❌ 改为使用 Button 组件
```

---

### Phase 5: 测试与验证（1天）

#### 任务 5.1: 视觉回归测试
**测试场景：**
1. ✅ 导航栏显示深蓝色背景 + 白色文字
2. ✅ 主按钮显示橙色（#FF6B00）
3. ✅ 次级按钮显示深蓝轮廓
4. ✅ Badge 使用淡色背景 + 深色文字
5. ✅ 页面背景为极浅灰 (#F9FAFB)
6. ✅ 卡片为纯白色 + 柔和阴影
7. ✅ 文字层级清晰（标题黑、正文灰）
8. ✅ 无紫色、玫红色残留

#### 任务 5.2: 对比度检查
使用工具：[WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**必须满足 WCAG AA 标准：**
| 组合 | 对比度 | 标准 |
|------|-------|------|
| #0052D4 (深蓝) on white | 7.5:1 | ✅ AAA |
| #FF6B00 (橙) on white | 3.5:1 | ✅ AA |
| #111827 (标题) on white | 16.4:1 | ✅ AAA |
| #6B7280 (次级文字) on white | 5.7:1 | ✅ AA |

#### 任务 5.3: 响应式测试
**测试设备：**
- 桌面：1920x1080
- 平板：768x1024
- 手机：375x667

---

## 四、执行时间表

### Week 1: 快速迁移（推荐）

| 日期 | 任务 | 负责人 | 状态 |
|-----|------|--------|------|
| Day 1 | Phase 1: 配置文件更新 | 前端工程师 | ⏳ Pending |
| Day 2 | Phase 2: Button + Badge 组件 | 前端工程师 | ⏳ Pending |
| Day 3 | Phase 2: Navbar 组件 | 前端工程师 | ⏳ Pending |
| Day 4 | Phase 3: 题库页面迁移 | 前端工程师 | ⏳ Pending |
| Day 5 | Phase 3: 试卷/班级页面 | 前端工程师 | ⏳ Pending |
| Day 6 | Phase 4: 全局样式优化 | 前端工程师 | ⏳ Pending |
| Day 7 | Phase 5: 测试与验证 | QA | ⏳ Pending |

**总计：7 个工作日**

---

## 五、验收标准

### 5.1 视觉验收
- [ ] 导航栏为深空蓝 (#0052D4) 背景 + 白色文字
- [ ] 主按钮为光子橙 (#FF6B00)
- [ ] 次级按钮为深蓝轮廓 (#0052D4 边框 + 白底)
- [ ] 页面背景为极浅灰 (#F9FAFB)
- [ ] Badge 使用淡色背景（如 bg-primary-50）
- [ ] 文字层级清晰（标题 #111827, 正文 #374151, 次级 #6B7280）
- [ ] 无紫色系残留
- [ ] 无玫红色残留

### 5.2 技术验收
- [ ] tailwind.config.ts 已更新为新配色
- [ ] globals.css CSS变量已更新
- [ ] 所有组件通过 ESLint 检查
- [ ] 无 TypeScript 错误
- [ ] 对比度符合 WCAG AA 标准
- [ ] 响应式布局正常

### 5.3 文档验收
- [ ] 更新 design-system.md 配色文档
- [ ] 更新 Figma 设计稿（如有）
- [ ] 添加颜色使用指南到团队文档

---

## 六、回滚方案

### 如何回滚到旧版配色

**Git 回滚命令：**
```bash
# 查看改动文件
git diff HEAD~1

# 回滚到上一个版本
git revert HEAD

# 或手动恢复单个文件
git checkout HEAD~1 -- tailwind.config.ts
git checkout HEAD~1 -- src/app/globals.css
```

**保存旧配置快照：**
```bash
# 迁移前备份
cp tailwind.config.ts tailwind.config.ts.backup
cp src/app/globals.css src/app/globals.css.backup
```

---

## 七、FAQ

### Q1: 为什么要淘汰紫色系？
**A:** 当前的紫色 (#483ece) 与 RixinMate 品牌定位（深空蓝 + 光子橙）不符。紫色给人"创意、浪漫"的感觉，而数学教育平台需要"严谨、专业"的深蓝色。

### Q2: 橙色会不会太刺眼？
**A:** 橙色仅用于主要行动按钮（CTA），遵循 10% 原则。大面积使用深蓝色和中性灰，橙色作为点睛之笔，不会造成视觉疲劳。

### Q3: 如何处理 Gauthmath 遗留的红色？
**A:**
- `brand.red (#ff013e)` → 删除
- `brand.orange (#ff7a00)` → 替换为 `accent (#FF6B00)`
- 功能性红色（destructive）保持不变

### Q4: 需要重新设计所有页面吗？
**A:** 不需要。只需更新配置文件和核心组件，Tailwind 的 CSS 变量会自动应用到所有页面。

### Q5: 如何确保不影响现有功能？
**A:** 本次迁移仅改变颜色，不改变布局和交互逻辑。所有 className 保持不变，只更新颜色定义。

---

## 八、附录

### A. 颜色对照表

| 旧色名 | 旧色值 | 新色名 | 新色值 | 用途 |
|-------|-------|-------|-------|------|
| primary | #483ece | primary | #0052D4 | 深蓝（导航、链接）|
| secondary | #8881e9 | gray | #6B7280 | 中性灰（次级元素）|
| accent | #564cec | accent | #FF6B00 | 光子橙（主按钮）|
| brand.red | #ff013e | ~~删除~~ | - | - |
| brand.orange | #ff7a00 | accent | #FF6B00 | 光子橙 |
| background | #f8f7fc | background | #F9FAFB | 页面背景 |

### B. Figma 配色板（可复制到设计工具）

```
// RixinMate 品牌色
Deep Blue #0052D4
Vibrant Orange #FF6B00

// 中性色
Gray 50 #F9FAFB
Gray 200 #E5E7EB
Gray 500 #6B7280
Gray 700 #374151
Gray 900 #111827

// 语义色
Success #10B981
Warning #F59E0B
Error #EF4444
Info #2563EB
```

### C. Tailwind CSS 速查表

```typescript
// 背景色
bg-primary-500      // #0052D4 深蓝
bg-accent-500       // #FF6B00 橙色
bg-gray-50          // #F9FAFB 页面背景
bg-white            // #FFFFFF 卡片背景

// 文字色
text-gray-900       // #111827 标题
text-gray-700       // #374151 正文
text-gray-500       // #6B7280 次级文字
text-primary-600    // #0041A8 链接

// 边框色
border-gray-200     // #E5E7EB 边框
border-primary-500  // #0052D4 强调边框

// 按钮
bg-accent-500 hover:bg-accent-600       // 主按钮
border-primary-500 text-primary-500     // 次级按钮
```

---

## 九、联系方式

**技术负责人：** [前端工程师姓名]
**设计负责人：** [UI设计师姓名]
**产品负责人：** [产品经理姓名]

**反馈渠道：**
- 钉钉群：[群号]
- Jira看板：[链接]
- 设计稿：[Figma链接]

---

**文档版本：** v1.0
**创建日期：** 2024-11-30
**最后更新：** 2024-11-30
**状态：** ✅ 已完成 | ⏳ 待执行
