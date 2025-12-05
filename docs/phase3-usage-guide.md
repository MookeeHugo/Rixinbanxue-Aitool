# Phase 3: 高级编辑工具 - 使用指南

## 概述

Phase 3 实现了三个高级编辑工具模块:
1. **LaTeX 可视化编辑器** - 支持公式输入、预览、符号工具栏
2. **图片处理功能** - 降噪、锐化、旋转、透明背景等
3. **图片位置拖拽编辑器** - 拖拽排序图片

---

## 1. LaTeX 可视化编辑器

### 基础使用

```tsx
import { LatexEditor } from '@/components/latex-editor'

function MyComponent() {
  const [latex, setLatex] = useState('')

  return (
    <LatexEditor
      value={latex}
      onChange={setLatex}
      placeholder="输入 LaTeX 公式..."
      showToolbar={true}
      height={120}
    />
  )
}
```

### 组件说明

#### LatexEditor(主编辑器)

**Props:**
- `value: string` - 当前 LaTeX 值
- `onChange: (value: string) => void` - 值变化回调
- `placeholder?: string` - 占位符文本
- `disabled?: boolean` - 是否禁用
- `className?: string` - 自定义类名
- `height?: number | string` - 编辑器高度
- `showToolbar?: boolean` - 是否显示工具栏
- `onInsert?: (latex: string) => void` - 插入公式回调

**特性:**
- 三种模式:可视化编辑(MathLive)、代码模式、预览模式
- 动态加载 MathLive,避免 SSR 问题
- 常用公式快捷按钮
- 支持公式符号工具栏

#### FormulaPreview(公式预览)

```tsx
import { FormulaPreview } from '@/components/latex-editor'

<FormulaPreview
  latex="\\frac{a}{b}"
  displayMode="block"
  bordered={true}
/>
```

**Props:**
- `latex: string` - LaTeX 公式字符串
- `className?: string` - 自定义类名
- `bordered?: boolean` - 是否显示边框
- `displayMode?: 'inline' | 'block'` - 显示模式

#### FormulaToolbar(公式工具栏)

```tsx
import { FormulaToolbar } from '@/components/latex-editor'

<FormulaToolbar
  onInsert={(latex) => console.log('插入:', latex)}
  disabled={false}
/>
```

**包含符号分类:**
- 基础运算:+、-、×、÷、±、=、≠、<、>、≤、≥ 等
- 分数/根式:分数、根号、幂次、下标
- 希腊字母:α、β、γ、δ、π、Σ 等
- 三角函数:sin、cos、tan、arcsin 等
- 微积分:∑、∏、∫、lim、∂、∇、∞
- 集合/逻辑:∈、∉、⊂、⊆、∪、∩、∅、∀、∃
- 矩阵/括号:矩阵、向量、括号、上划线等

---

## 2. 图片处理功

### Server Actions

所有图片处理功能都通过 Server Actions 实现,确保安全性。

#### processImage - 处理图片

```tsx
import { processImage } from '@/app/actions/image-processing'

const result = await processImage(imageBase64, {
  denoise: 50,        // 降噪强度 0-100
  sharpen: 30,        // 锐化强度 0-100
  rotate: 90,         // 旋转角度 0/90/180/270
  brightness: 10,     // 亮度调整 -100 到 100
  contrast: 20,       // 对比度调整 -100 到 100
  grayscale: false,   // 是否灰度化
  flip: 'horizontal', // 翻转: 'horizontal' | 'vertical' | 'both'
  removeBackground: true, // 移除白色背景
  backgroundThreshold: 240, // 背景透明度阈值 0-255
  crop: {             // 裁剪区域
    left: 10,
    top: 10,
    width: 200,
    height: 200
  },
  resize: {           // 调整尺寸
    width: 800,
    height: 600,
    fit: 'cover'     // 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  },
  format: 'png',      // 输出格式: 'jpeg' | 'png' | 'webp'
  quality: 90         // 输出质量 1-100
})

if (result.success) {
  console.log('处理后的图片:', result.data.base64)
  console.log('尺寸:', result.data.width, 'x', result.data.height)
}
```

#### processAndSaveImage - 处理并保存

```tsx
import { processAndSaveImage } from '@/app/actions/image-processing'

const result = await processAndSaveImage(
  imageBase64,
  {
    sharpen: 50,
    format: 'webp',
    quality: 85
  },
  'processed-image.webp'  // 可选文件名
)

if (result.success) {
  console.log('URL:', result.data.url)
  console.log('路径:', result.data.path)
  console.log('尺寸:', result.data.width, 'x', result.data.height)
  console.log('大小:', result.data.size, 'bytes')
}
```

