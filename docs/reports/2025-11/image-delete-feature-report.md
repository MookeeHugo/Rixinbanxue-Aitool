# 配图删除功能优化报告

**日期**: 2025-12-01
**需求**: 在题目编辑中增加删除配图的功能，方便删除框选修复后的旧瑕疵图片
**状态**: ✅ 已完成

## 需求背景

用户在使用"框选修复"功能后，会生成新的正确配图，但旧的瑕疵图片仍然保留在题目中。需要提供便捷的删除功能来清理这些不需要的配图。

## 功能设计

### 删除入口

提供了**两个删除入口**，方便用户在不同场景下使用：

#### 1. 拖拽编辑器中的删除按钮
- **位置**: 编辑对话框 → 配图管理标签页 → 图片网格的右上角
- **图标**: 红色垃圾桶图标
- **适用场景**: 快速浏览多张图片时删除

#### 2. 图片操作列表中的删除按钮
- **位置**: 编辑对话框 → 配图管理标签页 → 下方"图片操作"列表
- **样式**: "删除" 按钮（红色文字）
- **适用场景**: 查看图片详细信息后删除

## 实现细节

### 1. 统一的删除处理函数

**文件**: [src/components/question-review-card.tsx:112-127](src/components/question-review-card.tsx#L112-L127)

```tsx
const handleImageDelete = useCallback((imageId: string) => {
  const asset = editedData.imageAssets.find((a) => a.id === imageId)
  const assetName = asset?.placeholder || '此配图'

  // 确认对话框
  if (window.confirm(`确定要删除"${assetName}"吗？\n\n删除后需要点击"保存修改"才会生效。`)) {
    // 从 imageAssets 中过滤掉目标图片
    setEditedData((prev) => ({
      ...prev,
      imageAssets: prev.imageAssets.filter((asset) => asset.id !== imageId)
    }))

    // 提示用户
    toast({
      title: '已从列表中移除',
      description: '点击"保存修改"后将永久删除此配图'
    })
  }
}, [editedData.imageAssets, toast])
```

**关键特性**:
- ✅ 删除前显示确认对话框，防止误删
- ✅ 确认对话框中显示配图名称
- ✅ 明确提示需要保存才会生效
- ✅ 删除后显示 Toast 提示

### 2. ImagePositionEditor 集成

**文件**: [src/components/question-review-card.tsx:600-603](src/components/question-review-card.tsx#L600-L603)

```tsx
<ImagePositionEditor
  images={convertToImageItems(editedData.imageAssets)}
  onChange={handleImageReorder}
  onDelete={handleImageDelete}  // 连接删除处理函数
  layout="grid"
  columns={3}
  showDelete={true}  // 启用删除按钮
  showPreview={true}
  imageSize="md"
/>
```

### 3. 图片操作列表删除按钮

**文件**: [src/components/question-review-card.tsx:654-662](src/components/question-review-card.tsx#L654-L662)

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => handleImageDelete(asset.id)}
  className="text-red-600 hover:text-red-700 hover:bg-red-50"
>
  <Trash2 className="w-3 h-3 mr-1" />
  删除
</Button>
```

### 4. 配图管理说明

**文件**: [src/components/question-review-card.tsx:588-597](src/components/question-review-card.tsx#L588-L597)

添加了醒目的蓝色提示框，说明配图管理功能：

```tsx
<div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
    配图管理说明
  </p>
  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
    <li>上方拖拽区域：调整图片顺序</li>
    <li>下方操作列表：增强或删除单张图片</li>
    <li>删除瑕疵图片后，记得点击"保存修改"按钮</li>
  </ul>
</div>
```

## 用户操作流程

### 场景：删除框选修复后的旧瑕疵图片

1. **打开编辑对话框**
   - 点击题目卡片上的"编辑"按钮

2. **切换到配图管理标签**
   - 点击"配图管理 (N)"标签页
   - 查看配图管理说明

3. **选择删除方式**

   **方式一：在拖拽编辑器中删除**
   - 找到要删除的瑕疵图片
   - 点击图片右上角的红色垃圾桶图标
   - 在确认对话框中点击"确定"
   - 查看 Toast 提示："已从列表中移除"

   **方式二：在图片操作列表中删除**
   - 滚动到下方"图片操作"列表
   - 找到要删除的图片（可以看到缩略图、名称、来源）
   - 点击"删除"按钮
   - 在确认对话框中点击"确定"
   - 查看 Toast 提示

4. **保存修改**
   - 点击对话框底部的"保存修改"按钮
   - 等待保存成功提示
   - 配图已永久删除

## 技术细节

### 状态管理

删除操作修改的是 `editedData.imageAssets` 数组：

```tsx
const [editedData, setEditedData] = useState({
  type: question.type,
  content: question.content,
  options: question.options || [],
  answer: question.answer || '',
  imageAssets: question.image_assets || [],  // 配图数组
  tags: { ... }
})
```

### 数据持久化

点击"保存修改"后，通过 `updateQuestion` Server Action 将更新后的 `imageAssets` 保存到数据库：

```tsx
const handleSave = async () => {
  const result = await updateQuestion(question.id, editedData)
  // editedData 包含更新后的 imageAssets
}
```

**Server Action**: [src/app/actions/question-upload.ts](src/app/actions/question-upload.ts)

### 实时反馈

- **标签页数字**: 配图数量实时更新
  ```tsx
  <TabsTrigger value="images">配图管理 ({editedData.imageAssets.length})</TabsTrigger>
  ```

- **确认对话框**: 使用原生 `window.confirm()`
  - 优点：简单可靠，无需额外组件
  - 缺点：样式无法自定义

- **Toast 提示**: 使用 shadcn/ui toast 组件
  - 位置：屏幕右上角
  - 自动消失时间：5秒

## 用户体验优化

### 1. 防误删设计

- ✅ 删除前必须确认
- ✅ 确认对话框显示配图名称
- ✅ 明确说明需要保存才会生效
- ✅ 删除后有 Toast 反馈

### 2. 视觉反馈

- ✅ 删除按钮使用红色，表示危险操作
- ✅ 配图数量实时更新
- ✅ 删除后图片立即从界面消失

### 3. 可逆性

- ✅ 删除后未保存前可以取消编辑
- ✅ 点击"取消"按钮会丢弃所有修改
- ✅ 只有点击"保存修改"才会永久删除

## 测试建议

### 功能测试

1. **删除单张图片**
   - [ ] 在拖拽编辑器中删除
   - [ ] 在图片操作列表中删除
   - [ ] 确认对话框正确显示
   - [ ] Toast 提示正确显示

2. **删除多张图片**
   - [ ] 连续删除多张图片
   - [ ] 配图数量实时更新
   - [ ] 保存后数据库正确更新

3. **边界情况**
   - [ ] 删除最后一张图片（显示"暂无配图"）
   - [ ] 删除后点击"取消"（不保存更改）
   - [ ] 删除后点击"保存修改"（永久删除）

### 集成测试

1. **框选修复 + 删除旧图**
   - [ ] 使用框选修复功能生成新图
   - [ ] 删除旧的瑕疵图片
   - [ ] 保存后只保留新图

2. **删除 + 拖拽排序**
   - [ ] 删除部分图片
   - [ ] 拖拽剩余图片调整顺序
   - [ ] 保存后顺序和数量正确

3. **删除 + 图片增强**
   - [ ] 增强某张图片
   - [ ] 删除其他图片
   - [ ] 保存后增强的图片保留

## 相关文件

- [src/components/question-review-card.tsx](src/components/question-review-card.tsx) - 题目卡片主组件
- [src/components/image-position-editor.tsx](src/components/image-position-editor.tsx) - 拖拽编辑器
- [src/app/actions/question-upload.ts](src/app/actions/question-upload.ts) - Server Actions

## 后续优化建议

1. **批量删除**
   - 添加全选/反选功能
   - 支持批量删除多张图片

2. **撤销/重做**
   - 实现操作历史栈
   - 支持撤销删除操作

3. **回收站**
   - 软删除机制
   - 在回收站中可以恢复已删除的配图

4. **自定义确认对话框**
   - 使用 shadcn/ui AlertDialog 替代原生 confirm
   - 提供更好的视觉效果和可访问性

## 总结

本次优化成功为题目编辑增加了配图删除功能，用户现在可以：
- ✅ 在两个位置删除配图（拖拽编辑器 / 操作列表）
- ✅ 获得清晰的删除确认和操作反馈
- ✅ 安全地清理框选修复后的旧瑕疵图片

此功能与"框选修复"、"图片增强"、"拖拽排序"共同组成了完整的配图管理工作流，显著提升了题目编辑的效率和用户体验。
