# 题目卡片快捷图片操作功能实施报告

**日期**: 2025-12-01
**需求**: 在题目卡片展示区域直接提供配图的增强和删除功能
**状态**: ✅ 已完成

## 需求分析

用户希望在题目卡片的配图展示区域直接进行图片操作，而不是进入编辑对话框。这样可以：
- 更快速地删除瑕疵图片
- 立即增强图片质量
- 减少操作步骤，提升效率

## 设计方案

### 交互设计

在题目卡片的配图卡片上，当鼠标悬停时显示操作按钮：
- **✨ 增强按钮**（蓝色图标）- 打开图片增强对话框
- **🗑️ 删除按钮**（红色图标）- 删除当前配图

### 操作模式

**卡片快捷模式**（新增）：
- 操作立即生效，直接保存到数据库
- 操作后自动刷新页面显示最新状态
- 删除前显示确认对话框
- 成功/失败都有 Toast 提示

**编辑对话框模式**（保留）：
- 在"配图管理"标签页中批量编辑
- 操作暂存到编辑状态，点击"保存修改"后生效
- 可以撤销修改

## 实现细节

### 1. QuestionContentRenderer 组件扩展

**文件**: [src/components/question-content-renderer.tsx](src/components/question-content-renderer.tsx)

#### 新增属性

```tsx
interface QuestionContentRendererProps {
  content: string
  imageUrl?: string | null
  questionImageUrl?: string | null
  imageAssets?: QuestionImageAsset[] | null
  className?: string
  onDeleteImage?: (imageId: string) => void      // 新增：删除回调
  onEnhanceImage?: (imageId: string) => void     // 新增：增强回调
  showImageActions?: boolean                      // 新增：是否显示操作按钮
}
```

#### 配图卡片增强

添加悬停时显示的操作按钮：

```tsx
<div className="relative h-40 rounded-lg bg-background flex items-center justify-center overflow-hidden group">
  <img src={asset.proxyUrl} alt={asset.label} loading="lazy" />

  {showImageActions && !hasError && (
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {onEnhanceImage && (
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onEnhanceImage(asset.id)
          }}
          title="增强图片"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
        </Button>
      )}
      {onDeleteImage && (
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteImage(asset.id)
          }}
          title="删除图片"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-600" />
        </Button>
      )}
    </div>
  )}
</div>
```

**关键特性**:
- ✅ 使用 `group` 和 `group-hover` 实现悬停显示
- ✅ 按钮半透明白色背景，清晰可见
- ✅ 图标分别用蓝色（增强）和红色（删除）区分
- ✅ `e.stopPropagation()` 防止事件冒泡
- ✅ `opacity-0 group-hover:opacity-100 transition-opacity` 平滑过渡

### 2. QuestionReviewCard 组件扩展

**文件**: [src/components/question-review-card.tsx](src/components/question-review-card.tsx)

#### 卡片快捷删除处理函数

```tsx
const handleQuickDeleteImage = useCallback(async (imageId: string) => {
  const asset = question.image_assets?.find((a) => a.id === imageId)
  const assetName = asset?.placeholder || '此配图'

  if (!window.confirm(`确定要删除"${assetName}"吗？\n\n此操作将立即生效。`)) {
    return
  }

  try {
    const updatedAssets = (question.image_assets || []).filter((a) => a.id !== imageId)
    const result = await updateQuestion(question.id, { imageAssets: updatedAssets })

    if (!result.success) {
      throw new Error(result.error || '删除失败')
    }

    toast({
      title: '删除成功',
      description: '配图已从题目中移除'
    })
    router.refresh()
  } catch (error) {
    toast({
      title: '删除失败',
      description: error instanceof Error ? error.message : '请稍后重试',
      variant: 'destructive'
    })
  }
}, [question.id, question.image_assets, toast, router])
```

**特点**:
- ✅ 删除前确认对话框
- ✅ 立即调用 `updateQuestion` 保存到数据库
- ✅ 成功后刷新页面 `router.refresh()`
- ✅ 完整的错误处理和 Toast 提示

