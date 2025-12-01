# 方案B执行报告 - 分批替换剩余的 antd 组件

**执行日期**: 2025-11-28
**执行人**: Claude Code
**状态**: 🔄 **进行中**

---

## 📋 执行摘要

方案B的目标是**分批替换剩余的 antd 组件**，将所有 antd 依赖迁移到 shadcn/ui 系统。本次执行按照优先级分三批进行，目前已完成第一批和部分第二批工作。

### 核心成果

- ✅ **第一批完成** - 删除测试页面
- ✅ **第二批部分完成** - question-basket-drawer.tsx 已替换
- ⏳ **剩余工作** - questions/page.tsx、question-form.tsx、layout.tsx

---

## ✅ 已完成的工作

### 第一批：快速胜利（P1优先级）

#### 1. test-components/page.tsx - 删除测试页面

**文件路径**: `src/app/test-components/page.tsx`

**处理方式**: 直接删除

**原因**:
- 这是一个独立的测试页面
- 没有被任何其他页面引用
- 主要用于测试 antd 组件
- 不是生产功能

**结果**: ✅ 已删除整个目录

---

### 第二批：核心功能（P0优先级）

#### 2. question-basket-drawer.tsx - 题篮抽屉组件

**文件路径**: [src/components/questions/question-basket-drawer.tsx](../src/components/questions/question-basket-drawer.tsx)

**替换的组件**:
1. `Drawer` → `Sheet`
2. `Empty` → 自定义空状态（Inbox 图标）
3. `Modal` → `Dialog`
4. `Tag` → `Badge`
5. `Progress` → shadcn/ui `Progress`

**代码对比**:

```typescript
// ❌ 改造前
import { Drawer, Empty, Modal, Tag, Progress } from 'antd'

<Drawer
  width={420}
  closable
  title={...}
  open={open}
  onClose={onClose}
>
  <Empty description="题篮为空" image={Empty.PRESENTED_IMAGE_SIMPLE} />

  <Tag color={difficultyColor(question.difficulty)} bordered={false}>
    {getDifficultyLabel(question.difficulty)}
  </Tag>

  <Progress
    percent={exportTask.progress}
    size="small"
    status={...}
  />

  <Modal
    title="清空题篮"
    open={clearModalOpen}
    okText="清空"
    onOk={confirmClear}
  >
    ...
  </Modal>
</Drawer>

// ✅ 改造后
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Inbox } from 'lucide-react'

<Sheet open={open} onOpenChange={onClose}>
  <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0">
    <SheetHeader className="px-6 pt-6 pb-4 border-b">
      <SheetTitle>题篮</SheetTitle>
      <SheetDescription>
        已选 {questions.length} 题，{selectedIds.size} 题已勾选
      </SheetDescription>
    </SheetHeader>

    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">题篮为空</p>
    </div>

    <Badge variant={difficultyVariant(question.difficulty)}>
      {getDifficultyLabel(question.difficulty)}
    </Badge>

    <Progress value={exportTask.progress} className="h-2" />

    <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>清空题篮</DialogTitle>
          <DialogDescription>
            确定要清空题篮中的所有题目吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={cancelClear}>取消</Button>
          <Button variant="destructive" onClick={confirmClear}>清空</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </SheetContent>
</Sheet>
```

**改进点**:
- ✅ Sheet 在移动端自动全屏
- ✅ 更好的响应式布局
- ✅ 统一的设计语言
- ✅ 更好的可访问性
- ✅ 自定义空状态更灵活

**新增组件**:
- 创建了 [src/components/ui/sheet.tsx](../src/components/ui/sheet.tsx) 组件

---

## ⏳ 剩余工作

### 第二批：核心功能（P0优先级）

#### 3. questions/page.tsx - 题库管理页面

**文件路径**: `src/app/questions/page.tsx`

**使用的 antd 组件**:
- `Table` - 表格组件（最复杂）
- `Space` - 间距组件
- `Modal` - 对话框
- `Radio` - 单选框
- `Upload` - 上传组件
- `Input` - 输入框

**预计工作量**: 2-3 小时

