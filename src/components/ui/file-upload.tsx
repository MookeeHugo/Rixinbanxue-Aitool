"use client"

import * as React from "react"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import Image from "next/image"

export interface FileUploadProps {
  /**
   * 接受的文件类型 MIME 类型数组
   * @example ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
   */
  accept?: string[]
  /**
   * 最大文件大小（字节）
   * @default 2MB (2 * 1024 * 1024)
   */
  maxSize?: number
  /**
   * 上传路径前缀
   * @example 'questions/temp'
   */
  prefix: string
  /**
   * 上传成功回调
   */
  onUpload: (result: { key: string; url: string }) => void | Promise<void>
  /**
   * 删除文件回调（可选）
   */
  onRemove?: () => void | Promise<void>
  /**
   * 是否正在上传
   */
  uploading?: boolean
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 按钮文本
   */
  buttonText?: string
  /**
   * 自定义样式类名
   */
  className?: string
  /**
   * 子元素（自定义触发器）
   */
  children?: React.ReactNode
}

/**
 * 通用文件上传组件
 *
 * 基于原 question-form 中的上传逻辑提取
 * 支持文件类型验证、大小验证、自动上传到 /api/files/upload
 *
 * @example
 * ```tsx
 * <FileUpload
 *   prefix="questions/temp"
 *   accept={['image/jpeg', 'image/png']}
 *   maxSize={2 * 1024 * 1024}
 *   onUpload={({ key, url }) => {
 *     setImageUrl(url)
 *     setImageKey(key)
 *   }}
 *   buttonText="上传题目图片"
 * />
 * ```
 */
export function FileUpload({
  accept = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxSize = 2 * 1024 * 1024, // 2MB
  prefix,
  onUpload,
  onRemove,
  uploading: externalUploading,
  disabled,
  buttonText = "上传文件",
  className,
  children,
}: FileUploadProps) {
  const [internalUploading, setInternalUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const uploading = externalUploading ?? internalUploading

  /**
   * 验证文件类型和大小
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!accept.includes(file.type)) {
      const acceptedTypes = accept
        .map(type => type.split('/')[1].toUpperCase())
        .join('/')
      return {
        valid: false,
        error: `仅支持 ${acceptedTypes} 文件`,
      }
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: `文件大小需小于 ${maxSizeMB}MB`,
      }
    }

    return { valid: true }
  }

  /**
   * 上传文件到 API
   */
  const uploadFile = async (file: File): Promise<{ key: string; url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('prefix', prefix)
    formData.append('access', 'public')

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error || '文件上传失败')
    }

    return {
      key: data.key as string,
      url: (data.publicUrl || data.cdnUrl || '') as string,
    }
  }

  /**
   * 处理文件选择
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      // 清空 input 以允许重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // 上传文件
    try {
      setInternalUploading(true)
      const result = await uploadFile(file)
      await onUpload(result)
      toast.success('文件上传成功')
    } catch (error) {
      logger.error('Failed to upload file:', { error })
      toast.error(error instanceof Error ? error.message : '文件上传失败')
    } finally {
      setInternalUploading(false)
      // 清空 input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  /**
   * 处理点击上传按钮
   */
  const handleClick = () => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-label="选择文件上传"
      />

      {children ? (
        <div onClick={handleClick} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={disabled || uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? '上传中...' : buttonText}
        </Button>
      )}
    </div>
  )
}

/**
 * 文件上传预览组件
 *
 * 用于显示已上传的文件，支持删除操作
 */
export interface FileUploadPreviewProps {
  /**
   * 文件 URL
   */
  url: string
  /**
   * 文件类型（用于判断如何渲染）
   */
  type?: 'image' | 'file'
  /**
   * 删除回调
   */
  onRemove?: () => void | Promise<void>
  /**
   * 是否显示删除按钮
   */
  showRemove?: boolean
  /**
   * 是否正在删除
   */
  removing?: boolean
  /**
   * 自定义样式类名
   */
  className?: string
  /**
   * Alt 文本（图片）
   */
  alt?: string
}

export function FileUploadPreview({
  url,
  type = 'image',
  onRemove,
  showRemove = true,
  removing = false,
  className,
  alt = '已上传文件',
}: FileUploadPreviewProps) {
  const [internalRemoving, setInternalRemoving] = React.useState(false)
  const isRemoving = removing || internalRemoving

  const handleRemove = async () => {
    if (!onRemove || isRemoving) return

    try {
      setInternalRemoving(true)
      await onRemove()
      toast.success('文件已删除')
    } catch (error) {
      logger.error('Failed to remove file:', { error })
      toast.error('删除文件失败，请稍后再试')
    } finally {
      setInternalRemoving(false)
    }
  }

  return (
    <div className={cn("relative inline-block group", className)}>
      {type === 'image' ? (
        <Image
          src={url}
          alt={alt}
          width={800}
          height={800}
          sizes="(max-width: 768px) 100vw, 640px"
          className="max-w-full h-auto rounded-md border border-input"
        />
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-md border border-input bg-background">
          <Upload className="h-4 w-4" />
          <span className="text-sm truncate">{url.split('/').pop()}</span>
        </div>
      )}

      {showRemove && onRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className={cn(
            "absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label="删除文件"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