#### 卡片快捷增强处理函数

```tsx
const handleQuickEnhanceImage = useCallback((imageId: string) => {
  const asset = question.image_assets?.find((a) => a.id === imageId)
  if (asset) {
    setSelectedImageForEnhancement(asset)
    setEnhanceDialogOpen(true)
  }
}, [question.image_assets])
```

**特点**:
- ✅ 查找对应的配图资源
- ✅ 设置为增强目标
- ✅ 打开增强对话框

#### 增强成功回调优化

```tsx
const handleEnhanceSuccess = useCallback(async (newImageUrl: string) => {
  if (!selectedImageForEnhancement) return

  // 如果在编辑模式，更新编辑数据
  if (isEditing) {
    setEditedData((prev) => ({
      ...prev,
      imageAssets: prev.imageAssets.map((asset) =>
        asset.id === selectedImageForEnhancement.id
          ? { ...asset, url: newImageUrl, source: 'manual' as const }
          : asset
      )
    }))

    toast({
      title: '图片已增强',
      description: '配图已更新，记得保存修改'
    })
  } else {
    // 卡片快捷模式，直接保存到数据库
    try {
      const updatedAssets = (question.image_assets || []).map((asset) =>
        asset.id === selectedImageForEnhancement.id
          ? { ...asset, url: newImageUrl, source: 'manual' as const }
          : asset
      )

      const result = await updateQuestion(question.id, { imageAssets: updatedAssets })

      if (!result.success) {
        throw new Error(result.error || '保存失败')
      }

      toast({
        title: '图片已增强',
        description: '配图已更新为增强后的版本'
      })
      router.refresh()
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    }
  }
}, [selectedImageForEnhancement, isEditing, question.id, question.image_assets, toast, router])
```

**智能模式切换**:
- ✅ 检测 `isEditing` 状态判断当前模式
- ✅ **编辑模式**：更新临时状态，提示保存
- ✅ **卡片模式**：立即保存到数据库，刷新页面

#### 连接到 QuestionContentRenderer

```tsx
<QuestionContentRenderer
  content={question.content}
  imageUrl={imageUrl}
  questionImageUrl={question.question_image_url}
  imageAssets={question.image_assets}
  showImageActions={true}              // 启用快捷操作
  onDeleteImage={handleQuickDeleteImage}  // 删除回调
  onEnhanceImage={handleQuickEnhanceImage} // 增强回调
/>
```

## 用户操作流程

### 删除配图

1. 在题目卡片上找到要删除的配图
2. 鼠标悬停到配图上
3. 点击右上角的红色垃圾桶图标
4. 在确认对话框中点击"确定"
5. 查看 Toast 提示："删除成功"
6. 配图立即从题目中消失

### 增强配图

1. 在题目卡片上找到要增强的配图
2. 鼠标悬停到配图上
3. 点击右上角的蓝色星星图标
4. 在增强对话框中调整参数（锐化、降噪）
5. 点击"确认增强"
6. 查看 Toast 提示："图片已增强"
7. 页面自动刷新，显示增强后的配图

## 技术亮点

### 1. 悬停显示交互

使用 Tailwind CSS 的 `group` 和 `group-hover` 实现优雅的悬停效果：
- 配图容器设置 `group` 类
- 操作按钮设置 `opacity-0 group-hover:opacity-100`
- 添加 `transition-opacity` 平滑过渡

### 2. 智能模式检测

通过 `isEditing` 状态自动判断：
- 在编辑对话框中：操作暂存，需要保存
- 在卡片展示中：操作立即生效

### 3. 事件阻止冒泡

```tsx
onClick={(e) => {
  e.stopPropagation()
  onDeleteImage(asset.id)
}}
```

防止点击按钮时触发配图的其他事件。

### 4. 完整的错误处理

- 操作前确认
- Try-catch 捕获异常
- Toast 提示成功/失败
- 失败时不刷新页面

## 对比：两种操作模式