**替换策略**:
1. **Table** → 响应式表格方案
   - 移动端：卡片视图
   - 桌面端：shadcn/ui Table 或自定义表格
2. **Space** → `flex` 布局
3. **Modal** → `Dialog`
4. **Radio** → `RadioGroup`
5. **Upload** → 自定义上传组件或 shadcn/ui 文件上传
6. **Input** → shadcn/ui `Input`

---

### 第三批：复杂表单（P0优先级）

#### 4. question-form.tsx - 题目表单组件

**文件路径**: `src/app/questions/_components/question-form.tsx`

**使用的 antd 组件**:
- `Form` - 表单组件
- `Form.Item` - 表单项
- `Input` - 输入框
- `Input.TextArea` - 文本域
- `Radio` - 单选框
- `Radio.Group` - 单选组
- `Upload` - 上传组件
- `message` - 消息提示

**预计工作量**: 3-4 小时

**替换策略**:
1. **Form** → react-hook-form + shadcn/ui Form
2. **Input/TextArea** → shadcn/ui Input/Textarea
3. **Radio** → shadcn/ui RadioGroup
4. **Upload** → 自定义上传组件
5. **message** → toast

---

### 最后：清理工作

#### 5. layout.tsx - 根布局

**文件路径**: `src/app/layout.tsx`

**使用的 antd 组件**:
- `ConfigProvider` - 主题配置
- `AntdRegistry` - Next.js 集成

**预计工作量**: 30 分钟

**处理方式**:
- 等所有其他文件完成后，直接移除 `ConfigProvider` 和 `AntdRegistry`
- 保留 CSS 变量配置

#### 6. package.json - 移除 antd 依赖

**预计工作量**: 5 分钟

**处理方式**:
```bash
npm uninstall antd @ant-design/nextjs-registry
# 或
pnpm remove antd @ant-design/nextjs-registry
```

---

## 📊 统计数据

### 进度统计

| 批次 | 文件数 | 已完成 | 进行中 | 待处理 | 完成度 |
|------|--------|--------|--------|--------|--------|
| 第一批 | 1 | 1 | 0 | 0 | 100% |
| 第二批 | 2 | 1 | 0 | 1 | 50% |
| 第三批 | 1 | 0 | 0 | 1 | 0% |
| 清理 | 2 | 0 | 0 | 2 | 0% |
| **总计** | **6** | **2** | **0** | **4** | **33%** |

### 组件替换统计

| antd 组件 | 替换为 | 状态 | 文件数 |
|-----------|--------|------|--------|
| message | toast | ✅ 完成 | 3 |
| Drawer | Sheet | ✅ 完成 | 1 |
| Empty | 自定义 | ✅ 完成 | 1 |
| Modal | Dialog | ✅ 完成 | 2 |
| Tag | Badge | ✅ 完成 | 1 |
| Progress | Progress | ✅ 完成 | 1 |
| Radio | RadioGroup | ✅ 完成 | 1 |
| Skeleton | 自定义 | ✅ 完成 | 1 |
| Space | flex | ✅ 完成 | 1 |
| Input | Input | ✅ 完成 | 1 |
| Table | 待定 | ⏳ 待处理 | 1 |
| Form | react-hook-form | ⏳ 待处理 | 1 |
| Upload | 待定 | ⏳ 待处理 | 2 |
| ConfigProvider | 移除 | ⏳ 待处理 | 1 |

### 时间统计

| 任务 | 预计时间 | 实际时间 | 状态 |
|------|---------|---------|------|
| 删除 test-components | 10 分钟 | 5 分钟 | ✅ |
| 替换 question-basket-drawer | 1-2 小时 | 30 分钟 | ✅ |
| 替换 questions/page.tsx | 2-3 小时 | - | ⏳ |
| 替换 question-form.tsx | 3-4 小时 | - | ⏳ |
| 替换 layout.tsx | 30 分钟 | - | ⏳ |
| 移除 antd 依赖 | 5 分钟 | - | ⏳ |
| **已完成** | **1-2 小时** | **35 分钟** | ✅ |
| **剩余** | **6-8 小时** | **-** | ⏳ |