#### batchProcessImages - 批量处理

```tsx
import { batchProcessImages } from '@/app/actions/image-processing'

const result = await batchProcessImages(
  [imageBase64_1, imageBase64_2, imageBase64_3],
  {
    sharpen: 30,
    resize: { width: 800, fit: 'inside' }
  }
)

if (result.success) {
  result.data.forEach((item, index) => {
    if ('error' in item) {
      console.error(`图片 ${index} 处理失败:`, item.error)
    } else {
      console.log(`图片 ${index} 处理成功:`, item.width, 'x', item.height)
    }
  })
}
```

#### getImageInfo - 获取图片信息

```tsx
import { getImageInfo } from '@/app/actions/image-processing'

const result = await getImageInfo(imageUrl)

if (result.success) {
  console.log('宽度:', result.data.width)
  console.log('高度:', result.data.height)
  console.log('格式:', result.data.format)
  console.log('大小:', result.data.size, 'bytes')
  console.log('是否有透明通道:', result.data.hasAlpha)
}
```

### 处理选项详解

| 选项 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `denoise` | number | 降噪强度,使用 median 滤波 (0-100) | - |
| `sharpen` | number | 锐化强度 (0-100) | - |
| `rotate` | 0\|90\|180\|270 | 旋转角度 | - |
| `removeBackground` | boolean | 移除白色/浅色背景使其透明 | false |
| `backgroundThreshold` | number | 背景透明度阈值 (0-255) | 240 |
| `brightness` | number | 亮度调整 (-100 到 100) | - |
| `contrast` | number | 对比度调整 (-100 到 100) | - |
| `grayscale` | boolean | 转换为灰度图 | false |
| `flip` | string | 翻转:'horizontal' \| 'vertical' \| 'both' | - |
| `crop` | object | 裁剪区域 {left, top, width, height} | - |
| `resize` | object | 调整尺寸 {width?, height?, fit?} | - |
| `format` | string | 输出格式:'jpeg' \| 'png' \| 'webp' | 'png' |
| `quality` | number | 输出质量 (1-100) | 90 |

---

## 3. 图片位置拖拽编辑器

### 基础使用

```tsx
import { ImagePositionEditor, useImagePositionEditor } from '@/components/image-position-editor'

function MyComponent() {
  const {
    images,
    addImage,
    removeImage,
    reorderImages
  } = useImagePositionEditor([
    { id: '1', url: '/img1.jpg', title: '图片1', width: 800, height: 600 },
    { id: '2', url: '/img2.jpg', title: '图片2', width: 800, height: 600 }
  ])

  return (
    <ImagePositionEditor
      images={images}
      onChange={reorderImages}
      onDelete={removeImage}
      onImageClick={(img) => console.log('点击:', img)}
      layout="grid"
      columns={4}
      showDelete={true}
      showPreview={true}
      imageSize="md"
    />
  )
}
```

### ImagePositionEditor Props

| 属性 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `images` | ImageItem[] | 图片列表 | - |
| `onChange` | (images) => void | 图片顺序变化回调 | - |
| `onDelete` | (id) => void | 删除图片回调 | - |
| `onImageClick` | (image) => void | 点击图片回调 | - |
| `disabled` | boolean | 是否禁用 | false |
| `className` | string | 自定义类名 | - |
| `layout` | 'grid' \| 'list' | 布局模式 | 'grid' |
| `columns` | number | 网格列数(grid 模式) | 4 |
| `showDelete` | boolean | 显示删除按钮 | true |
| `showPreview` | boolean | 显示预览按钮 | true |
| `imageSize` | 'sm' \| 'md' \| 'lg' | 图片尺寸 | 'md' |
| `emptyText` | string | 空状态提示 | '暂无图片' |

### ImageItem 类型

```ts
interface ImageItem {
  id: string           // 唯一标识
  url: string          // 图片 URL
  title?: string       // 图片描述/标题
  width?: number       // 图片宽度
  height?: number      // 图片高度
  data?: Record<string, unknown>  // 额外数据
}
```

### useImagePositionEditor Hook

