# 画布模式图像组件设计提案

> 更新日期：2025-12-04  
> 负责人：前端组 / 视觉增强域

## 1. 背景

- `MarkdownRenderer` 与 `ManualImageCropper` 仍然直接使用原生 `<img>`，以满足 **任意 URL 直出** 与 **像素级指针坐标** 的需求。
- Phase C 目标之一是收敛 `<img>` 使用场景，统一懒加载与错误兜底策略，降低 eslint overrides 覆盖范围。
- 视觉增强域在题库导出、图像增强和裁剪链路中需要“画布模式”——即：组件可以在一个固定区域内渲染原图、捕获精确坐标，并支持覆盖层（选框/标注）。

## 2. 组件定位

| 能力 | 说明 | 适配对象 |
| --- | --- | --- |
| 任意 URL 展示 | 允许远程 URL、base64、Supabase 有签名路径。 | MarkdownRenderer |
| 精确像素坐标 | 暴露 `onPointerMove / toCanvasCoords`，不经过 `next/image` 裁剪。 | ManualImageCropper |
| 覆盖层渲染 | 支持 `renderOverlay={(ctx) => ...}`，用来绘制框选、高亮。 | AI 标注、裁剪工具 |
| 懒加载 & 兜底 | 默认 lazy，失败后回退到提示 + “重新尝试”按钮。 | 所有预览场景 |

## 3. API 草案

```tsx
<CanvasImage
  src={imageUrl}
  alt="题目原图"
  fit="contain" // contain | cover | stretch
  overlay={selectionLayer}
  onPointerDown={handlePointerDown}
  onPointerMove={(event, canvasCoords) => ...}
  onPointerUp={handlePointerUp}
  onError={handleError}
/>
```

辅助类型：

- `CanvasImageHandle.getCanvasMetrics(): { naturalWidth, naturalHeight, zoom, offset }`
- `overlay` 接受 `React.ReactNode | ((metrics) => ReactNode)`，方便渲染区域高亮、框选结果。

## 4. `<img>` 保留判定

| 场景 | 判定结果 | 原因 |
| --- | --- | --- |
| MarkdownRenderer 行内图片 | ✅ 保留，直出 HTML 需要保持 Markdown AST 结构。未来改用 `<CanvasImage> as="img">` 适配。 |
| ManualImageCropper 原图 | ✅ 保留，当前版本直接读取 `<img>` 的 naturalWidth/naturalHeight。计划将 `<CanvasImage>` 暴露 `ref` 供裁剪工具获取像素信息后替换。 |
| 其他组件（question-card, question-content-renderer 等） | ❌ 已迁移到 `next/image`。 |

## 5. 交付计划

1. **P0**：完成 `<CanvasImage>` 组件实现（基于 `<canvas>` + `ImageBitmap`），并为 Markdown/裁剪两处提供 `ref` 级别替换方案。
2. **P1**：在 MarkdownRenderer 中增加 `renderers.img = CanvasImage`，保留 fallback 以兼容 `<img>`。
3. **P2**：ManualImageCropper 改造为基于 `<CanvasImage>` 的覆盖层，实现框选时不依赖 DOM 尺寸。
4. **P3**：把组件加入 ESLint override 白名单，最终移除 `@next/next/no-img-element` 局部禁用。

## 6. 校验与风险

- **性能**：大分辨率在 Canvas 中渲染需谨慎，可默认限制最大长边（例如 2400px），超出时降采样。
- **辅助功能**：需在 `<canvas>` 外提供隐藏的 `<img alt>` 文本，确保屏幕阅读器可读取。
- **SSR**：组件仅在客户端渲染（`"use client"`），并在加载状态下展示 Skeleton/Spinner。

---  
如需补充 API 或视觉规格，请在评审会之前于本文件追加评论。***
