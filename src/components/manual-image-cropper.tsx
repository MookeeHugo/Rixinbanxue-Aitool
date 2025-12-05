"use client"

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CanvasImage, type CanvasPointerInfo, type CanvasImageMetrics } from '@/components/canvas-image'

type Box2D = [number, number, number, number]

interface ManualImageCropperProps {
  imageUrl: string
  onSelectionChange?: (box: Box2D | null) => void
}

interface NormalizedRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const toBox2D = (rect: NormalizedRect): Box2D => {
  const yMin = Math.round(clamp(Math.min(rect.startY, rect.endY), 0, 1) * 1000)
  const xMin = Math.round(clamp(Math.min(rect.startX, rect.endX), 0, 1) * 1000)
  const yMax = Math.round(clamp(Math.max(rect.startY, rect.endY), 0, 1) * 1000)
  const xMax = Math.round(clamp(Math.max(rect.startX, rect.endX), 0, 1) * 1000)
  return [yMin, xMin, yMax, xMax]
}

export function ManualImageCropper({ imageUrl, onSelectionChange }: ManualImageCropperProps) {
  const [draftRect, setDraftRect] = useState<NormalizedRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedBox, setSelectedBox] = useState<Box2D | null>(null)

  useEffect(() => {
    onSelectionChange?.(selectedBox)
  }, [selectedBox, onSelectionChange])

  const overlay = useMemo(() => {
    const rect = draftRect
    if (!rect && !selectedBox) return null
    const normalized = rect
      ? {
          left: Math.min(rect.startX, rect.endX),
          top: Math.min(rect.startY, rect.endY),
          width: Math.abs(rect.endX - rect.startX),
          height: Math.abs(rect.endY - rect.startY),
        }
      : selectedBox
      ? {
          left: selectedBox[1] / 1000,
          top: selectedBox[0] / 1000,
          width: (selectedBox[3] - selectedBox[1]) / 1000,
          height: (selectedBox[2] - selectedBox[0]) / 1000,
        }
      : null
    if (!normalized) return null
    const OverlayRenderer = (metrics: CanvasImageMetrics | null) => {
      if (!metrics) return null
      const left = metrics.offsetX + normalized.left * metrics.renderedWidth
      const top = metrics.offsetY + normalized.top * metrics.renderedHeight
      const width = normalized.width * metrics.renderedWidth
      const height = normalized.height * metrics.renderedHeight
      return (
        <div
          className="absolute border-2 border-primary bg-primary/10"
          style={{
            left,
            top,
            width,
            height,
          }}
        />
      )
    }
    OverlayRenderer.displayName = 'ManualImageCropperOverlay'
    return OverlayRenderer
  }, [draftRect, selectedBox])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraftRect({
      startX: info.relativeX,
      startY: info.relativeY,
      endX: info.relativeX,
      endY: info.relativeY,
    })
    setIsDragging(true)
  }

  const handlePointerMove = (_event: React.PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo) => {
    if (!isDragging || !draftRect) return
    setDraftRect((prev) =>
      prev
        ? {
            ...prev,
            endX: info.relativeX,
            endY: info.relativeY,
          }
        : prev,
    )
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (!draftRect) return
    setIsDragging(false)
    const box = toBox2D(draftRect)
    if (box[0] === box[2] || box[1] === box[3]) {
      setSelectedBox(null)
    } else {
      setSelectedBox(box)
    }
    setDraftRect(null)
  }

  const handleClear = () => {
    setSelectedBox(null)
    setDraftRect(null)
  }

  return (
    <div className="space-y-4">
      <CanvasImage
        src={imageUrl}
        alt="原始题图"
        overlay={overlay}
        className="relative max-h-[70vh]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setIsDragging(false)}
        loadingFallback="图像加载中…"
        errorFallback={
          <div className="flex flex-col items-center gap-2 text-sm">
            <p className="text-destructive font-medium">图像加载失败</p>
            <p className="text-muted-foreground break-all">{imageUrl}</p>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline" className="border-primary-400 text-primary-700 bg-primary-50">
          {selectedBox
            ? `ymin=${selectedBox[0]} xmin=${selectedBox[1]} ymax=${selectedBox[2]} xmax=${selectedBox[3]}`
            : '请在图片上拖拽选择区域'}
        </Badge>
        <button
          type="button"
          className="text-xs text-primary-600 hover:text-primary-700 underline"
          onClick={handleClear}
        >
          清除选区
        </button>
        <span>提示：拖拽鼠标即可框选，松开后会保存为锚点。</span>
      </div>
    </div>
  )
}