```tsx
const {
  images,          // 当前图片列表
  setImages,       // 设置图片列表
  addImage,        // 添加单张图片
  addImages,       // 添加多张图片
  removeImage,     // 删除图片
  updateImage,     // 更新图片信息
  moveImage,       // 移动图片(通过索引)
  clearImages,     // 清空所有图片
  reorderImages    // 重新排序
} = useImagePositionEditor(initialImages)
```

### 完整示例

```tsx
'use client'

import { useState } from 'react'
import { ImagePositionEditor, useImagePositionEditor } from '@/components/image-position-editor'
import { processAndSaveImage } from '@/app/actions/image-processing'

export function QuestionImageEditor() {
  const { images, addImage, removeImage, reorderImages } = useImagePositionEditor()
  const [processing, setProcessing] = useState(false)

  const handleUpload = async (file: File) => {
    setProcessing(true)

    // 读取文件为 base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string

      // 处理图片(锐化、调整尺寸)
      const result = await processAndSaveImage(base64, {
        sharpen: 30,
        resize: { width: 800, fit: 'inside' },
        format: 'webp',
        quality: 85
      })

      if (result.success) {
        // 添加到列表
        addImage({
          id: Date.now().toString(),
          url: result.data.url,
          title: file.name,
          width: result.data.width,
          height: result.data.height
        })
      }

      setProcessing(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
        disabled={processing}
      />

      <ImagePositionEditor
        images={images}
        onChange={reorderImages}
        onDelete={removeImage}
        layout="grid"
        columns={3}
        imageSize="md"
      />
    </div>
  )
}
```

---

## 集成示例:题目编辑器

结合三个工具创建完整的题目编辑器:

```tsx
'use client'

import { useState } from 'react'
import { LatexEditor } from '@/components/latex-editor'
import { ImagePositionEditor, useImagePositionEditor } from '@/components/image-position-editor'
import { processAndSaveImage } from '@/app/actions/image-processing'

export function QuestionEditor() {
  const [content, setContent] = useState('')
  const { images, addImage, removeImage, reorderImages } = useImagePositionEditor()

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string

      // 图片预处理:降噪 + 锐化 + 移除背景
      const result = await processAndSaveImage(base64, {
        denoise: 20,
        sharpen: 40,
        removeBackground: true,
        backgroundThreshold: 245,
        resize: { width: 1200, fit: 'inside' },
        format: 'png',
        quality: 90
      })

      if (result.success) {
        addImage({
          id: Date.now().toString(),
          url: result.data.url,
          title: file.name,
          width: result.data.width,
          height: result.data.height
        })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      {/* LaTeX 编辑器 */}
      <div>
        <h3 className="text-lg font-medium mb-2">题目内容</h3>
        <LatexEditor
          value={content}
          onChange={setContent}
          showToolbar={true}
          height={200}
        />
      </div>

      {/* 图片管理 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium">配图</h3>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              Array.from(e.target.files || []).forEach(handleImageUpload)
            }}
            className="text-sm"
          />
        </div>
        <ImagePositionEditor
          images={images}
          onChange={reorderImages}
          onDelete={removeImage}
          layout="grid"
          columns={3}
        />
      </div>
    </div>
  )
}
```

---

## 技术栈

- **MathLive** (0.103.0) - 可视化 LaTeX 编辑器
- **KaTeX** (0.16.25) - LaTeX 渲染引擎
- **Sharp** (0.34.4) - 高性能图片处理库
- **@dnd-kit** (6.3.1) - 拖拽排序功能
- **react-image-crop** (11.0.7) - 图片裁剪(预留)

---

## 注意事项

1. **MathLive SSR 问题**
   - MathLive 通过动态导入加载,避免 SSR 问题
   - 如果加载失败,会自动降级到代码模式

2. **图片处理性能**
   - 图片处理在服务端执行,确保安全性
   - 批量处理最多支持 10 张图片
   - 大图片建议先压缩再处理

3. **存储配额**
   - 处理后的图片会上传到存储
   - 注意监控存储配额使用情况

4. **浏览器兼容性**
   - 拖拽功能需要现代浏览器支持
   - LaTeX 渲染在所有浏览器中正常工作

---

## 下一步

Phase 3 的高级编辑工具已经完成。可以在题目编辑、审核等功能中集成这些组件,提升编辑体验。

建议后续优化:
1. 添加图片裁剪功能(使用 react-image-crop)
2. 实现公式模板库
3. 支持批量图片处理的进度显示
4. 添加撤销/重做功能