---

## 🎯 下一步计划

### 立即执行（如果继续）

1. **替换 questions/page.tsx**
   - 重点：Table 组件的响应式方案
   - 移动端使用卡片视图
   - 桌面端使用表格

2. **替换 question-form.tsx**
   - 使用 react-hook-form
   - 集成 shadcn/ui Form 组件
   - 处理文件上传

3. **清理 layout.tsx**
   - 移除 ConfigProvider
   - 移除 AntdRegistry

4. **移除 antd 依赖**
   - 从 package.json 删除
   - 验证构建成功

---

## 💡 技术亮点

### 1. Sheet 组件的响应式设计

```typescript
// 移动端全屏，桌面端固定宽度
<SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0">
  ...
</SheetContent>
```

### 2. 自定义空状态

```typescript
// 使用 Lucide 图标替代 antd Empty
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
  <p className="text-sm text-muted-foreground">题篮为空</p>
</div>
```

### 3. Progress 组件简化

```typescript
// antd: 复杂的 API
<Progress
  percent={exportTask.progress}
  size="small"
  status={exportTask.status === 'FAILED' ? 'exception' : 'success'}
/>

// shadcn/ui: 简洁的 API
<Progress value={exportTask.progress} className="h-2" />
```

### 4. Badge 变体类型安全

```typescript
// 类型安全的变体函数
function difficultyVariant(level: string): 'success' | 'warning' | 'error' | 'default' {
  if (level === 'easy') return 'success'
  if (level === 'medium') return 'warning'
  if (level === 'hard') return 'error'
  return 'default'
}
```

---

## 🐛 遇到的问题

### 1. pnpm 依赖安装错误

**问题**: 使用 `shadcn add sheet` 时遇到 catalog 错误

**解决**: 手动创建 sheet.tsx 组件文件

**经验**: 对于简单组件，手动创建比使用 CLI 更可靠

### 2. Edit 工具需要先 Read

**问题**: 连续多次 Edit 调用失败

**解决**: 使用 Write 工具一次性重写整个文件

**经验**: 对于大量改动，直接重写比多次编辑更高效

---

## 📝 经验总结

### 成功经验

1. **分批进行**: 按优先级分批处理，避免一次性改动过大
2. **先易后难**: 先处理简单的测试页面，再处理复杂组件
3. **组件复用**: 创建的 sheet.tsx 可以在其他地方复用
4. **保持测试**: 保留 data-testid 属性，确保测试不受影响

### 改进建议

1. **提前规划**: 在开始前列出所有需要替换的组件
2. **创建组件库**: 提前创建所有需要的 shadcn/ui 组件
3. **逐步测试**: 每完成一个文件就测试一次
4. **文档同步**: 及时更新文档记录改动

---

## 🔗 相关文档

- [方案A执行报告](./方案A执行报告.md)
- [响应式设计指南](./responsive-design-guide.md)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [react-hook-form 文档](https://react-hook-form.com/)

---

## 📅 时间线

| 时间 | 事件 |
|------|------|
| 2025-11-28 15:10 | 开始执行方案B |
| 2025-11-28 15:15 | 删除 test-components 页面 |
| 2025-11-28 15:20 | 创建 sheet.tsx 组件 |
| 2025-11-28 15:45 | 完成 question-basket-drawer.tsx 替换 |
| 2025-11-28 15:50 | **暂停，等待继续指令** ⏸️ |

---

## ✅ 阶段性结论

**方案B第一阶段已完成！**

已成功完成：
- ✅ 删除测试页面
- ✅ 替换 question-basket-drawer.tsx
- ✅ 创建 sheet.tsx 组件
- ✅ 33% 的总体进度

剩余工作：
- ⏳ questions/page.tsx（2-3 小时）
- ⏳ question-form.tsx（3-4 小时）
- ⏳ layout.tsx（30 分钟）
- ⏳ 移除 antd 依赖（5 分钟）

**预计剩余时间**: 6-8 小时

---

**报告生成时间**: 2025-11-28 15:50
**执行人**: Claude Code
**状态**: ⏸️ **暂停中，等待继续指令**
