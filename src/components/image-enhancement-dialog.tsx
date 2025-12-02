'use client'

import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { processAndSaveImage } from '@/app/actions/image-processing'
import { Sparkles, RotateCw } from 'lucide-react'

interface ImageEnhancementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  onSuccess?: (newImageUrl: string) => void
}

export function ImageEnhancementDialog({
  open,
  onOpenChange,
  imageUrl,
  onSuccess
}: ImageEnhancementDialogProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [sharpen, setSharpen] = useState(30)
  const [denoise, setDenoise] = useState(20)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 重置参数
  const handleReset = useCallback(() => {
    setSharpen(30)
    setDenoise(20)
    setPreviewUrl(null)
  }, [])

  // 关闭时重置
  useEffect(() => {
    if (!open) {
      handleReset()
    }
  }, [open, handleReset])

  // 自动增强（使用预设参数）
  const handleAutoEnhance = useCallback(() => {
    setSharpen(30)
    setDenoise(20)
  }, [])

  // 处理图片
  const handleProcess = useCallback(async () => {
    setIsProcessing(true)
    try {
      // 从代理URL中提取原始URL
      const urlMatch = imageUrl.match(/url=(.+)$/)
      const rawImageUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : imageUrl

      // 下载图片并转换为 Base64
      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(rawImageUrl)}`)
      if (!response.ok) {
        throw new Error('无法加载图片')
      }
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })

      // 调用图片处理 Server Action
      const result = await processAndSaveImage(base64, {
        sharpen,
        denoise,
        format: 'png',
        quality: 90
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '处理失败')
      }

      toast({
        title: '处理成功',
        description: '图片已增强并保存'
      })

      // 通知父组件
      if (onSuccess && result.data.url) {
        onSuccess(result.data.url)
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        title: '处理失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [imageUrl, sharpen, denoise, toast, onSuccess, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>图片增强</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 原图预览 */}
          <div className="space-y-2">
            <Label>原图</Label>
            <div className="rounded-lg border bg-muted p-4 flex items-center justify-center">
              <img
                src={imageUrl}
                alt="原图"
                className="max-w-full max-h-[300px] object-contain"
              />
            </div>
          </div>

          {/* 参数调整 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">增强参数</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoEnhance}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                自动增强
              </Button>
            </div>

            {/* 锐化强度 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sharpen">锐化强度</Label>
                <span className="text-sm text-muted-foreground">{sharpen}</span>
              </div>
              <Slider
                id="sharpen"
                min={0}
                max={100}
                step={5}
                value={[sharpen]}
                onValueChange={(value) => setSharpen(value[0])}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                提高图片清晰度，增强边缘细节
              </p>
            </div>

            {/* 降噪强度 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="denoise">降噪强度</Label>
                <span className="text-sm text-muted-foreground">{denoise}</span>
              </div>
              <Slider
                id="denoise"
                min={0}
                max={100}
                step={5}
                value={[denoise]}
                onValueChange={(value) => setDenoise(value[0])}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                减少图片噪点，使画面更干净
              </p>
            </div>
          </div>

          {/* 参数说明 */}
          <div className="rounded-lg bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 p-4 space-y-2">
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
              增强效果说明
            </p>
            <ul className="text-xs text-primary-800 dark:text-primary-200 space-y-1 list-disc list-inside">
              <li>锐化强度：适合模糊的扫描图片，建议值 20-40</li>
              <li>降噪强度：适合有噪点的图片，建议值 10-30</li>
              <li>处理后图片将自动保存，原图不受影响</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
            disabled={isProcessing}
          >
            取消
          </Button>
          <Button
            onClick={handleProcess}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RotateCw className="w-4 h-4 mr-1 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                确认增强
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
