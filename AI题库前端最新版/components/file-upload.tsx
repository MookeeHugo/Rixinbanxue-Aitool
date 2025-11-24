"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Upload, File, FileText, ImageIcon, X, CheckCircle2, HardDrive, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { mockAPI } from "@/lib/mock-api"
import { useAppStore } from "@/lib/store"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File // 保存原始 File 对象，用于构造 FormData
  preview?: string
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  errorMessage?: string
  retryCount: number
}

const STORAGE_LIMIT_MB = 100
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024
const STORAGE_KEY = "upload_storage_used"
const MAX_RETRY = 3

export function FileUpload() {
  const router = useRouter()
  const { toast } = useToast()
  const { setCurrentTask, addTaskToHistory, updateTaskStage } = useAppStore()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [usedStorage, setUsedStorage] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setUsedStorage(Number.parseInt(stored, 10))
    }
  }, [])

  const updateUsedStorage = useCallback(
    (newSize: number) => {
      const newUsed = usedStorage + newSize
      setUsedStorage(newUsed)
      localStorage.setItem(STORAGE_KEY, newUsed.toString())
    },
    [usedStorage],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }, [])

  const processFiles = (fileList: File[]) => {
    const totalNewSize = fileList.reduce((sum, file) => sum + file.size, 0)
    const totalCurrentSize = files.reduce((sum, file) => sum + file.size, 0)

    if (usedStorage + totalCurrentSize + totalNewSize > STORAGE_LIMIT_BYTES) {
      const remainingMB = ((STORAGE_LIMIT_BYTES - usedStorage - totalCurrentSize) / (1024 * 1024)).toFixed(2)
      toast({
        title: "容量不足",
        description: `剩余容量：${remainingMB}MB，无法上传所选文件`,
        variant: "destructive",
      })
      return
    }

    const newFiles: UploadedFile[] = fileList.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      file, // 保存原始 File 对象
      progress: 0,
      status: "pending",
      retryCount: 0,
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }

  const uploadSingleFile = async (fileId: string): Promise<void> => {
    const fileItem = files.find((f) => f.id === fileId)
    if (!fileItem) return

    try {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "uploading", progress: 0 } : f)))

      const formData = new FormData()
      formData.append("file", fileItem.file)
      formData.append("filename", fileItem.name)
      formData.append("filesize", fileItem.size.toString())

      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15
        if (progress >= 90) {
          clearInterval(progressInterval)
          progress = 90
        }
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: Math.min(progress, 90) } : f)))
      }, 300)

      await mockAPI.uploadSingleFile(formData)

      clearInterval(progressInterval)

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "success", progress: 100, errorMessage: undefined } : f)),
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "上传失败"

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                errorMessage,
                retryCount: f.retryCount + 1,
              }
            : f,
        ),
      )

      console.error(`[v0] Upload error for file ${fileId}:`, error)
    }
  }

  const retryFile = async (fileId: string) => {
    const fileItem = files.find((f) => f.id === fileId)
    if (!fileItem || fileItem.retryCount >= MAX_RETRY) {
      toast({
        title: "重试失败",
        description: "已达到最大重试次数",
        variant: "destructive",
      })
      return
    }

    await uploadSingleFile(fileId)
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)

    try {
      const uploadPromises = files.filter((f) => f.status === "pending").map((file) => uploadSingleFile(file.id))

      await Promise.all(uploadPromises)

      await new Promise((resolve) => setTimeout(resolve, 100))

      setFiles((currentFiles) => {
        const failedFiles = currentFiles.filter((f) => f.status === "error")
        const successFiles = currentFiles.filter((f) => f.status === "success")

        console.log("[v0] Upload completed - success:", successFiles.length, "failed:", failedFiles.length)

        if (failedFiles.length > 0) {
          toast({
            title: "部分文件上传失败",
            description: `${failedFiles.length} 个文件上传失败，请重试`,
            variant: "destructive",
          })
          setIsUploading(false)
          return currentFiles
        }

        const totalSize = currentFiles.reduce((sum, file) => sum + file.size, 0)
        updateUsedStorage(totalSize)

        mockAPI
          .createParseTask(currentFiles.map((f) => f.name))
          .then((task) => {
            console.log("[v0] Parse task created:", task)
            const taskWithStage = {
              ...task,
              stage: "parsing" as const,
              lastActiveAt: Date.now(),
              isIncomplete: true,
            }
            setCurrentTask(taskWithStage)
            addTaskToHistory(taskWithStage)

            toast({
              title: "上传成功",
              description: `已创建解析任务，开始解析 ${currentFiles.length} 个文件`,
            })

            router.push("/parse")
          })
          .catch((error) => {
            console.error("[v0] Create task error:", error)
            toast({
              title: "创建任务失败",
              description: error instanceof Error ? error.message : "请稍后重试",
              variant: "destructive",
            })
            setIsUploading(false)
          })

        return currentFiles
      })
    } catch (error) {
      console.error("[v0] Upload error:", error)
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const allFilesUploaded = files.length > 0 && files.every((f) => f.status === "success")
  const hasErrorFiles = files.some((f) => f.status === "error")
  const hasPendingFiles = files.some((f) => f.status === "pending")

  const currentTotalSize = files.reduce((sum, file) => sum + file.size, 0)
  const totalUsed = usedStorage + currentTotalSize
  const usagePercentage = (totalUsed / STORAGE_LIMIT_BYTES) * 100
  const remainingBytes = STORAGE_LIMIT_BYTES - totalUsed

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <HardDrive className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm md:text-base font-semibold text-gray-900">存储空间</p>
              <p className="text-xs md:text-sm text-gray-600">
                已使用 {formatFileSize(totalUsed)} / {STORAGE_LIMIT_MB}MB
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-lg md:text-xl font-bold text-blue-600">{usagePercentage.toFixed(1)}%</p>
            <p className="text-xs md:text-sm text-gray-600">剩余 {formatFileSize(remainingBytes)}</p>
          </div>
        </div>
        <Progress
          value={usagePercentage}
          className={cn("h-2 transition-all duration-300", usagePercentage > 90 ? "bg-red-100" : "bg-gray-200")}
        />
        {usagePercentage > 90 && (
          <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">⚠️ 存储空间即将用尽</p>
        )}
      </Card>

      <label htmlFor="file-upload" className="cursor-pointer block">
        <Card
          className={cn(
            "border-2 border-dashed transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:scale-[1.01]",
            isDragging ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-gray-300",
          )}
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative rounded-lg p-6 md:p-12 text-center"
          >
            <div
              className={cn(
                "mx-auto h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300",
                isDragging
                  ? "bg-blue-100 scale-110 rotate-12"
                  : "bg-gray-100 group-hover:bg-blue-50 group-hover:scale-110",
              )}
            >
              <Upload
                className={cn(
                  "h-8 w-8 transition-all duration-300",
                  isDragging ? "text-blue-600 animate-bounce" : "text-gray-400 group-hover:text-blue-600",
                )}
              />
            </div>
            <div className="mt-4 md:mt-6">
              <span className="text-blue-600 hover:text-blue-700 font-semibold text-base md:text-lg transition-colors">
                点击上传文件
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />
              <span className="text-gray-600 text-sm md:text-base"> 或拖拽文件到此处</span>
            </div>
            <p className="mt-2 md:mt-3 text-xs md:text-sm text-gray-500">
              支持 PDF, Word, JPG, PNG 格式，单个文件不超过 20MB
            </p>
          </div>
        </Card>
      </label>

      {files.length > 0 && (
        <Card className="p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">已选择文件</h3>
            <span className="text-sm text-gray-500">{files.length} 个文件</span>
          </div>
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        file.status === "success"
                          ? "bg-green-100"
                          : file.status === "error"
                            ? "bg-red-100"
                            : "bg-gray-100",
                      )}
                    >
                      {file.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : file.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <span className="text-gray-600">{getFileIcon(file.type)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      {file.status === "uploading" && (
                        <div className="mt-2">
                          <Progress value={file.progress} className="h-1.5" />
                          <p className="text-xs text-gray-500 mt-1">{Math.round(file.progress)}%</p>
                        </div>
                      )}
                      {file.status === "success" && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          上传成功
                        </p>
                      )}
                      {file.status === "error" && (
                        <div className="mt-1">
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {file.errorMessage || "上传失败"}
                          </p>
                          {file.retryCount < MAX_RETRY && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryFile(file.id)}
                              className="mt-1 h-6 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              重试 ({file.retryCount}/{MAX_RETRY})
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFiles([])} disabled={isUploading} className="border-gray-300">
              清空列表
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isUploading ? "处理中..." : allFilesUploaded ? "开始解析" : hasPendingFiles ? "上传文件" : "重新上传"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

const getFileIcon = (type: string) => {
  if (type.includes("image")) return <ImageIcon className="h-5 w-5" />
  if (type.includes("pdf")) return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}
