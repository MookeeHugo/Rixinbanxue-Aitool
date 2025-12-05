'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { QuestionContentRenderer } from './question-content-renderer'
import { LatexEditor } from '@/components/latex-editor'
import { ImagePositionEditor, type ImageItem } from '@/components/image-position-editor'
import { ImageEnhancementDialog } from './image-enhancement-dialog'
import type { ParsedQuestionRecord, DifficultyLevel, QuestionImageAsset } from '@/lib/ai-question-bank'
import { updateQuestion, deleteQuestion } from '@/app/actions/question-upload'
import {
  formatConfidence,
  getDifficultyColor,
  getDifficultyLabel,
  getQuestionTypeLabel,
  isLowConfidence
} from '@/lib/ai-question-bank/display-helpers'
import { AlertCircle, CheckCircle2, Crop, Edit, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { manualCropQuestionImage } from '@/app/actions/question-upload'
import { ManualImageCropper } from './manual-image-cropper'
import { ReparseButton } from './reparse-button'
import { TagSelector } from './tag-selector'
import type { QuestionTag } from '@/lib/tags'

interface QuestionReviewCardProps {
  question: ParsedQuestionRecord
  index: number
  imageUrl?: string
}

export function QuestionReviewCard({ question, index, imageUrl }: QuestionReviewCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [cropSelection, setCropSelection] = useState<[number, number, number, number] | null>(null)
  const [contentEditMode, setContentEditMode] = useState<'visual' | 'raw'>('visual')
  const [answerEditMode, setAnswerEditMode] = useState<'visual' | 'raw'>('visual')
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false)
  const [selectedImageForEnhancement, setSelectedImageForEnhancement] = useState<QuestionImageAsset | null>(null)
  const [selectedQuestionTags, setSelectedQuestionTags] = useState<QuestionTag[]>([])

  // 标签变更回调
  const handleTagsChange = useCallback((tags: QuestionTag[]) => {
    setSelectedQuestionTags(tags)
  }, [])

  // 配图 placeholder 编辑
  const handleImagePlaceholderChange = useCallback((imageId: string, newPlaceholder: string) => {
    setEditedData((prev) => ({
      ...prev,
      imageAssets: prev.imageAssets.map((asset) =>
        asset.id === imageId ? { ...asset, placeholder: newPlaceholder } : asset
      )
    }))
  }, [])

  const [editedData, setEditedData] = useState({
    type: question.type,
    content: question.content,
    options: question.options || [],
    answer: question.answer || '',
    imageAssets: question.image_assets || [],
    tags: {
      ...question.tags,
      difficulty: (question.tags?.difficulty as DifficultyLevel) || 'medium',
      knowledge: question.tags?.knowledge || []
    }
  })

  const handleSelectionChange = useCallback((box: [number, number, number, number] | null) => {
    setCropSelection(box)
  }, [])

  // 转换 QuestionImageAsset 到 ImageItem 格式
  const convertToImageItems = useCallback((assets: QuestionImageAsset[]): ImageItem[] => {
    return assets.map((asset, index) => ({
      id: asset.id || `asset-${index}`,
      url: `/api/image-proxy?url=${encodeURIComponent(asset.url)}`,
      title: asset.placeholder || `配图 ${asset.order || index + 1}`,
      width: asset.region?.width || asset.trimmedSize?.width,
      height: asset.region?.height || asset.trimmedSize?.height,
      data: {
        source: asset.source || 'ai',
        order: asset.order || index + 1,
        rawUrl: asset.url,
        key: asset.key,
        region: asset.region
      }
    }))
  }, [])

  // 转换 ImageItem 回 QuestionImageAsset 格式
  const convertToQuestionAssets = useCallback((items: ImageItem[]): QuestionImageAsset[] => {
    return items.map((item, index) => ({
      id: item.id,
      url: (item.data?.rawUrl as string) || item.url,
      key: item.data?.key as string | undefined,
      placeholder: item.title || `配图 ${index + 1}`,
      order: index + 1,
      source: (item.data?.source as 'ai' | 'manual') || 'ai',
      region: item.data?.region as any
    }))
  }, [])

  // 处理图片重新排序
  const handleImageReorder = useCallback((reorderedImages: ImageItem[]) => {
    const updatedAssets = convertToQuestionAssets(reorderedImages)
    setEditedData((prev) => ({
      ...prev,
      imageAssets: updatedAssets
    }))
  }, [convertToQuestionAssets])

  // 处理图片删除
  const handleImageDelete = useCallback((imageId: string) => {
    const asset = editedData.imageAssets.find((a) => a.id === imageId)
    const assetName = asset?.placeholder || '此配图'

    if (window.confirm(`确定要删除"${assetName}"吗？\n\n删除后需要点击"保存修改"才会生效。`)) {
      setEditedData((prev) => ({
        ...prev,
        imageAssets: prev.imageAssets.filter((asset) => asset.id !== imageId)
      }))

      toast({
        title: '已从列表中移除',
        description: '点击"保存修改"后将永久删除此配图'
      })
    }
  }, [editedData.imageAssets, toast])

  // 处理图片增强
  const handleImageEnhance = useCallback((imageId: string) => {
    const asset = editedData.imageAssets.find((a) => a.id === imageId)
    if (asset) {
      setSelectedImageForEnhancement(asset)
      setEnhanceDialogOpen(true)
    }
  }, [editedData.imageAssets])

  // 增强成功后更新图片
  const handleEnhanceSuccess = useCallback(async (newImageUrl: string) => {
    if (!selectedImageForEnhancement) return

    // 如果在编辑模式，更新编辑数据
    if (isEditing) {
      setEditedData((prev) => ({
        ...prev,
        imageAssets: prev.imageAssets.map((asset) =>
          asset.id === selectedImageForEnhancement.id
            ? { ...asset, url: newImageUrl, source: 'manual' as const }
            : asset
        )
      }))

      toast({
        title: '图片已增强',
        description: '配图已更新，记得保存修改'
      })
    } else {
      // 卡片快捷模式，直接保存到数据库
      try {
        const updatedAssets = (question.image_assets || []).map((asset) =>
          asset.id === selectedImageForEnhancement.id
            ? { ...asset, url: newImageUrl, source: 'manual' as const }
            : asset
        )

        const result = await updateQuestion(question.id, { imageAssets: updatedAssets })

        if (!result.success) {
          throw new Error(result.error || '保存失败')
        }

        toast({
          title: '图片已增强',
          description: '配图已更新为增强后的版本'
        })
        router.refresh()
      } catch (error) {
        toast({
          title: '保存失败',
          description: error instanceof Error ? error.message : '请稍后重试',
          variant: 'destructive'
        })
      }
    }
  }, [selectedImageForEnhancement, isEditing, question.id, question.image_assets, toast, router])

  const lowConfidence = isLowConfidence(question.confidence)
  const difficultyColor = getDifficultyColor(editedData.tags.difficulty)
  const questionNumber = question.number || index + 1
  const canManualCrop = Boolean(imageUrl)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateQuestion(question.id, editedData)
      if (!result.success) {
        throw new Error(result.error || '未知错误')
      }

      toast({
        title: '保存成功',
        description: '题目信息已更新'
      })
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedData({
      type: question.type,
      content: question.content,
      options: question.options || [],
      answer: question.answer || '',
      imageAssets: question.image_assets || [],
      tags: {
        ...question.tags,
        difficulty: (question.tags?.difficulty as DifficultyLevel) || 'medium',
        knowledge: question.tags?.knowledge || []
      }
    })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteQuestion(question.id)
      if (!result.success) {
        throw new Error(result.error || '未知错误')
      }

      toast({
        title: '已删除',
        description: `第 ${questionNumber} 题已移出列表`
      })
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddOption = () => {
    setEditedData((prev) => ({
      ...prev,
      options: [...prev.options, '']
    }))
  }

  const handleRemoveOption = (idx: number) => {
    setEditedData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx)
    }))
  }

  const handleOptionChange = (idx: number, value: string) => {
    setEditedData((prev) => {
      const next = [...prev.options]
      next[idx] = value
      return { ...prev, options: next }
    })
  }

  const handleAddKnowledgePoint = () => {
    setEditedData((prev) => ({
      ...prev,
      tags: { ...prev.tags, knowledge: [...prev.tags.knowledge, ''] }
    }))
  }

  const handleRemoveKnowledgePoint = (idx: number) => {
    setEditedData((prev) => ({
      ...prev,
      tags: {
        ...prev.tags,
        knowledge: prev.tags.knowledge.filter((_, i) => i !== idx)
      }
    }))
  }

  const handleKnowledgePointChange = (idx: number, value: string) => {
    setEditedData((prev) => {
      const next = [...prev.tags.knowledge]
      next[idx] = value
      return {
        ...prev,
        tags: {
          ...prev.tags,
          knowledge: next
        }
      }
    })
  }

  const handleManualCrop = async () => {
    if (!cropSelection) {
      toast({
        title: '请先框选区域',
        description: '在原图上框出需要保留的图像，再执行裁剪。',
        variant: 'destructive'
      })
      return
    }

    setIsCropping(true)
    try {
      const result = await manualCropQuestionImage({
        questionId: question.id,
        taskId: question.upload_task_id,
        box2d: cropSelection
      })

      if (!result.success) {
        throw new Error(result.error || '裁剪失败')
      }

      toast({
        title: '裁剪完成',
        description: '人工修复的配图已生成，可在列表中查看效果。'
      })
      setCropDialogOpen(false)
      setCropSelection(null)
      router.refresh()
    } catch (error) {
      toast({
        title: '裁剪失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsCropping(false)
    }
  }

  // 卡片快捷删除图片
  const handleQuickDeleteImage = useCallback(async (imageId: string) => {
    const asset = question.image_assets?.find((a) => a.id === imageId)
    const assetName = asset?.placeholder || '此配图'

    if (!window.confirm(`确定要删除"${assetName}"吗？\n\n此操作将立即生效。`)) {
      return
    }

    try {
      const updatedAssets = (question.image_assets || []).filter((a) => a.id !== imageId)
      const result = await updateQuestion(question.id, { imageAssets: updatedAssets })

      if (!result.success) {
        throw new Error(result.error || '删除失败')
      }

      toast({
        title: '删除成功',
        description: '配图已从题目中移除'
      })
      router.refresh()
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    }
  }, [question.id, question.image_assets, toast, router])

  // 卡片快捷增强图片
  const handleQuickEnhanceImage = useCallback((imageId: string) => {
    const asset = question.image_assets?.find((a) => a.id === imageId)
    if (asset) {
      setSelectedImageForEnhancement(asset)
      setEnhanceDialogOpen(true)
    }
  }, [question.image_assets])

  return (
    <>
      <Card className={`border rounded-xl overflow-x-hidden ${isEditing ? 'border-primary-500 shadow-lg' : lowConfidence ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default">{`第 ${questionNumber} 题`}</Badge>
            {isEditing && (
              <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-300">
                <Edit className="w-3 h-3 mr-1" />
                编辑中
              </Badge>
            )}
            <Badge>{getQuestionTypeLabel(question.type)}</Badge>
            <Badge variant="outline" className={difficultyColor}>
              {getDifficultyLabel(editedData.tags.difficulty)}
            </Badge>
            <span className={`text-xs ${lowConfidence ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}`}>
              置信度 {formatConfidence(question.confidence)}
            </span>
            {lowConfidence && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                建议人工复核
              </Badge>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              {question.is_selected && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> 已选中
                </Badge>
              )}
              <ReparseButton
                questionId={question.id}
                initialStatus={question.reparse_status}
                reparseCount={question.reparse_count}
                lastReparseAt={question.last_reparse_at}
                disabled={!imageUrl}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCropDialogOpen(true)}
                disabled={!canManualCrop}
              >
                <Crop className="w-4 h-4 mr-1" />
                框选修复
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                编辑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-hidden">
          {!isEditing ? (
            <>
              {/* 1. 题干 */}
              <div className="space-y-2">
                <QuestionContentRenderer
                  content={question.content}
                  imageUrl={imageUrl}
                  questionImageUrl={question.question_image_url}
                  imageAssets={[]}
                  showImageActions={false}
                />
              </div>

              {/* 2. 选项 */}
              {question.options && question.options.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">选项</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {question.options.map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. 配图 */}
              {question.image_assets && question.image_assets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">配图</p>
                  <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                    {question.image_assets.map((asset, index) => (
                      <figure
                        key={asset.id}
                        className="snap-start min-w-[220px] max-w-[260px] flex-shrink-0 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-muted/20 p-3 flex flex-col gap-2"
                      >
                        <div className="relative h-40 rounded-lg bg-background flex items-center justify-center overflow-hidden group">
                          <Image
                            src={`/api/image-proxy?url=${encodeURIComponent(asset.url)}`}
                            alt={asset.placeholder || `配图 ${index + 1}`}
                            fill
                            loading="lazy"
                            sizes="(max-width: 768px) 220px, 260px"
                            className="object-contain"
                          />
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickEnhanceImage(asset.id)
                              }}
                              title="增强图片"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickDeleteImage(asset.id)
                              }}
                              title="删除图片"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <figcaption className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-foreground">{asset.placeholder || `配图 ${index + 1}`}</div>
                            <Badge
                              variant={asset.source === 'manual' ? 'accent' : 'default'}
                              className={asset.source === 'manual' ? 'border-primary-500 text-primary-700' : ''}
                            >
                              {asset.source === 'manual' ? '人工修复' : 'AI 截图'}
                            </Badge>
                          </div>
                          {asset.region && (
                            <div>
                              尺寸：{asset.region.width} × {asset.region.height}
                            </div>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. 答案 */}
              {question.answer && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">答案</p>
                  <div className="text-muted-foreground">{question.answer}</div>
                </div>
              )}

              {/* AI 解题步骤 */}
              {question.steps && question.steps.length > 0 && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">AI 解题步骤</p>
                  <ul className="list-decimal list-inside space-y-1 text-muted-foreground">
                    {question.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 知识点 */}
              {question.tags?.knowledge?.length ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">知识点</p>
                  <div className="flex flex-wrap gap-2">
                    {question.tags.knowledge.map((tag, i) => (
                      <Badge variant="outline" key={i}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 标签 */}
              {selectedQuestionTags.length > 0 && (
                <div className="space-y-1 text-sm pt-3 border-t">
                  <p className="font-medium">标签</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuestionTags.map((qt) => (
                      <Badge
                        key={qt.id}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {qt.tag?.displayName}
                        {qt.source === 'ai' && (
                          <Sparkles className="w-3 h-3 text-purple-500 ml-0.5" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">题目内容</TabsTrigger>
                <TabsTrigger value="images">配图管理 ({editedData.imageAssets.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4 min-h-[700px] w-full">
                <div className="space-y-2">
                  <Label htmlFor="type">题目类型</Label>
                  <Select
                    value={editedData.type}
                    onValueChange={(value) => setEditedData({ ...editedData, type: value as typeof editedData.type })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="请选择题型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="choice">选择题</SelectItem>
                      <SelectItem value="fill">填空题</SelectItem>
                      <SelectItem value="essay">解答题</SelectItem>
                      <SelectItem value="proof">证明题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">题干</Label>
                    <Tabs value={contentEditMode} onValueChange={(v) => setContentEditMode(v as 'visual' | 'raw')} className="w-auto">
                      <TabsList className="h-8">
                        <TabsTrigger value="visual" className="text-xs px-3 py-1">可视化编辑</TabsTrigger>
                        <TabsTrigger value="raw" className="text-xs px-3 py-1">原始文本</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {contentEditMode === 'visual' ? (
                    <LatexEditor
                      value={editedData.content}
                      onChange={(value) => setEditedData({ ...editedData, content: value })}
                      showToolbar={true}
                      height={200}
                      placeholder="输入题干，支持 LaTeX 公式..."
                    />
                  ) : (
                    <Textarea
                      id="content"
                      value={editedData.content}
                      onChange={(e) => setEditedData({ ...editedData, content: e.target.value })}
                      className="min-h-[150px] font-mono text-sm"
                      placeholder="请输入题干，支持 Markdown/LaTeX，例如：$x^2+1$"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">提示：LaTeX 行内使用 $表达式$，块级使用 $$表达式$$</p>
                </div>

                {editedData.type === 'choice' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>选项</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                        <Plus className="w-4 h-4 mr-1" />
                        添加选项
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editedData.options.map((option, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveOption(idx)}
                            disabled={editedData.options.length <= 2}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {editedData.options.length === 0 && (
                        <p className="text-xs text-muted-foreground">请至少填写两个选项</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="answer">答案/解析</Label>
                    <Tabs value={answerEditMode} onValueChange={(v) => setAnswerEditMode(v as 'visual' | 'raw')} className="w-auto">
                      <TabsList className="h-8">
                        <TabsTrigger value="visual" className="text-xs px-3 py-1">可视化编辑</TabsTrigger>
                        <TabsTrigger value="raw" className="text-xs px-3 py-1">原始文本</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {answerEditMode === 'visual' ? (
                    <LatexEditor
                      value={editedData.answer}
                      onChange={(value) => setEditedData({ ...editedData, answer: value })}
                      showToolbar={true}
                      height={150}
                      placeholder="可输入答案或简要解析..."
                    />
                  ) : (
                    <Textarea
                      id="answer"
                      value={editedData.answer}
                      onChange={(e) => setEditedData({ ...editedData, answer: e.target.value })}
                      className="min-h-[100px]"
                      placeholder="可输入答案或简要解析"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">难度</Label>
                  <Select
                    value={editedData.tags.difficulty}
                    onValueChange={(value) =>
                      setEditedData({
                        ...editedData,
                        tags: { ...editedData.tags, difficulty: value as DifficultyLevel }
                      })
                    }
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="请选择难度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">适中</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>知识点</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddKnowledgePoint}>
                      <Plus className="w-4 h-4 mr-1" />
                      添加知识点
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editedData.tags.knowledge.map((kp, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={kp}
                          onChange={(e) => handleKnowledgePointChange(idx, e.target.value)}
                          placeholder="请输入知识点，如：函数图像"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveKnowledgePoint(idx)}
                          disabled={editedData.tags.knowledge.length <= 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {editedData.tags.knowledge.length === 0 && (
                      <p className="text-xs text-muted-foreground">暂无知识点，可点击上方按钮添加</p>
                    )}
                  </div>
                </div>

                {/* 标签系统 */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-base font-semibold">标签管理</Label>
                    <Badge variant="outline" className="text-xs">
                      多维度分类
                    </Badge>
                  </div>
                  <TagSelector
                    questionId={question.id}
                    questionTable="parsed_questions"
                    onTagsChange={handleTagsChange}
                    showAIRecommend={true}
                    compact={false}
                  />
                </div>
              </TabsContent>

              <TabsContent value="images" className="mt-4 min-h-[500px] w-full">
                <div className="space-y-4">
                  <div className="rounded-lg bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 p-3">
                    <p className="text-sm text-primary-900 dark:text-primary-100 font-medium mb-1">
                      配图管理说明
                    </p>
                    <ul className="text-xs text-primary-800 dark:text-primary-200 space-y-1 list-disc list-inside">
                      <li>上方拖拽区域：调整图片顺序</li>
                      <li>下方操作列表：增强或删除单张图片</li>
                      <li>删除瑕疵图片后，记得点击“保存修改”按钮</li>
                    </ul>
                  </div>
                  {editedData.imageAssets.length > 0 ? (
                    <>
                      <ImagePositionEditor
                        images={convertToImageItems(editedData.imageAssets)}
                        onChange={handleImageReorder}
                        onDelete={handleImageDelete}
                        layout="grid"
                        columns={3}
                        showDelete={true}
                        showPreview={true}
                        imageSize="md"
                        data-testid="image-position-editor"
                      />

                      {/* 图片操作列表 */}
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="text-sm font-medium mb-3">图片操作</h4>
                        <div className="space-y-2">
                          {editedData.imageAssets.map((asset, index) => (
                            <div key={asset.id} className="flex items-center gap-3 p-2 rounded-lg bg-background border">
                              <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                                <Image
                                  src={`/api/image-proxy?url=${encodeURIComponent(asset.url)}`}
                                  alt={asset.placeholder || `配图 ${index + 1}`}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <Input
                                  value={asset.placeholder || `配图 ${index + 1}`}
                                  onChange={(e) => handleImagePlaceholderChange(asset.id, e.target.value)}
                                  placeholder="配图标签"
                                  className="h-8 text-sm mb-1"
                                />
                                <p className="text-xs text-muted-foreground">
                                  {asset.source === 'manual' ? '人工修复' : 'AI 截图'}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleImageEnhance(asset.id)}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  增强
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleImageDelete(asset.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  删除
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
                      <p>暂无配图</p>
                      <p className="text-xs mt-2">可在题目解析过程中自动生成配图</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {isEditing && (
            <div className="flex gap-2 justify-end border-t pt-4 mt-6">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                {isSaving ? '保存中...' : '保存修改'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除这道题？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            删除后将无法恢复，系统也不会再展示第 {questionNumber} 题的内容。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          setCropDialogOpen(open)
          if (!open) {
            setCropSelection(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>人工框选修复</DialogTitle>
            <p className="text-sm text-muted-foreground">
              在原始试卷图上框选正确的图像区域，系统会重新裁剪并替换当前配图。
            </p>
          </DialogHeader>
          {imageUrl ? (
            <ManualImageCropper
              imageUrl={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
              onSelectionChange={handleSelectionChange}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              暂无原始图片 URL，无法执行人工裁剪。请刷新页面或重新加载任务。
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCropDialogOpen(false)
                setCropSelection(null)
              }}
              disabled={isCropping}
            >
              取消
            </Button>
            <Button onClick={handleManualCrop} disabled={!cropSelection || isCropping || !imageUrl}>
              {isCropping ? '裁剪中...' : '确认裁剪'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片增强对话框 */}
      {selectedImageForEnhancement && (
        <ImageEnhancementDialog
          open={enhanceDialogOpen}
          onOpenChange={setEnhanceDialogOpen}
          imageUrl={`/api/image-proxy?url=${encodeURIComponent(selectedImageForEnhancement.url)}`}
          onSuccess={handleEnhanceSuccess}
        />
      )}
    </>
  )
}
