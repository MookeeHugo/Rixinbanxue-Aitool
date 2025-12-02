"use client"

import { useEffect, useMemo, useState } from 'react'
import { Form, Input, Radio, Upload, message as antMessage } from 'antd'
import type { UploadFile } from 'antd'
import { Save, Upload as UploadIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface QuestionFormValues {
  type: QuestionType
  content: string
  answer: string
  analysis?: string
  optionA?: string
  optionB?: string
  optionC?: string
  optionD?: string
  difficulty: 'easy' | 'medium' | 'hard'
  province?: string
  year?: string
  source?: string
  is_public?: boolean
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
  const [form] = Form.useForm<QuestionFormValues>()
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialData?.type || 'choice'
  )
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

  const formInitialValues = useMemo(
    () => normalizeInitialValues(initialData),
    [initialData]
  )

  useEffect(() => {
    form.setFieldsValue(formInitialValues)
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

  const uploadImageThroughApi = async (file: File) => {
    const prefix = `questions/${mode === 'edit' ? questionId || 'editing' : 'temp'}`
    const formData = new FormData()
    formData.append('file', file)
    formData.append('prefix', prefix)
    formData.append('access', 'public')

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
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

  const handleImageUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      antMessage.error('仅支持 JPG/PNG/GIF/WebP 图片')
      return Upload.LIST_IGNORE
    }
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      antMessage.error('图片大小需小于 2MB')
      return Upload.LIST_IGNORE
    }
    try {
      setUploading(true)

      if (imageKey) {
        if (mode === 'edit' && imageKey === initialImageKey) {
          addPendingDeleteKey(imageKey)
        } else {
          await requestDeleteKey(imageKey).catch(() => undefined)
        }
      }

      const uploaded = await uploadImageThroughApi(file)
      setImageUrl(uploaded.url)
      setImageKey(uploaded.key)
      antMessage.success('图片上传成功')
      return false
    } catch (error) {
      logger.error('Failed to upload image:', { error: error })
      antMessage.error('图片上传失败')
      return false
    } finally {
      setUploading(false)
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
      antMessage.error('删除图片失败，请稍后再试')
    }
  }

  const toggleKnowledgePoint = (kp: string) => {
    setSelectedKnowledgePoints((prev) =>
      prev.includes(kp) ? prev.filter((item) => item !== kp) : [...prev, kp]
    )
  }

  const handleSubmit = async (values: QuestionFormValues) => {
    if (selectedKnowledgePoints.length === 0) {
      antMessage.error('请至少选择一个知识点')
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
        antMessage.error('选择题至少需要2个选项')
        return
      }
      if (!['A', 'B', 'C', 'D'].includes(values.answer)) {
        antMessage.error('请选择正确答案')
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

      antMessage.success(mode === 'create' ? '题目创建成功' : '题目更新成功')

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
      antMessage.error(error.message || '保存失败，请稍后重试')
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={formInitialValues}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">题型 *</label>
                <Select
                  value={questionType}
                  onValueChange={(value: QuestionType) => {
                    setQuestionType(value)
                    form.setFieldsValue({ type: value })
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

              <Form.Item
                label="题干"
                name="content"
                rules={[{ required: true, message: '请输入题干' }]}
              >
                <Input.TextArea rows={6} placeholder="请输入题干内容，支持 LaTeX" />
              </Form.Item>

              <Form.Item label="解析" name="analysis">
                <Input.TextArea rows={4} placeholder="可选，填写详细解析..." />
              </Form.Item>

              <div className="space-y-3">
                <label className="block text-sm font-medium">题目图片</label>
                {imageUrl ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="题目图片"
                      className="rounded-lg border object-contain max-h-64"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-3 right-3"
                      onClick={handleRemoveImage}
                    >
                      删除图片
                    </Button>
                  </div>
                ) : (
                  <Upload
                    showUploadList={false}
                    beforeUpload={handleImageUpload}
                    maxCount={1}
                  >
                    <Button variant="outline">
                      <UploadIcon className="mr-2 h-4 w-4" />
                      {uploading ? '上传中...' : '上传图片'}
                    </Button>
                  </Upload>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  支持 JPG、PNG、GIF 格式，建议大小不超过 2MB
                </p>
              </div>

              {questionType === 'choice' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium">选项 *</label>
                  {['A', 'B', 'C', 'D'].map((label) => (
                    <Form.Item key={label} name={`option${label}`} className="mb-0">
                      <Input
                        prefix={<span className="font-medium mr-2">{label}.</span>}
                        placeholder={`选项${label}`}
                      />
                    </Form.Item>
                  ))}
                  <p className="text-xs text-muted-foreground">至少填写 2 个选项</p>
                </div>
              )}

              <Form.Item
                label="答案"
                name="answer"
                rules={[{ required: true, message: '请输入答案' }]}
              >
                {questionType === 'choice' ? (
                  <Radio.Group className="flex gap-4">
                    <Radio value="A">A</Radio>
                    <Radio value="B">B</Radio>
                    <Radio value="C">C</Radio>
                    <Radio value="D">D</Radio>
                  </Radio.Group>
                ) : (
                  <Input.TextArea rows={3} placeholder="请输入标准答案..." />
                )}
              </Form.Item>
            </div>

            <div className="space-y-6">
              <Form.Item
                label="难度"
                name="difficulty"
                rules={[{ required: true }]}
              >
                <Radio.Group className="flex flex-col gap-2">
                  <Radio value="easy">
                    <Badge variant="default" className="bg-green-500">简单</Badge>
                  </Radio>
                  <Radio value="medium">
                    <Badge variant="default" className="bg-yellow-500">中等</Badge>
                  </Radio>
                  <Radio value="hard">
                    <Badge variant="default" className="bg-red-500">困难</Badge>
                  </Radio>
                </Radio.Group>
              </Form.Item>

              <div className="space-y-3">
                <Form.Item label="年份" name="year">
                  <Input placeholder="如：2024" />
                </Form.Item>
                <Form.Item label="省份" name="province">
                  <Input placeholder="如：SICHUAN" />
                </Form.Item>
                <Form.Item label="来源" name="source">
                  <Input placeholder="如：2024年四川中考" />
                </Form.Item>
                <Form.Item label="可见性" name="is_public">
                  <Radio.Group>
                    <Radio value={true}>公开</Radio>
                    <Radio value={false}>仅自己可见</Radio>
                  </Radio.Group>
                </Form.Item>
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
        </Form>
      </Card>
    </div>
  )
}
