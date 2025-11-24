"use client"

import { useState, useCallback } from 'react'
import { Upload, FileImage, FileText, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadQuestionFile } from '@/app/actions/question-upload'
import { formatFileSize } from '@/lib/ai-question-bank/utils'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface FileUploadSectionProps {
  onSuccess?: () => void
}

export function FileUploadSection({ onSuccess }: FileUploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  // 处理文件拖拽
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // 处理文件放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast({
        title: '文件格式不支持',
        description: '只支持JPG、PNG和PDF格式',
        variant: 'destructive'
      })
      return
    }

    // 验证文件大小
    const MAX_SIZE = 20 * 1024 * 1024 // 20MB
    if (file.size > MAX_SIZE) {
      toast({
        title: '文件过大',
        description: `文件大小${formatFileSize(file.size)}，超过20MB限制`,
        variant: 'destructive'
      })
      return
    }

    setSelectedFile(file)
  }

  // 处理文件输入变化
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  // 清除选择的文件
  const handleClearFile = () => {
    setSelectedFile(null)
  }

  // 提交上传
  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const result = await uploadQuestionFile(formData)

      if (result.success) {
        toast({
          title: '上传成功',
          description: '文件已开始解析，请在下方查看进度'
        })
        setSelectedFile(null)
        onSuccess?.()
      } else {
        toast({
          title: '上传失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('上传文件失败', { error })
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  // 获取文件图标
  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    return <FileImage className="h-8 w-8 text-blue-500" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>上传试卷文件</CardTitle>
        <CardDescription>
          支持JPG、PNG、PDF格式，单个文件最大20MB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 拖拽上传区域 */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
            }
          `}
        >
          {selectedFile ? (
            // 已选择文件
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {getFileIcon(selectedFile)}
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearFile}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    开始上传
                  </>
                )}
              </Button>
            </div>
          ) : (
            // 未选择文件
            <>
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                拖拽文件到这里，或点击选择文件
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                支持 JPG、PNG、PDF，最大 20MB
              </p>
              <Button variant="outline" asChild>
                <label htmlFor="file-input" className="cursor-pointer">
                  选择文件
                </label>
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </>
          )}
        </div>

        {/* 使用说明 */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">使用提示</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>确保图片清晰，文字可辨认</li>
            <li>建议分辨率不低于1000×1000像素</li>
            <li>AI解析准确率约80-85%，请人工复核</li>
            <li>解析完成后可编辑题目内容</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
