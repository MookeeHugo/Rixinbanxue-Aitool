"use client"

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FileUpload, FileUploadPreview } from '@/components/ui/file-upload'
import { logger } from '@/lib/logger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { extractR2KeyFromUrl } from '@/lib/storage-utils'
import { questionFormSchema, type QuestionFormValues } from '@/lib/schemas/question-form'

export type QuestionType = 'choice' | 'fill' | 'essay'

export interface QuestionFormData {
  id?: string
  type?: QuestionType
  content?: string
  answer?: string
  analysis_content?: string | null
  analysis?: string | null
  knowledge_points?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
  created_by?: string
  options?: string[]
  image_url?: string | null
  image_key?: string | null
  province?: string | null
  year?: number | null
  source?: string | null
  is_public?: boolean
}

const KNOWLEDGE_POINTS = [
  '有理数加法', '有理数减法', '有理数乘法', '有理数除法',
  '整式加减', '整式乘法', '因式分解',
  '一元一次方程', '二元一次方程组', '一元二次方程',
  '分式方程', '不等式',
  '函数基础', '一次函数', '反比例函数', '二次函数',
  '锐角三角函数', '解直角三角形',
  '相交线与平行线', '三角形', '全等三角形', '相似三角形',
  '等腰三角形', '直角三角形', '勾股定理',
  '四边形', '平行四边形', '矩形', '菱形', '正方形', '梯形',
  '圆的性质', '圆与直线', '圆与圆',
  '轴对称', '旋转', '平移',
  '统计初步', '概率初步', '数据分析',
  '坐标系', '点的坐标', '图形与坐标',
]

interface QuestionFormProps {
  mode: 'create' | 'edit'
  profile: Profile
  questionId?: string
  initialData?: QuestionFormData
  onSuccess?: (payload: QuestionFormData) => void
  onCancel?: () => void
}

const normalizeInitialValues = (initial?: QuestionFormData): QuestionFormValues => ({
  type: initial?.type || 'choice',
  content: initial?.content || '',
  answer: initial?.answer || '',
  analysis: initial?.analysis_content ?? initial?.analysis ?? '',
  optionA: initial?.options?.[0] || '',
  optionB: initial?.options?.[1] || '',
  optionC: initial?.options?.[2] || '',
  optionD: initial?.options?.[3] || '',
  difficulty: initial?.difficulty || 'medium',
  province: initial?.province || '',
  year: initial?.year ? String(initial.year) : '',
  source: initial?.source || '',
  is_public: initial?.is_public ?? true,
})

