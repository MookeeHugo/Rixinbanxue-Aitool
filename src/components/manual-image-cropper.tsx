'use client'

import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'

type Box2D = [number, number, number, number]

interface ManualImageCropperProps {
  imageUrl: string
  onSelectionChange?: (box: Box2D | null) => void
}

interface DraftRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function ManualImageCropper({ imageUrl, onSelectionChange }: ManualImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedBox, setSelectedBox] = useState<Box2D | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    onSelectionChange?.(selectedBox)
  }, [selectedBox, onSelectionChange])

  const getRelativePoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height)
    }
  }

  const toBox2D = (rect: { left: number; top: number; width: number; height: number }): Box2D | null => {
    const width = imageRef.current?.clientWidth || rect.width
    const height = imageRef.current?.clientHeight || rect.height
    if (width <= 0 || height <= 0 || rect.width <= 0 || rect.height <= 0) {
      return null
    }
    const ymin = Math.round((rect.top / height) * 1000)
    const xmin = Math.round((rect.left / width) * 1000)
    const ymax = Math.round(((rect.top + rect.height) / height) * 1000)
    const xmax = Math.round(((rect.left + rect.width) / width) * 1000)
    return [
      clamp(ymin, 0, 1000),
      clamp(xmin, 0, 1000),
      clamp(ymax, 0, 1000),
      clamp(xmax, 0, 1000)
    ]
  }

  const renderRect = draftRect
    ? {
        left: Math.min(draftRect.startX, draftRect.endX),
        top: Math.min(draftRect.startY, draftRect.endY),
        width: Math.abs(draftRect.endX - draftRect.startX),
        height: Math.abs(draftRect.endY - draftRect.startY)
      }
    : null

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const { x, y } = getRelativePoint(event)
    setDraftRect({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    })
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !draftRect) return
    event.preventDefault()
    const { x, y } = getRelativePoint(event)
    setDraftRect(prev =>
      prev
        ? {
            ...prev,
            endX: x,
            endY: y
          }
        : prev
    )
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !renderRect) return
    event.preventDefault()
    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)
    const box = toBox2D(renderRect)
    if (box) {
      setSelectedBox(box)
    }
  }

  const handleClear = () => {
    setDraftRect(null)
    setSelectedBox(null)
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full max-h-[70vh] overflow-auto rounded-lg border bg-muted/50"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setIsDragging(false)}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        )}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 z-10 p-4">
            <svg className="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 font-semibold mb-2">图片加载失败</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md break-all text-center">
              {imageUrl}
            </p>
          </div>
        )}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="原图"
          className="w-full h-auto select-none"
          draggable={false}
          onLoad={() => {
            setImageLoaded(true)
            setImageError(false)
          }}
          onError={() => {
            setImageError(true)
            setImageLoaded(false)
            console.error('[ManualImageCropper] 图片加载失败:', imageUrl)
          }}
        />
        {renderRect && imageLoaded && (
          <div
            className="absolute border-2 border-primary-500 bg-primary-500/20 pointer-events-none"
            style={{
              left: renderRect.left,
              top: renderRect.top,
              width: renderRect.width,
              height: renderRect.height
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline" className="border-primary-400 text-primary-700 bg-primary-50">
          {selectedBox
            ? `ymin=${selectedBox[0]} xmin=${selectedBox[1]} ymax=${selectedBox[2]} xmax=${selectedBox[3]}`
            : '请在原图上拖拽以选择区域'}
        </Badge>
        <button
          type="button"
          className="text-xs text-primary-600 hover:text-primary-700 underline"
          onClick={handleClear}
        >
          清除选区
        </button>
        <span>提示：按住鼠标左键（或触摸）拖拽，即可框选正确的图像区域。</span>
      </div>
    </div>
  )
}
