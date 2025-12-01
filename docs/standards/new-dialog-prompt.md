# 新对话框启动 Prompt

**项目**: 日新教学平台 (Rixindemo-codex-m1)
**当前状态**: 正在执行 antd 到 shadcn/ui 的迁移工作
**进度**: 方案A已完成（100%），方案B进行中（33%）

---

## 🎯 复制以下内容到新对话框

```
你好！我正在进行一个 Next.js 项目的 UI 组件库迁移工作，需要将 antd 组件替换为 shadcn/ui 组件。

## 项目背景

- **项目名称**: 日新教学平台
- **技术栈**: Next.js 14 + TypeScript + Tailwind CSS + Supabase
- **工作目录**: d:\rixinwork\Rixindemo-codex-m1

## 已完成的工作

### 方案A：快速完成所有 message 替换（✅ 100%完成）

已完成的文件：
1. ✅ src/hooks/useExportTask.ts - 替换了 4 处 message 调用
2. ✅ src/app/questions/[id]/page.tsx - 替换了 2 处 message + 全面响应式改造
3. ✅ src/app/questions/_components/QuestionsFilterBar.tsx - 替换 antd Input
4. ✅ 创建了响应式设计文档
5. ✅ 修复了 3 个构建错误

### 方案B：分批替换剩余的 antd 组件（⏳ 33%完成）

已完成的文件：
1. ✅ src/app/test-components/page.tsx - 已删除（测试页面）
2. ✅ src/components/questions/question-basket-drawer.tsx - 全面替换完成
   - Drawer → Sheet
   - Empty → 自定义空状态
   - Modal → Dialog
   - Tag → Badge
   - Progress → shadcn/ui Progress

已创建的组件：
- ✅ src/components/ui/form.tsx
- ✅ src/components/ui/sheet.tsx

## 剩余工作（需要继续）

还有 **3 个文件**需要处理：

### 1. src/app/questions/page.tsx（优先级：P0，预计 2-3 小时）

**使用的 antd 组件**：
- Table - 表格组件（最复杂，需要响应式方案）
- Space - 间距组件
- Modal - 对话框
- Radio - 单选框
- Upload - 上传组件
- Input - 输入框

**替换策略**：
- Table → 移动端用卡片视图，桌面端用 shadcn/ui Table
- Space → flex 布局
- Modal → Dialog
- Radio → RadioGroup
- Upload → 自定义上传组件
- Input → shadcn/ui Input

### 2. src/app/questions/_components/question-form.tsx（优先级：P0，预计 3-4 小时）

**使用的 antd 组件**：
- Form + Form.Item - 表单组件
- Input + Input.TextArea - 输入组件
- Radio + Radio.Group - 单选组件
- Upload - 上传组件
- message - 消息提示

**替换策略**：
- Form → react-hook-form + shadcn/ui Form
- Input/TextArea → shadcn/ui Input/Textarea
- Radio → shadcn/ui RadioGroup
- Upload → 自定义上传组件
- message → toast

### 3. src/app/layout.tsx + package.json（优先级：P1，预计 35 分钟）

**清理工作**：
- 移除 ConfigProvider 和 AntdRegistry
- 从 package.json 删除 antd 依赖

## 相关文档

请先阅读以下文档了解上下文：
1. docs/方案A执行报告.md - 已完成的 message 替换工作
2. docs/方案B执行报告.md - 当前进度和剩余工作
3. docs/responsive-design-guide.md - 响应式设计规范

## 我需要你帮我

请继续执行方案B，完成剩余 3 个文件的 antd 组件替换工作。建议按以下顺序进行：

1. 先处理 questions/page.tsx（最复杂，需要重点关注 Table 的响应式方案）
2. 再处理 question-form.tsx（需要集成 react-hook-form）
3. 最后清理 layout.tsx 和 package.json

请开始吧！
```

---

## 📝 补充说明

### 如果需要更详细的上下文

可以在新对话框中补充说明：

```
补充信息：

1. **已替换的组件映射**：
   - message → toast (useToast hook)
   - Modal → Dialog
   - Drawer → Sheet
   - Empty → 自定义空状态（Inbox 图标）
   - Tag → Badge
   - Progress → shadcn/ui Progress
   - Radio → RadioGroup
   - Skeleton → 自定义加载动画
   - Space → flex 布局
   - Input → shadcn/ui Input

2. **项目特点**：
   - 使用 Tailwind CSS 进行样式管理
   - 已有完整的 shadcn/ui 组件库
   - 需要保持响应式设计（移动端优先）
   - 保留所有 data-testid 属性用于测试

3. **注意事项**：
   - 不要修改业务逻辑，只替换 UI 组件
   - 保持原有的功能和交互
   - 确保响应式布局正常工作
   - 替换后需要验证构建是否成功
```

---

## 🔍 快速检查命令

在新对话框中，可以使用以下命令快速了解当前状态：

```bash
# 检查还有哪些文件使用 antd
cd "d:\rixinwork\Rixindemo-codex-m1"
grep -r "from 'antd'" src/ --include="*.tsx" --include="*.ts"

# 检查项目是否能构建
npm run build

# 查看 git 状态
git status
```

---

## 📚 关键文件路径

```
项目根目录: d:\rixinwork\Rixindemo-codex-m1

待处理文件：
- src/app/questions/page.tsx
- src/app/questions/_components/question-form.tsx
- src/app/layout.tsx

文档目录：
- docs/方案A执行报告.md
- docs/方案B执行报告.md
- docs/responsive-design-guide.md

UI 组件目录：
- src/components/ui/
```

---

## ✅ 验收标准

完成后应该达到：
- [ ] 所有 antd 组件已替换
- [ ] package.json 中已移除 antd 依赖
- [ ] 项目能成功构建（npm run build）
- [ ] 所有页面功能正常
- [ ] 响应式布局在移动端和桌面端都正常
- [ ] 保留了所有 data-testid 属性

---

**生成时间**: 2025-11-28 15:55
**当前进度**: 方案B 33% 完成
**预计剩余时间**: 6-8 小时