export function QuestionForm({
  mode,
  profile,
  questionId,
  initialData,
  onSuccess,
  onCancel,
}: QuestionFormProps) {
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialData?.type || 'choice'
  )
  const formInitialValues = useMemo(
    () => normalizeInitialValues(initialData),
    [initialData]
  )

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: formInitialValues,
  })
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<string[]>(
    initialData?.knowledge_points || []
  )
  const initialKey = initialData?.image_key || extractR2KeyFromUrl(initialData?.image_url)
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '')
  const [imageKey, setImageKey] = useState(initialKey || '')
  const [initialImageKey, setInitialImageKey] = useState(initialKey || '')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState<string[]>([])

  useEffect(() => {
    form.reset(formInitialValues)
    setQuestionType(initialData?.type || 'choice')
    setSelectedKnowledgePoints(initialData?.knowledge_points || [])
    setImageUrl(initialData?.image_url || '')
    const key = initialData?.image_key || extractR2KeyFromUrl(initialData?.image_url)
    setImageKey(key || '')
    setInitialImageKey(key || '')
    setPendingDeleteKeys([])
  }, [form, formInitialValues, initialData])

  const addPendingDeleteKey = (key: string) => {
    if (!key) return
    setPendingDeleteKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }

  const requestDeleteKey = async (key: string) => {
    if (!key) return
    await fetch('/api/files/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key })
    })
  }

  const handleImageUpload = async (result: { key: string; url: string }) => {
    try {
      if (imageKey) {
        if (mode === 'edit' && imageKey === initialImageKey) {
          addPendingDeleteKey(imageKey)
        } else {
          await requestDeleteKey(imageKey).catch(() => undefined)
        }
      }

      setImageUrl(result.url)
      setImageKey(result.key)
    } catch (error) {
      logger.error('Failed to handle image upload:', { error })
      toast.error('图片处理失败')
    }
  }

  const handleRemoveImage = async () => {
    if (!imageKey) {
      setImageUrl('')
      return
    }
    try {
      if (mode === 'edit' && imageKey === initialImageKey) {
        addPendingDeleteKey(imageKey)
      } else {
        await requestDeleteKey(imageKey).catch(() => undefined)
      }
      setImageUrl('')
      setImageKey('')
    } catch (error) {
      logger.error('Failed to remove image:', { error: error })
      toast.error('删除图片失败，请稍后再试')
    }
  }

  const toggleKnowledgePoint = (kp: string) => {
    setSelectedKnowledgePoints((prev) =>
      prev.includes(kp) ? prev.filter((item) => item !== kp) : [...prev, kp]
    )
  }

  const handleSubmit = async (values: QuestionFormValues) => {
    if (selectedKnowledgePoints.length === 0) {
      toast.error('请至少选择一个知识点')
      return
    }

    if (questionType === 'choice') {
      const validOptions = [
        values.optionA,
        values.optionB,
        values.optionC,
        values.optionD,
      ].filter((o) => o?.trim())
      if (validOptions.length < 2) {
        toast.error('选择题至少需要2个选项')
        return
      }
      if (!['A', 'B', 'C', 'D'].includes(values.answer)) {
        toast.error('请选择正确答案')
        return
      }
    }

    setSubmitting(true)

    try {
      const analysisValue = values.analysis?.trim() || null
      const baseData: any = {
        type: questionType,
        content: values.content.trim(),
        answer: values.answer.trim(),
        analysis_content: analysisValue,
        analysis: analysisValue,
        knowledge_points: selectedKnowledgePoints,
        difficulty: values.difficulty,
        province: values.province?.trim() || null,
        year: values.year ? Number(values.year) : null,
        source: values.source?.trim() || null,
        is_public: typeof values.is_public === 'boolean' ? values.is_public : true,
      }

      if (imageUrl) {
        baseData.image_url = imageUrl
      } else {
        baseData.image_url = null
      }

      if (questionType === 'choice') {
        baseData.options = [
          values.optionA,
          values.optionB,
          values.optionC,
          values.optionD,
        ].filter((o) => o?.trim())
      } else {
        baseData.options = null
      }

      if (typeof imageKey === 'string') {
        baseData.image_key = imageKey || null
      }

      const saveResult = async () => {
        if (mode === 'create') {
          baseData.created_by = profile.id
          const result = await supabase.from('questions').insert(baseData).select().single()
          if (result.error && baseData.image_key && result.error.message?.includes('image_key')) {
            const fallback = { ...baseData }
            delete fallback.image_key
            return supabase.from('questions').insert(fallback).select().single()
          }
          return result
        } else {
          if (!questionId) {
            throw new Error('缺少题目 ID，无法更新')
          }
          const result = await supabase
            .from('questions')
            .update({ ...baseData })
            .eq('id', questionId)
            .select()
            .single()
          if (result.error && 'image_key' in baseData && result.error.message?.includes('image_key')) {
            const fallback = { ...baseData }
            delete fallback.image_key
            return supabase
              .from('questions')
              .update(fallback)
              .eq('id', questionId)
              .select()
              .single()
          }
          return result
        }
      }

      const { data, error } = await saveResult()
      if (error) throw error

      toast.success(mode === 'create' ? '题目创建成功' : '题目更新成功')

      if (pendingDeleteKeys.length) {
        await Promise.all(
          pendingDeleteKeys.map((key) =>
            requestDeleteKey(key).catch(() => undefined)
          )
        )
      }

      if (onSuccess) {
        const payload =
          data ??
          ({
            ...baseData,
            id: mode === 'edit' ? questionId : undefined,
          } as QuestionFormData)
        onSuccess(payload)
      }
    } catch (error: any) {
      logger.error('Failed to submit question:', { error: error })
      toast.error(error.message || '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{mode === 'create' ? '新建题目' : '编辑题目'}</h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'create' ? '创建新的题目资源，支持选择题、填空题和解答题' : '更新题目信息，确保内容准确完整'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            返回
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">题型 *</label>
                <Select
                  value={questionType}
                  onValueChange={(value: QuestionType) => {
                    setQuestionType(value)
                    form.setValue('type', value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choice">选择题</SelectItem>
                    <SelectItem value="fill">填空题</SelectItem>
                    <SelectItem value="essay">解答题</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>题干 *</FormLabel>
                    <FormControl>
                      <Textarea rows={6} placeholder="请输入题干内容，支持 LaTeX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="analysis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>解析</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="可选，填写详细解析..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <label className="block text-sm font-medium">题目图片</label>
                  {imageUrl ? (
                    <div className="relative h-64">
                      <Image
                        src={imageUrl}
                        alt="题目图片"
                        fill
                        sizes="(max-width: 768px) 100vw, 600px"
                        className="rounded-lg border object-contain"
                      />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="absolute top-3 right-3"
                      onClick={handleRemoveImage}
                    >
                      删除图片
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    prefix={`questions/${mode === 'edit' ? questionId || 'editing' : 'temp'}`}
                    onUpload={handleImageUpload}
                    uploading={uploading}
                    buttonText={uploading ? '上传中...' : '上传图片'}
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  支持 JPG、PNG、GIF 格式，建议大小不超过 2MB
                </p>
              </div>

              {questionType === 'choice' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium">选项 *</label>
                  {['A', 'B', 'C', 'D'].map((label) => (
                    <FormField
                      key={label}
                      control={form.control}
                      name={`option${label}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'}
                      render={({ field }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <Input
                              placeholder={`选项${label}`}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                  <p className="text-xs text-muted-foreground">至少填写 2 个选项</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>答案 *</FormLabel>
                    <FormControl>
                      {questionType === 'choice' ? (
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                          {['A', 'B', 'C', 'D'].map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`answer-${option}`} />
                              <Label htmlFor={`answer-${option}`}>{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <Textarea rows={3} placeholder="请输入标准答案..." {...field} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>难度 *</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="easy" id="difficulty-easy" />
                          <Label htmlFor="difficulty-easy" className="flex items-center cursor-pointer">
                            <Badge variant="default" className="bg-green-500">简单</Badge>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="difficulty-medium" />
                          <Label htmlFor="difficulty-medium" className="flex items-center cursor-pointer">
                            <Badge variant="default" className="bg-yellow-500">中等</Badge>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hard" id="difficulty-hard" />
                          <Label htmlFor="difficulty-hard" className="flex items-center cursor-pointer">
                            <Badge variant="default" className="bg-red-500">困难</Badge>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年份</FormLabel>
                      <FormControl>
                        <Input placeholder="如：2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>省份</FormLabel>
                      <FormControl>
                        <Input placeholder="如：SICHUAN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>来源</FormLabel>
                      <FormControl>
                        <Input placeholder="如：2024年四川中考" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>可见性</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value ? 'true' : 'false'} onValueChange={(val) => field.onChange(val === 'true')}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="visibility-public" />
                            <Label htmlFor="visibility-public">公开</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="visibility-private" />
                            <Label htmlFor="visibility-private">仅自己可见</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">
                  知识点 * (至少选择一个)
                </label>
                <div className="max-h-96 overflow-y-auto border rounded-lg p-3 space-y-1">
                  {KNOWLEDGE_POINTS.map((kp) => (
                    <label
                      key={kp}
                      className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKnowledgePoints.includes(kp)}
                        onChange={() => toggleKnowledgePoint(kp)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">{kp}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedKnowledgePoints.map((kp) => (
                    <Badge key={kp} variant="outline">
                      {kp}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => toggleKnowledgePoint(kp)}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  已选择 {selectedKnowledgePoints.length} 个知识点
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t">
            <Button type="submit" size="lg" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? '保存中...' : '保存题目'}
            </Button>
            <Button variant="outline" size="lg" onClick={onCancel}>
              取消
            </Button>
          </div>
          </form>
        </Form>
      </Card>
    </div>
  )
}