| 特性 | 卡片快捷模式 | 编辑对话框模式 |
|------|-------------|---------------|
| 入口位置 | 配图悬停 | "编辑"按钮 → "配图管理"标签 |
| 操作方式 | 单张图片逐个操作 | 批量编辑多张图片 |
| 生效时机 | 立即生效 | 点击"保存修改"后生效 |
| 可撤销性 | 需要数据库回滚 | 点击"取消"即可撤销 |
| 适用场景 | 快速删除瑕疵图 | 批量整理配图 |
| 额外功能 | - | 拖拽排序 |

## 用户体验优化

### 1. 视觉反馈

- ✅ 悬停时按钮平滑淡入
- ✅ 半透明白色背景，适应各种图片
- ✅ 图标颜色明确：蓝色=增强，红色=删除
- ✅ Toast 提示操作结果

### 2. 操作安全

- ✅ 删除前必须确认
- ✅ 确认对话框显示配图名称
- ✅ 明确说明"此操作将立即生效"

### 3. 性能优化

- ✅ 使用 `useCallback` 防止重复渲染
- ✅ 事件阻止冒泡
- ✅ 只在需要时显示按钮（`showImageActions`）

## 测试建议

### 功能测试

1. **删除操作**
   - [ ] 悬停显示删除按钮
   - [ ] 点击后显示确认对话框
   - [ ] 确认后立即删除配图
   - [ ] Toast 提示删除成功
   - [ ] 页面自动刷新

2. **增强操作**
   - [ ] 悬停显示增强按钮
   - [ ] 点击后打开增强对话框
   - [ ] 调整参数并确认
   - [ ] Toast 提示增强成功
   - [ ] 页面自动刷新，显示增强后的图片

3. **错误处理**
   - [ ] 删除失败时显示错误提示
   - [ ] 增强失败时显示错误提示
   - [ ] 网络错误时优雅降级

### 集成测试

1. **框选修复 + 快捷删除**
   - [ ] 使用框选修复生成新图
   - [ ] 悬停旧图并删除
   - [ ] 验证只保留新图

2. **快捷增强 + 删除**
   - [ ] 增强某张图片
   - [ ] 删除其他图片
   - [ ] 验证增强的图片保留

3. **编辑模式 vs 卡片模式**
   - [ ] 在卡片上增强图片（立即生效）
   - [ ] 进入编辑对话框增强图片（需保存）
   - [ ] 验证两种模式独立工作

## 相关文件

- [src/components/question-content-renderer.tsx](src/components/question-content-renderer.tsx) - 配图渲染组件
- [src/components/question-review-card.tsx](src/components/question-review-card.tsx) - 题目卡片组件
- [src/components/image-enhancement-dialog.tsx](src/components/image-enhancement-dialog.tsx) - 图片增强对话框
- [src/app/actions/question-upload.ts](src/app/actions/question-upload.ts) - Server Actions

## 后续优化建议

1. **批量选择模式**
   - 添加多选复选框
   - 支持批量删除/增强

2. **撤销功能**
   - 删除后保留在回收站
   - 支持撤销删除操作

3. **键盘快捷键**
   - Del 键删除
   - Ctrl+E 增强

4. **拖拽排序**
   - 在卡片展示中直接拖拽调整顺序
   - 实时保存

## 总结

本次优化成功实现了题目卡片配图的快捷操作功能：

✅ **在配图上直接操作**：无需进入编辑对话框
✅ **即时生效**：操作立即保存到数据库
✅ **优雅交互**：悬停显示，平滑过渡
✅ **智能模式**：自动区分卡片模式和编辑模式
✅ **安全可靠**：确认对话框，错误处理，Toast 反馈

配合之前的"框选修复"和"编辑对话框配图管理"，用户现在拥有三种配图管理方式：
1. **卡片快捷操作** - 单张图片快速处理
2. **编辑对话框** - 批量整理和排序
3. **框选修复** - 人工重新裁剪

三种方式各有优势，覆盖不同使用场景，极大提升了题目编辑效率！
