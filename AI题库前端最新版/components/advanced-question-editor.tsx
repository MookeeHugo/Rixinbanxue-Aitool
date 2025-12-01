"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  ImageIcon,
  GripVertical,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageBlock {
  id: string
  url: string
  pageIndex: number
  position: number
  width: number
  align: "left" | "center" | "right"
  caption?: string
  confidence: number
  used: boolean
}

interface Question {
  id: string
  type: "choice" | "fill" | "solve"
  content?: string
  rawText?: string
  cleanText?: string
  options?: string[]
  answer: string
  difficulty?: "easy" | "medium" | "hard"
  hasImage?: boolean
  imageUrl?: string
  images?: ImageBlock[]
  aiTags?: Array<{ category: string; value: string; confidence: number }>
  confidence?: number
}

interface AdvancedQuestionEditorProps {
  question: Question
  onSave: (question: Question) => void
  onCancel: () => void
}

export function AdvancedQuestionEditor({ question, onSave, onCancel }: AdvancedQuestionEditorProps) {
  const [editedContent, setEditedContent] = useState(question.cleanText || "")
  const [imageBlocks, setImageBlocks] = useState<ImageBlock[]>(question.images || [])
  const [draggedImage, setDraggedImage] = useState<ImageBlock | null>(null)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [editingImage, setEditingImage] = useState<ImageBlock | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const unusedImages = imageBlocks.filter((img) => !img.used)
  const usedImages = imageBlocks.filter((img) => img.used)

  const handleDragStart = (image: ImageBlock) => {
    setDraggedImage(image)
  }

  const handleDropToEditor = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedImage || !editorRef.current) return

    const cursorPosition = editorRef.current.selectionStart
    const placeholder = `\n[图片:${draggedImage.id}]\n`
    const newContent = editedContent.slice(0, cursorPosition) + placeholder + editedContent.slice(cursorPosition)

    setEditedContent(newContent)
    setImageBlocks((prev) => prev.map((img) => (img.id === draggedImage.id ? { ...img, used: true } : img)))
    setDraggedImage(null)
  }

  const handleRemoveImage = (imageId: string) => {
    const regex = new RegExp(`\\[图片:${imageId}\\]`, "g")
    setEditedContent((prev) => prev.replace(regex, ""))
    setImageBlocks((prev) => prev.map((img) => (img.id === imageId ? { ...img, used: false } : img)))
  }

  const handleUpdateImage = (updated: ImageBlock) => {
    setImageBlocks((prev) => prev.map((img) => (img.id === updated.id ? updated : img)))
    setEditingImage(null)
  }

  const handleSave = () => {
    onSave({
      ...question,
      cleanText: editedContent,
      images: imageBlocks,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-base md:text-lg font-semibold">高级编辑器</span>
          {question.confidence !== undefined && question.confidence < 0.8 && (
            <Badge variant="outline" className="border-amber-500 text-amber-700 text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              低置信度 ({Math.round(question.confidence * 100)}%)
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden p-4 md:p-6">
        {/* Left: OCR Editor */}
        <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="content" className="text-base font-semibold">
              题目内容（可编辑）
            </Label>
            <Textarea
              ref={editorRef}
              id="content"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropToEditor}
              className="min-h-[300px] font-mono text-sm leading-relaxed resize-none"
              placeholder="在此编辑题目内容，或从右侧拖入图片..."
            />
            <p className="text-xs text-gray-500">提示：从右侧素材面板拖拽图片到光标位置插入</p>
          </div>

          {usedImages.length > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                已插入图片 ({usedImages.length})
              </h4>
              <div className="space-y-3">
                {usedImages.map((img) => (
                  <div key={img.id} className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200">
                    <img
                      src={img.url || "/placeholder.svg"}
                      alt=""
                      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                      onClick={() => setZoomImage(img.url)}
                    />
                    <div className="flex-1 text-xs text-gray-700">
                      <div>图片 ID: {img.id}</div>
                      <div>
                        宽度: {img.width}% | 对齐: {img.align}
                      </div>
                      {img.confidence < 0.8 && (
                        <Badge variant="outline" className="mt-1 text-xs border-amber-400">
                          低置信度
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditingImage(img)}>
                      调整
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {question.aiTags && question.aiTags.length > 0 && (
            <Card className="p-4 bg-purple-50 border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI 建议标签（供参考）
              </h4>
              <div className="flex flex-wrap gap-2">
                {question.aiTags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={cn(
                      "text-xs",
                      tag.confidence > 0.8
                        ? "border-green-400 text-green-700 bg-green-50"
                        : "border-amber-400 text-amber-700 bg-amber-50",
                    )}
                  >
                    {tag.category}: {tag.value}
                    <span className="ml-1 text-[10px]">({Math.round(tag.confidence * 100)}%)</span>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">这些标签由 AI 自动生成，您可以在标注环节确认或修改</p>
            </Card>
          )}
        </div>

        {/* Right: Material Panel */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              素材面板
            </h4>
            <p className="text-xs text-gray-600 mb-3">拖拽图片到左侧编辑器插入，或点击查看大图</p>
          </div>

          {unusedImages.length === 0 ? (
            <Card className="p-6 text-center text-gray-500 border-dashed">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">所有图片已插入</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {unusedImages.map((img) => (
                <Card
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(img)}
                  className={cn(
                    "p-3 cursor-move hover:shadow-lg transition-all",
                    img.confidence < 0.8 && "border-amber-400 bg-amber-50/30",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <img
                        src={img.url || "/placeholder.svg"}
                        alt=""
                        className="w-full rounded cursor-pointer hover:opacity-90"
                        onClick={() => setZoomImage(img.url)}
                      />
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          页码: {img.pageIndex} | 位置: {img.position}
                        </div>
                        {img.confidence < 0.8 && (
                          <Badge variant="outline" className="text-xs border-amber-400">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            置信度: {Math.round(img.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {question.confidence !== undefined && question.confidence < 0.8 && (
            <Card className="p-4 bg-gray-50 border-gray-300">
              <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                原始OCR文本（供对照）
              </h5>
              <div className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
                {question.rawText}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="border-t px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto bg-transparent">
          取消
        </Button>
        <Button onClick={handleSave} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
          <CheckCircle className="mr-2 h-4 w-4" />
          保存修改
        </Button>
      </div>

      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-4xl">
          <img src={zoomImage || ""} alt="放大查看" className="w-full h-auto" />
        </DialogContent>
      </Dialog>

      {editingImage && (
        <Dialog open={true} onOpenChange={() => setEditingImage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>调整图片设置</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>宽度 (%)</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={editingImage.width}
                  onChange={(e) => setEditingImage({ ...editingImage, width: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>对齐方式</Label>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <Button
                      key={align}
                      variant={editingImage.align === align ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditingImage({ ...editingImage, align })}
                    >
                      {align === "left" && <AlignLeft className="h-4 w-4" />}
                      {align === "center" && <AlignCenter className="h-4 w-4" />}
                      {align === "right" && <AlignRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>图片说明（可选）</Label>
                <Input
                  value={editingImage.caption || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, caption: e.target.value })}
                  placeholder="为图片添加说明文字"
                />
              </div>
              <div className="border rounded p-2">
                <p className="text-xs text-gray-600 mb-2">预览:</p>
                <img
                  src={editingImage.url || "/placeholder.svg"}
                  alt=""
                  style={{
                    width: `${editingImage.width}%`,
                    marginLeft: editingImage.align === "center" ? "auto" : editingImage.align === "right" ? "auto" : 0,
                    marginRight: editingImage.align === "center" ? "auto" : editingImage.align === "right" ? 0 : "auto",
                  }}
                  className="rounded"
                />
                {editingImage.caption && (
                  <p className="text-xs text-gray-600 mt-1 text-center">{editingImage.caption}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingImage(null)}>
                取消
              </Button>
              <Button onClick={() => handleUpdateImage(editingImage)} className="bg-blue-600 text-white">
                应用
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
