'use client'

import { useCallback, useState, useId } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  GripVertical,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Image as ImageIcon,
  Plus
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

// ============================================================================
// 类型定义
// ============================================================================

export interface ImageItem {
  /** 唯一标识 */
  id: string
  /** 图片 URL */
  url: string
  /** 图片描述/标题 */
  title?: string
  /** 图片宽度 */
  width?: number
  /** 图片高度 */
  height?: number
  /** 额外数据 */
  data?: Record<string, unknown>
}

export interface ImagePositionEditorProps {
  /** 图片列表 */
  images: ImageItem[]
  /** 图片顺序变化回调 */
  onChange: (images: ImageItem[]) => void
  /** 删除图片回调 */
  onDelete?: (id: string) => void
  /** 点击图片回调 */
  onImageClick?: (image: ImageItem) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 布局模式 */
  layout?: 'grid' | 'list'
  /** 网格列数（grid 模式下） */
  columns?: number
  /** 是否显示删除按钮 */
  showDelete?: boolean
  /** 是否显示预览按钮 */
  showPreview?: boolean
  /** 图片尺寸 */
  imageSize?: 'sm' | 'md' | 'lg'
  /** 空状态提示 */
  emptyText?: string
  /** 测试 ID */
  'data-testid'?: string
}

// ============================================================================
// 可拖拽图片项组件
// ============================================================================

interface SortableImageItemProps {
  image: ImageItem
  disabled?: boolean
  showDelete?: boolean
  showPreview?: boolean
  imageSize?: 'sm' | 'md' | 'lg'
  onDelete?: (id: string) => void
  onPreview?: (image: ImageItem) => void
  onClick?: (image: ImageItem) => void
  layout: 'grid' | 'list'
}

function SortableImageItem({
  image,
  disabled,
  showDelete,
  showPreview,
  imageSize = 'md',
  onDelete,
  onPreview,
  onClick,
  layout
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: image.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const sizeClasses = {
    sm: layout === 'grid' ? 'w-20 h-20' : 'w-16 h-16',
    md: layout === 'grid' ? 'w-32 h-32' : 'w-24 h-24',
    lg: layout === 'grid' ? 'w-48 h-48' : 'w-32 h-32'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border bg-card overflow-hidden',
        layout === 'list' ? 'flex items-center gap-3 p-2' : 'p-1',
        isDragging && 'ring-2 ring-primary shadow-lg',
        disabled && 'opacity-60 cursor-not-allowed',
        !disabled && 'hover:ring-1 hover:ring-primary/50'
      )}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'flex items-center justify-center cursor-grab active:cursor-grabbing',
          layout === 'list' ? 'p-1' : 'absolute top-1 left-1 p-1 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          disabled && 'cursor-not-allowed'
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* 图片 */}
      <div
        className={cn(
          'relative overflow-hidden rounded bg-muted flex items-center justify-center',
          sizeClasses[imageSize],
          layout === 'list' && 'flex-shrink-0'
        )}
        onClick={() => onClick?.(image)}
      >
        {image.url ? (
          <Image
            src={image.url}
            alt={image.title || '图片'}
            fill
            sizes="(max-width: 768px) 33vw, 120px"
            className="object-cover cursor-pointer"
            draggable={false}
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* 信息和操作 */}
      {layout === 'list' && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {image.title || `图片 ${image.id}`}
          </p>
          {image.width && image.height && (
            <p className="text-xs text-muted-foreground">
              {image.width} x {image.height}
            </p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div
        className={cn(
          'flex gap-1',
          layout === 'grid'
            ? 'absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity'
            : ''
        )}
      >
        {showPreview && (
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onPreview?.(image)
            }}
            disabled={disabled}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        )}
        {showDelete && (
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(image.id)
            }}
            disabled={disabled}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 拖拽覆盖层组件
// ============================================================================

function DragOverlayItem({ image, imageSize = 'md' }: { image: ImageItem; imageSize?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  }

  return (
    <div className="rounded-lg border-2 border-primary bg-card shadow-2xl overflow-hidden">
      <div className={cn('relative', sizeClasses[imageSize])}>
        {image.url ? (
          <Image
            src={image.url}
            alt={image.title || '图片'}
            fill
            sizes="(max-width: 768px) 33vw, 192px"
            className="object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function ImagePositionEditor({
  images,
  onChange,
  onDelete,
  onImageClick,
  disabled = false,
  className,
  layout = 'grid',
  columns = 4,
  showDelete = true,
  showPreview = true,
  imageSize = 'md',
  emptyText = '暂无图片',
  'data-testid': testId
}: ImagePositionEditorProps) {
  const dndContextId = useId()
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id)
      const newIndex = images.findIndex((img) => img.id === over.id)

      const newImages = arrayMove(images, oldIndex, newIndex)
      onChange(newImages)
    }

    setActiveId(null)
  }, [images, onChange])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const handleDelete = useCallback((id: string) => {
    if (onDelete) {
      onDelete(id)
    } else {
      const newImages = images.filter((img) => img.id !== id)
      onChange(newImages)
    }
  }, [images, onChange, onDelete])

  const handlePreview = useCallback((image: ImageItem) => {
    setPreviewImage(image)
  }, [])

  const activeImage = activeId ? images.find((img) => img.id === activeId) : null

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground',
          className
        )}
      >
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <>
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={images.map((img) => img.id)}
          strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
        >
          <div
            data-testid={testId}
            className={cn(
              layout === 'grid'
                ? `grid gap-2`
                : 'flex flex-col gap-2',
              className
            )}
            style={
              layout === 'grid'
                ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {images.map((image) => (
              <SortableImageItem
                key={image.id}
                image={image}
                disabled={disabled}
                showDelete={showDelete}
                showPreview={showPreview}
                imageSize={imageSize}
                onDelete={handleDelete}
                onPreview={handlePreview}
                onClick={onImageClick}
                layout={layout}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeImage && (
            <DragOverlayItem image={activeImage} imageSize={imageSize} />
          )}
        </DragOverlay>
      </DndContext>

      {/* 预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.title || '图片预览'}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <div
                className="relative w-full max-w-full"
                style={{ height: Math.min(previewImage.height ?? 480, 600) }}
              >
                <Image
                  src={previewImage.url}
                  alt={previewImage.title || '图片'}
                  fill
                  sizes="(max-width: 1024px) 90vw, 800px"
                  className="object-contain"
                  draggable={false}
                />
              </div>
            </div>
          )}
          {previewImage?.width && previewImage?.height && (
            <p className="text-sm text-center text-muted-foreground">
              尺寸：{previewImage.width} x {previewImage.height}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// 导出辅助 Hook
// ============================================================================

/**
 * 管理图片列表的 Hook
 */
export function useImagePositionEditor(initialImages: ImageItem[] = []) {
  const [images, setImages] = useState<ImageItem[]>(initialImages)

  const addImage = useCallback((image: ImageItem) => {
    setImages((prev) => [...prev, image])
  }, [])

  const addImages = useCallback((newImages: ImageItem[]) => {
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const updateImage = useCallback((id: string, updates: Partial<ImageItem>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    )
  }, [])

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    setImages((prev) => arrayMove(prev, fromIndex, toIndex))
  }, [])

  const clearImages = useCallback(() => {
    setImages([])
  }, [])

  const reorderImages = useCallback((newImages: ImageItem[]) => {
    setImages(newImages)
  }, [])

  return {
    images,
    setImages,
    addImage,
    addImages,
    removeImage,
    updateImage,
    moveImage,
    clearImages,
    reorderImages
  }
}
