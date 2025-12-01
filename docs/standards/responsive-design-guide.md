# 响应式设计指南

**项目**: 日新教学平台 (Rixindemo-codex-m1)
**创建日期**: 2025-11-28
**版本**: v1.0

---

## 📋 目录

1. [设计原则](#设计原则)
2. [断点系统](#断点系统)
3. [组件响应式规范](#组件响应式规范)
4. [已完成的响应式改造](#已完成的响应式改造)
5. [待改造的组件](#待改造的组件)
6. [最佳实践](#最佳实践)

---

## 🎯 设计原则

### 核心原则

1. **移动优先 (Mobile First)**
   - 从最小屏幕开始设计
   - 逐步增强到更大屏幕
   - 确保核心功能在所有设备上可用

2. **内容优先 (Content First)**
   - 优先展示最重要的内容
   - 在小屏幕上隐藏次要信息
   - 使用渐进式披露

3. **触摸友好 (Touch Friendly)**
   - 按钮最小尺寸 44×44px
   - 增加点击区域的间距
   - 避免悬停依赖的交互

4. **性能优化 (Performance)**
   - 减少不必要的重排和重绘
   - 使用 CSS 而非 JavaScript 实现响应式
   - 懒加载非关键资源

---

## 📐 断点系统

### Tailwind CSS 默认断点

```typescript
const breakpoints = {
  sm: '640px',   // 手机横屏、小平板
  md: '768px',   // 平板竖屏
  lg: '1024px',  // 平板横屏、小笔记本
  xl: '1280px',  // 桌面显示器
  '2xl': '1536px' // 大屏显示器
}
```

### 使用示例

```tsx
// Tailwind 类名
<div className="
  w-full           // 默认全宽
  sm:w-1/2         // 640px+ 半宽
  md:w-1/3         // 768px+ 三分之一
  lg:w-1/4         // 1024px+ 四分之一
">
  内容
</div>

// 容器最大宽度
<div className="
  container        // 响应式容器
  mx-auto          // 水平居中
  px-4             // 默认内边距
  sm:px-6          // 640px+ 增加内边距
  lg:px-8          // 1024px+ 进一步增加
">
  内容
</div>
```

---

## 🧩 组件响应式规范

### 1. 导航栏 (Navbar)

**文件**: [src/components/Navbar.tsx](../src/components/Navbar.tsx)

**响应式策略**:
- **移动端** (< 768px): 汉堡菜单 + 抽屉导航
- **桌面端** (≥ 768px): 水平导航栏

```tsx
// 移动端菜单按钮
<button className="md:hidden">
  <Menu className="h-6 w-6" />
</button>

// 桌面端导航链接
<nav className="hidden md:flex md:gap-6">
  <Link href="/questions">题库</Link>
  <Link href="/papers">试卷</Link>
</nav>
```

### 2. 卡片布局 (Card Grid)

**响应式网格**:

```tsx
<div className="
  grid
  grid-cols-1        // 移动端: 1列
  sm:grid-cols-2     // 小屏: 2列
  lg:grid-cols-3     // 大屏: 3列
  xl:grid-cols-4     // 超大屏: 4列
  gap-4              // 间距
  sm:gap-6           // 大屏增加间距
">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### 3. 表单布局 (Form)

**响应式表单**:

```tsx
<form className="space-y-6">
  {/* 单列布局 (移动端) → 双列布局 (桌面端) */}
  <div className="
    grid
    grid-cols-1
    lg:grid-cols-2
    gap-6
  ">
    <FormField name="firstName" />
    <FormField name="lastName" />
  </div>

  {/* 全宽字段 */}
  <FormField name="email" className="lg:col-span-2" />
</form>
```

### 4. 表格 (Table)

**响应式策略**:
- **移动端**: 卡片视图或横向滚动
- **桌面端**: 标准表格

```tsx
// 方案1: 横向滚动
<div className="overflow-x-auto">
  <table className="min-w-full">
    ...
  </table>
</div>

// 方案2: 卡片视图 (移动端)
<div className="lg:hidden">
  {items.map(item => (
    <Card key={item.id}>
      <div className="space-y-2">
        <div><strong>题干:</strong> {item.content}</div>
        <div><strong>难度:</strong> {item.difficulty}</div>
      </div>
    </Card>
  ))}
</div>

// 标准表格 (桌面端)
<div className="hidden lg:block">
  <table>...</table>
</div>
```

### 5. 侧边栏布局 (Sidebar)

**响应式策略**:
- **移动端**: 抽屉式侧边栏
- **桌面端**: 固定侧边栏

```tsx
<div className="flex">
  {/* 侧边栏 */}
  <aside className="
    hidden              // 移动端隐藏
    lg:block            // 桌面端显示
    lg:w-64             // 固定宽度
    lg:flex-shrink-0    // 不收缩
  ">
    <nav>...</nav>
  </aside>

  {/* 主内容区 */}
  <main className="
    flex-1
    min-w-0             // 防止溢出
    px-4
    lg:px-8
  ">
    内容
  </main>
</div>
```

---

## ✅ 已完成的响应式改造

### 1. useExportTask.ts
- ✅ 替换 `message` 为 `toast`
- ✅ Toast 通知在移动端自动适配

### 2. questions/[id]/page.tsx
- ✅ 替换 `Modal` 为 `Dialog`
- ✅ 替换 `Radio` 为 `RadioGroup`
- ✅ 使用 `flex-wrap` 实现响应式布局
- ✅ 删除对话框在移动端自动全屏

**改进点**:
```tsx
// 响应式按钮组
<div className="flex items-center gap-3 flex-wrap">
  <Button>返回</Button>
  <Button>编辑</Button>
  <Button>删除</Button>
</div>

// 响应式知识点标签
<div className="flex flex-wrap gap-2">
  {knowledgePoints.map(kp => (
    <Badge key={kp}>{kp}</Badge>
  ))}
</div>
```

### 3. QuestionsFilterBar.tsx
- ✅ 替换 antd `Input` 为 shadcn/ui `Input`
- ✅ 使用 `flex-wrap` 实现响应式筛选栏
- ✅ 搜索框在移动端自动调整宽度

**改进点**:
```tsx
// 响应式筛选栏
<div className="flex flex-wrap items-center gap-4">
  <div className="flex items-center gap-2">
    <Filter className="h-4 w-4" />
    <span className="text-sm font-medium">筛选条件</span>
  </div>

  {/* 筛选器 */}
  <div className="flex items-center gap-4 flex-wrap">
    <Select>...</Select>
    <Select>...</Select>
  </div>

  {/* 搜索框 - 移动端全宽，桌面端固定宽度 */}
  <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
    <Input className="w-full sm:w-64" />
  </div>
</div>
```

---

## ⏳ 待改造的组件

### 优先级 P0 (核心功能)

1. **questions/page.tsx**
   - 当前: 使用 antd `Table`
   - 目标: 移动端卡片视图 + 桌面端表格
   - 预计工作量: 2-3 小时

2. **question-form.tsx**
   - 当前: 使用 antd `Form`
   - 目标: 响应式表单布局
   - 预计工作量: 3-4 小时

3. **question-basket-drawer.tsx**
   - 当前: 使用 antd `Drawer`
   - 目标: 响应式抽屉 (移动端全屏)
   - 预计工作量: 1-2 小时

### 优先级 P1 (次要功能)

4. **layout.tsx**
   - 当前: 使用 antd `ConfigProvider`
   - 目标: 移除 antd 依赖
   - 预计工作量: 30 分钟

5. **test-components/page.tsx**
   - 当前: 测试页面
   - 目标: 可选改造或删除
   - 预计工作量: 1 小时

---

## 💡 最佳实践

### 1. 使用 Tailwind 响应式类

```tsx
// ✅ 推荐: 使用 Tailwind 断点
<div className="text-sm md:text-base lg:text-lg">
  响应式文字大小
</div>

// ❌ 避免: 使用媒体查询
<div className="custom-responsive">
  需要额外 CSS
</div>
```

### 2. 容器查询 (Container Queries)

```tsx
// 使用 @container 实现组件级响应式
<div className="@container">
  <div className="@sm:flex @md:grid @lg:grid-cols-3">
    内容
  </div>
</div>
```

### 3. 隐藏/显示元素

```tsx
// 移动端隐藏
<div className="hidden md:block">
  桌面端内容
</div>

// 桌面端隐藏
<div className="md:hidden">
  移动端内容
</div>

// 仅在特定断点显示
<div className="hidden md:block lg:hidden">
  仅在 md 断点显示
</div>
```

### 4. 响应式间距

```tsx
// 响应式 padding
<div className="p-4 md:p-6 lg:p-8">
  内容
</div>

// 响应式 gap
<div className="flex gap-2 md:gap-4 lg:gap-6">
  项目
</div>
```

### 5. 响应式字体

```tsx
// 使用 Tailwind 字体大小
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  标题
</h1>

// 使用 clamp() 实现流式字体
<h1 className="text-[clamp(1.5rem,5vw,3rem)]">
  流式标题
</h1>
```

### 6. 触摸目标大小

```tsx
// 确保按钮足够大 (最小 44×44px)
<button className="
  min-h-[44px]
  min-w-[44px]
  px-4
  py-2
">
  按钮
</button>
```

### 7. 图片响应式

```tsx
// 响应式图片
<img
  src="/image.jpg"
  alt="描述"
  className="
    w-full
    h-auto
    object-cover
    rounded-lg
  "
/>

// 使用 Next.js Image 组件
<Image
  src="/image.jpg"
  alt="描述"
  width={800}
  height={600}
  className="w-full h-auto"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

---

## 🔍 测试清单

### 设备测试

- [ ] iPhone SE (375×667)
- [ ] iPhone 12/13 (390×844)
- [ ] iPhone 14 Pro Max (430×932)
- [ ] iPad (768×1024)
- [ ] iPad Pro (1024×1366)
- [ ] 桌面 (1920×1080)
- [ ] 超宽屏 (2560×1440)

### 功能测试

- [ ] 导航菜单在所有断点正常工作
- [ ] 表单在移动端可正常填写
- [ ] 表格在移动端可正常查看
- [ ] 图片在所有设备正常加载
- [ ] 按钮在触摸设备易于点击
- [ ] 文字在所有设备可读

### 性能测试

- [ ] 移动端首屏加载 < 3秒
- [ ] 无横向滚动条 (除非有意设计)
- [ ] 无布局抖动 (CLS < 0.1)
- [ ] 触摸响应延迟 < 100ms

---

## 📚 参考资源

### 官方文档

- [Tailwind CSS 响应式设计](https://tailwindcss.com/docs/responsive-design)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Next.js 图片优化](https://nextjs.org/docs/basic-features/image-optimization)

### 设计指南

- [Material Design 响应式布局](https://material.io/design/layout/responsive-layout-grid.html)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

### 工具

- [Chrome DevTools 设备模拟](https://developer.chrome.com/docs/devtools/device-mode/)
- [Responsively App](https://responsively.app/) - 多设备预览
- [BrowserStack](https://www.browserstack.com/) - 真机测试

---

## 📝 更新日志

### v1.0 (2025-11-28)

- ✅ 创建响应式设计指南
- ✅ 完成 useExportTask.ts 的 message 替换
- ✅ 完成 questions/[id]/page.tsx 的响应式改造
- ✅ 完成 QuestionsFilterBar.tsx 的响应式改造
- ✅ 定义断点系统和设计原则
- ✅ 列出待改造组件清单

### 下一步计划

1. 改造 questions/page.tsx 表格为响应式
2. 改造 question-form.tsx 表单布局
3. 改造 question-basket-drawer.tsx 抽屉组件
4. 移除所有 antd 依赖
5. 完成全站响应式测试

---

**维护者**: Claude Code
**最后更新**: 2025-11-28
