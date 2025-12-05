"use client"

import type { PointerEvent } from 'react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

type ImageFit = 'contain' | 'cover' | 'stretch'

export interface CanvasImageMetrics {
  naturalWidth: number
  naturalHeight: number
  renderedWidth: number
  renderedHeight: number
  offsetX: number
  offsetY: number
}

export interface CanvasPointerInfo {
  relativeX: number
  relativeY: number
  pixelX: number
  pixelY: number
}

export interface CanvasImageHandle {
  getMetrics: () => CanvasImageMetrics | null
}

interface CanvasImageProps {
  src: string
  alt?: string
  fit?: ImageFit
  className?: string
  overlay?: React.ReactNode | ((metrics: CanvasImageMetrics | null) => React.ReactNode)
  onPointerDown?: (event: PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo, metrics: CanvasImageMetrics | null) => void
  onPointerMove?: (event: PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo, metrics: CanvasImageMetrics | null) => void
  onPointerUp?: (event: PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo, metrics: CanvasImageMetrics | null) => void
  onPointerLeave?: (event: PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo, metrics: CanvasImageMetrics | null) => void
  loadingFallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export const CanvasImage = forwardRef<CanvasImageHandle, CanvasImageProps>(function CanvasImage(
  {
    src,
    alt = '',
    fit = 'contain',
    className,
    overlay,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    loadingFallback,
    errorFallback,
  },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<CanvasImageMetrics | null>(null)

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    const img = imageRef.current
    if (!canvas || !wrapper || !img) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const availableWidth = wrapper.clientWidth || img.naturalWidth || 1
    const aspectRatio = (img.naturalWidth || 1) / (img.naturalHeight || 1)
    const baseHeight = availableWidth / aspectRatio
    const wrapperHeight = wrapper.clientHeight || baseHeight

    canvas.width = availableWidth
    canvas.height = wrapperHeight

    let drawWidth = availableWidth
    let drawHeight = baseHeight
    let drawX = 0
    let drawY = (wrapperHeight - drawHeight) / 2

    if (fit === 'cover') {
      const scale = Math.max(wrapperHeight / baseHeight, 1)
      drawWidth = availableWidth * scale
      drawHeight = wrapperHeight
      drawX = (availableWidth - drawWidth) / 2
      drawY = 0
    } else if (fit === 'stretch') {
      drawWidth = availableWidth
      drawHeight = wrapperHeight
      drawX = 0
      drawY = 0
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

    setMetrics({
      naturalWidth: img.naturalWidth || img.width,
      naturalHeight: img.naturalHeight || img.height,
      renderedWidth: drawWidth,
      renderedHeight: drawHeight,
      offsetX: drawX,
      offsetY: drawY,
    })
  }, [fit])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)

    const image = new Image()
    image.decoding = 'async'
    image.referrerPolicy = 'no-referrer'
    image.src = src
    image.onload = () => {
      if (cancelled) return
      imageRef.current = image
      setStatus('ready')
      drawImage()
    }
    image.onerror = () => {
      if (cancelled) return
      setError('图像加载失败')
      setStatus('error')
    }

    return () => {
      cancelled = true
    }
  }, [src, drawImage])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(() => {
      if (status === 'ready') {
        drawImage()
      }
    })
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current)
    }
    return () => observer.disconnect()
  }, [drawImage, status])

  useImperativeHandle(
    ref,
    () => ({
      getMetrics: () => metrics,
    }),
    [metrics],
  )

  const buildPointerInfo = (event: PointerEvent<HTMLCanvasElement>): CanvasPointerInfo => {
    if (!metrics || !canvasRef.current) {
      return {
        relativeX: 0,
        relativeY: 0,
        pixelX: 0,
        pixelY: 0,
      }
    }
    const rect = canvasRef.current.getBoundingClientRect()
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
    const relX = clamp((rawX - metrics.offsetX) / metrics.renderedWidth, 0, 1)
    const relY = clamp((rawY - metrics.offsetY) / metrics.renderedHeight, 0, 1)

    return {
      relativeX: relX,
      relativeY: relY,
      pixelX: relX * metrics.naturalWidth,
      pixelY: relY * metrics.naturalHeight,
    }
  }

  const handlePointer =
    (
      cb?: (event: PointerEvent<HTMLCanvasElement>, info: CanvasPointerInfo, metrics: CanvasImageMetrics | null) => void,
    ) =>
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!cb) return
      cb(event, buildPointerInfo(event), metrics)
    }

  const renderOverlay = () => {
    if (!overlay) return null
    if (typeof overlay === 'function') {
      return overlay(metrics)
    }
    return overlay
  }

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full overflow-hidden rounded-md bg-muted', className)}
      role="img"
      aria-label={alt}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {loadingFallback ?? '加载中…'}
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-sm text-destructive">
          {errorFallback ?? (
            <>
              <p className="font-medium mb-1">图像加载失败</p>
              <p className="text-muted-foreground">{error}</p>
            </>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn('block w-full h-auto', status !== 'ready' && 'opacity-0')}
        onPointerDown={handlePointer(onPointerDown)}
        onPointerMove={handlePointer(onPointerMove)}
        onPointerUp={handlePointer(onPointerUp)}
        onPointerLeave={handlePointer(onPointerLeave)}
      />
      {status === 'ready' && (
        <div className="pointer-events-none absolute inset-0">{renderOverlay()}</div>
      )}
      <span className="sr-only">{alt}</span>
    </div>
  )
})
