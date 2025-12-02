"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'
import { logger } from '@/lib/logger'
import {
  Plus,
  Filter,
  Search as SearchIcon,
  Trash2,
  Download,
  UploadCloud,
  ShoppingBasket,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import type { Profile, Question } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { QuestionBasketDrawer } from '@/components/questions/question-basket-drawer'
import { useQuestionBasketStore } from '@/stores/questionBasketStore'

type QuestionRecord = Question & {
  knowledge_points?: string[]
  tags?: string[]
  image_url?: string | null
  analysis_content?: string | null
  is_public?: boolean
}

const SEARCH_HISTORY_KEY = 'rixin-question-search-history'

const allowedImportColumns = ['content', 'answer', 'type', 'difficulty', 'knowledge_points']

interface ExportTask {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  download_url?: string | null
  error_message?: string | null
  created_at?: string
  completed_at?: string | null
}

export default function QuestionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ type?: string; difficulty?: string }>({})
  const [searchText, setSearchText] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [basketOpen, setBasketOpen] = useState(false)
  const [exportTask, setExportTask] = useState<ExportTask | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const addToBasket = useQuestionBasketStore((state) => state.addQuestion)
  const hasQuestionInBasket = useQuestionBasketStore((state) => state.hasQuestion)
  const basketCount = useQuestionBasketStore((state) => state.questions.length)
  const basketQuestions = useQuestionBasketStore((state) => state.questions)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SEARCH_HISTORY_KEY) : null
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored))
      } catch {
        setSearchHistory([])
      }
    }
  }, [])

  useEffect(() => {
    const mountedRef = { current: true }

    const loadProfileAsync = async () => {
      try {
        const data = await getCurrentProfile()
        if (!mountedRef.current) return

        if (!data || data.role !== 'teacher') {
          router.push('/')
          return
        }
        setProfile(data)
      } catch (error) {
        if (!mountedRef.current) return
        logger.error('Failed to load profile:', { error: error })
        router.push('/login')
      }
    }

    loadProfileAsync()

    return () => {
      mountedRef.current = false
    }
  }, [router])

  useEffect(() => {
    const mountedRef = { current: true }

    const loadQuestionsAsync = async () => {
      if (!profile) return
      setLoading(true)
      try {
        let query = supabase.from('questions').select('*').order('created_at', { ascending: false })

        if (filter.type) {
          query = query.eq('type', filter.type)
        }
        if (filter.difficulty) {
          query = query.eq('difficulty', filter.difficulty)
        }
        if (searchText.trim()) {
          // 清理搜索关键词：移除所有特殊字符，只保留字母、数字、中文和空格
          const keyword = searchText.trim().replace(/[^\w\s\u4e00-\u9fa5]/g, '')
          if (keyword) {
            // 使用 Supabase 的参数化查询，避免注入风险
            query = query.or(`content.ilike.%${keyword}%,answer.ilike.%${keyword}%`)
          }
        }

        const { data, error } = await query
        if (!mountedRef.current) return

        if (error) throw error
        setQuestions((data as QuestionRecord[]) || [])
      } catch (error) {
        if (!mountedRef.current) return
        logger.error('Failed to load questions:', { error: error })
        toast({
          title: '加载失败',
          description: '加载题目失败',
          variant: 'destructive',
        })
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadQuestionsAsync()

    return () => {
      mountedRef.current = false
    }
  }, [profile, filter, searchText])

  useEffect(() => {
    if (!exportTask || ['COMPLETED', 'FAILED'].includes(exportTask.status)) return
    const mountedRef = { current: true }

    const timer = setInterval(async () => {
      try {
        const updated = await fetchExportTaskStatus(exportTask.id)
        if (!mountedRef.current) return

        if (updated) {
          setExportTask(updated)
        } else {
          setExportTask(null)
        }
      } catch (error) {
        if (!mountedRef.current) return
        logger.error('轮询导出任务失败', { error: error })
        toast({
          title: '查询失败',
          description: error instanceof Error ? error.message : '查询导出任务失败',
          variant: 'destructive',
        })
        setExportTask(null)
      }
    }, 4000)

    return () => {
      mountedRef.current = false
      clearInterval(timer)
    }
  }, [exportTask?.id, exportTask?.status])

  useEffect(() => {
    if (!exportTask) return
    if (exportTask.status === 'COMPLETED') {
      toast({
        title: '导出完成',
        description: '可在题篮中下载文件',
      })
    }
    if (exportTask.status === 'FAILED') {
      toast({
        title: '导出失败',
        description: exportTask.error_message || '导出失败，请稍后重试',
        variant: 'destructive',
      })
    }
  }, [exportTask?.status, toast])

  const questionMap = useMemo(() => {
    const map = new Map<string, QuestionRecord>()
    questions.forEach((q) => map.set(String(q.id), q))
    return map
  }, [questions])

  const loadQuestions = async () => {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase.from('questions').select('*').order('created_at', { ascending: false })

      if (filter.type) {
        query = query.eq('type', filter.type)
      }
      if (filter.difficulty) {
        query = query.eq('difficulty', filter.difficulty)
      }
      if (searchText.trim()) {
        const keyword = searchText.trim().replace(/[%_]/g, '')
        query = query.or(`content.ilike.%${keyword}%,answer.ilike.%${keyword}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setQuestions((data as QuestionRecord[]) || [])
    } catch (error) {
      logger.error('Failed to load questions:', { error: error })
      toast({
        title: '加载失败',
        description: '加载题目失败',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSearchHistory = (term: string) => {
    const normalized = term.trim()
    if (!normalized) return
    setSearchHistory((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 5)
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }

  const highlightMatch = useCallback((text: string) => {
    if (!searchText.trim()) return text
    const keyword = searchText.trim()
    try {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const parts = text.split(regex)
      return parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <mark key={`${part}-${idx}`} className="px-0.5 bg-yellow-200">
            {part}
          </mark>
        ) : (
          part
        )
      )
    } catch {
      return text
    }
  }, [searchText])

  const getAccessToken = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      throw new Error('未找到登录凭证')
    }
    return token
  }

  const handleAddToBasketAction = useCallback((record: QuestionRecord) => {
    const id = String(record.id)
    if (hasQuestionInBasket(id)) {
      toast({
        title: '提示',
        description: '题目已在题篮中',
      })
      return
    }
    addToBasket({
      id,
      content: record.content,
      type: (record.type as any) || 'choice',
      difficulty: (record.difficulty as any) || 'medium',
      knowledge_points: record.knowledge_points || [],
    })
    toast({
      title: '成功',
      description: '已加入题篮',
    })
  }, [hasQuestionInBasket, addToBasket, toast])

const fetchExportTaskStatus = async (taskId: string) => {
    const token = await getAccessToken()
    const res = await fetch(`/api/export-tasks/status?taskId=${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 404) {
      return null
    }
    if (!res.ok) {
      throw new Error(data.error || '查询导出任务失败')
    }
    return data.task as ExportTask
  }

  const handleStartBuildFromBasket = useCallback(() => {
    if (!basketQuestions.length) {
      toast({
        title: '提示',
        description: '题篮为空',
        variant: 'destructive',
      })
      return
    }
    try {
      window.localStorage.setItem('rixin-basket-snapshot', JSON.stringify(basketQuestions))
    } catch (error) {
      logger.warn('题篮快照写入失败', { error: error })
    }
    setBasketOpen(false)
    router.push('/papers/create?source=basket')
  }, [basketQuestions, router, toast])

  const handleExportFromBasket = useCallback(async () => {
    if (!basketQuestions.length) {
      toast({
        title: '提示',
        description: '题篮为空',
        variant: 'destructive',
      })
      return
    }
    setExportLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/export-tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionIds: basketQuestions.map((q) => String(q.id)).filter(Boolean),
          format: 'pdf',
          templateId: 'basket_default',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || '创建导出任务失败')
      }
      setExportTask(data.task as ExportTask)
      toast({
        title: '成功',
        description: '导出任务已创建',
      })
      setBasketOpen(true)
    } catch (error: any) {
      logger.error('创建导出任务失败:', { error: error })
      toast({
        title: '创建失败',
        description: error?.message || '创建导出任务失败',
        variant: 'destructive',
      })
    } finally {
      setExportLoading(false)
    }
  }, [basketQuestions, toast])

  const callDeleteApi = useCallback(async (ids: string[], mode: 'soft' | 'hard') => {
    const token = await getAccessToken()
    for (const id of ids) {
      const record = questionMap.get(id)
      const payload = {
        questionId: id,
        hard: mode === 'hard',
        deleteAssets: mode === 'hard',
        imageUrls: record?.image_url ? [record.image_url] : undefined,
      }
      const res = await fetch('/api/questions/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '删除失败')
      }
    }
  }, [questionMap])

  const handleDelete = useCallback((id: string) => {
    setSelectedRowKeys([id])
    setDeleteMode('soft')
    setDeleteModalOpen(true)
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (!selectedRowKeys.length) {
      toast({
        title: '提示',
        description: '请选择题目',
        variant: 'destructive',
      })
      return
    }
    setBulkLoading(true)
    try {
      await callDeleteApi(selectedRowKeys.map(String), deleteMode)
      toast({
        title: '成功',
        description: deleteMode === 'hard' ? '已硬删除所选题目' : '所选题目已软删除',
      })
      setSelectedRowKeys([])
      setDeleteModalOpen(false)
      void loadQuestions()
    } catch (error: any) {
      logger.error('Error occurred', { error: error })
      toast({
        title: '删除失败',
        description: error.message || '批量删除失败',
        variant: 'destructive',
      })
    } finally {
      setBulkLoading(false)
    }
  }, [selectedRowKeys, deleteMode, callDeleteApi, toast])

  const handleBulkExport = useCallback((format: 'csv' | 'json') => {
    if (!selectedRowKeys.length) {
      toast({
        title: '提示',
        description: '请选择题目',
        variant: 'destructive',
      })
      return
    }
    const rows = selectedRowKeys
      .map((key) => questionMap.get(String(key)))
      .filter((item): item is QuestionRecord => Boolean(item))

    if (!rows.length) {
      toast({
        title: '提示',
        description: '未找到可导出的题目',
        variant: 'destructive',
      })
      return
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' })
      triggerDownload(blob, 'questions-export.json')
    } else {
      const header = ['内容', '答案', '题型', '难度', '知识点']
      const csv = [
        header.join(','),
        ...rows.map((row) => [
          wrapCsv(row.content || ''),
          wrapCsv(row.answer || ''),
          wrapCsv(row.type),
          wrapCsv(row.difficulty),
          wrapCsv((row.knowledge_points || []).join(';')),
        ].join(',')),
      ].join('\n')
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'questions-export.csv')
    }
    toast({
      title: '导出成功',
      description: `已导出 ${rows.length} 道题目`,
    })
  }, [selectedRowKeys, questionMap, toast])

  const handleBulkImport = useCallback(async (file: File) => {
    if (!profile) {
      toast({
        title: '错误',
        description: '请先登录',
        variant: 'destructive',
      })
      return
    }

    if (!file.name.endsWith('.csv')) {
      toast({
        title: '错误',
        description: '请上传 CSV 文件',
        variant: 'destructive',
      })
      return
    }

    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (!rows.length) {
        toast({
          title: '提示',
          description: '未解析到题目',
          variant: 'destructive',
        })
        return
      }

      const payload = rows.slice(0, 100).map((row) => ({
        content: row.content,
        answer: row.answer,
        type: row.type || 'choice',
        difficulty: row.difficulty || 'medium',
        knowledge_points: row.knowledge_points ? row.knowledge_points.split(';').map((kp) => kp.trim()).filter(Boolean) : [],
        created_by: profile.id,
      }))

      const { error } = await supabase.from('questions').insert(payload)
      if (error) throw error

      toast({
        title: '导入成功',
        description: `成功导入 ${payload.length} 道题目`,
      })
      void loadQuestions()
    } catch (error: any) {
      logger.error('导入失败:', { error: error })
      toast({
        title: '导入失败',
        description: error.message || '导入失败',
        variant: 'destructive',
      })
    }
  }, [profile, toast])

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 计算分页数据
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return questions.slice(start, end)
  }, [questions, currentPage, pageSize])

  const totalPages = Math.ceil(questions.length / pageSize)

  // 处理全选
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(paginatedQuestions.map(q => String(q.id)))
    } else {
      setSelectedRowKeys([])
    }
  }, [paginatedQuestions])

  // 处理单选
  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(prev => [...prev, id])
    } else {
      setSelectedRowKeys(prev => prev.filter(key => key !== id))
    }
  }, [])

  // 检查是否全选
  const isAllSelected = paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedRowKeys.includes(String(q.id)))
  const isSomeSelected = paginatedQuestions.some(q => selectedRowKeys.includes(String(q.id)))

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">题库管理</h1>
          <p className="text-muted-foreground mt-1">管理题目、搜索高亮，并批量处理导入/导出</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tools/ingest">
            <Button variant="outline" size="lg">
              开始录题
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setBasketOpen(true)}
            data-testid="basket-open-btn"
          >
            <ShoppingBasket className="mr-2 h-4 w-4" />
            题篮 ({basketCount})
          </Button>
          <Link href="/questions/create">
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              新建题目
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">筛选条件</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-40">
              <Select
                value={filter.type || 'all'}
                onValueChange={(value) => setFilter((prev) => ({ ...prev, type: value === 'all' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部题型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部题型</SelectItem>
                  <SelectItem value="choice">选择题</SelectItem>
                  <SelectItem value="fill">填空题</SelectItem>
                  <SelectItem value="essay">解答题</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={filter.difficulty || 'all'}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, difficulty: value === 'all' ? undefined : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filter.type || filter.difficulty) && (
              <Button variant="outline" size="sm" onClick={() => setFilter({})}>
                清除筛选
              </Button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-64">
              <Input
                placeholder="全文搜索题干/答案"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateSearchHistory(searchText)
                    void loadQuestions()
                  }
                }}
                className="pr-16"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (searchText.trim()) {
                  updateSearchHistory(searchText)
                }
                void loadQuestions()
              }}
            >
              搜索
            </Button>
          </div>
        </div>

        {searchHistory.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">历史搜索:</span>
            {searchHistory.map((keyword) => (
              <button
                key={keyword}
                className="rounded-full border px-3 py-1 hover:bg-background-secondary transition"
                onClick={() => {
                  setSearchText(keyword)
                  void loadQuestions()
                }}
              >
                {keyword}
              </button>
            ))}
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={() => {
                window.localStorage.removeItem(SEARCH_HISTORY_KEY)
                setSearchHistory([])
              }}
            >
              清空
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedRowKeys.length}
            onClick={() => {
              setDeleteMode('soft')
              setDeleteModalOpen(true)
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            批量删除
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedRowKeys.length}
            onClick={() => handleBulkExport('csv')}
          >
            <Download className="mr-1 h-4 w-4" />
            导出 CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedRowKeys.length}
            onClick={() => handleBulkExport('json')}
          >
            <Download className="mr-1 h-4 w-4" />
            导出 JSON
          </Button>
          <label>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  void handleBulkImport(file)
                  e.target.value = ''
                }
              }}
            />
            <Button variant="outline" size="sm" asChild>
              <span className="cursor-pointer">
                <UploadCloud className="mr-1 h-4 w-4" />
                批量导入
              </span>
            </Button>
          </label>
          <span className="text-xs text-muted-foreground">
            已选 {selectedRowKeys.length} / 共 {questions.length}
          </span>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-4">暂无题目</p>
            <Link href="/questions/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                创建第一道题目
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="全选"
                      />
                    </TableHead>
                    <TableHead>题干</TableHead>
                    <TableHead className="w-24">题型</TableHead>
                    <TableHead className="w-24">难度</TableHead>
                    <TableHead className="w-48">知识点</TableHead>
                    <TableHead className="w-80">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRowKeys.includes(String(question.id))}
                          onCheckedChange={(checked) => handleSelectRow(String(question.id), checked as boolean)}
                          aria-label={`选择题目 ${question.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="line-clamp-2 text-sm text-foreground/90">
                          {highlightMatch(question.content || '')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDifficultyVariant(question.difficulty)}>
                          {getDifficultyLabel(question.difficulty)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {question.knowledge_points?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {question.knowledge_points.slice(0, 3).map((kp) => (
                              <Badge key={kp} variant="outline">
                                {kp}
                              </Badge>
                            ))}
                            {question.knowledge_points.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{question.knowledge_points.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">未关联</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/questions/${question.id}`}>
                            <Button variant="outline" size="sm">
                              查看
                            </Button>
                          </Link>
                          <Link href={`/questions/${question.id}/edit`}>
                            <Button variant="outline" size="sm">
                              编辑
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddToBasketAction(question)}
                            disabled={hasQuestionInBasket(String(question.id))}
                          >
                            {hasQuestionInBasket(String(question.id)) ? '已在题篮' : '加入题篮'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(String(question.id))}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 分页控件 */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                共 {questions.length} 道题目，第 {currentPage} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 条/页</SelectItem>
                      <SelectItem value="20">20 条/页</SelectItem>
                      <SelectItem value="50">50 条/页</SelectItem>
                      <SelectItem value="100">100 条/页</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除题目</DialogTitle>
            <DialogDescription>
              软删除会将题目设置为私有并保留数据；硬删除会彻底清除题目及图片。
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={deleteMode} onValueChange={(value) => setDeleteMode(value as 'soft' | 'hard')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="soft" id="soft" />
              <Label htmlFor="soft">软删除（可恢复）</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hard" id="hard" />
              <Label htmlFor="hard">硬删除（不可恢复）</Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={bulkLoading}
            >
              取消
            </Button>
            <Button
              variant={deleteMode === 'hard' ? 'destructive' : 'default'}
              onClick={handleBulkDelete}
              disabled={bulkLoading}
            >
              {bulkLoading ? '删除中...' : (deleteMode === 'hard' ? '硬删除' : '软删除')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuestionBasketDrawer
        open={basketOpen}
        onClose={() => setBasketOpen(false)}
        onStartBuild={handleStartBuildFromBasket}
        onExport={handleExportFromBasket}
        exportLoading={exportLoading}
        exportTask={exportTask || undefined}
      />
    </div>
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function wrapCsv(value: string | undefined) {
  const safe = value ?? ''
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (allowedImportColumns.includes(header)) {
        row[header] = cells[index]?.trim() || ''
      }
    })
    return row
  }).filter((row) => row.content)
}

function splitCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    choice: '选择题',
    fill: '填空题',
    essay: '解答题',
  }
  return labels[type] || type
}

function getDifficultyLabel(level: string) {
  const labels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  }
  return labels[level] || level
}

function getDifficultyVariant(level: string): 'success' | 'warning' | 'error' | 'default' {
  const variants: Record<string, 'success' | 'warning' | 'error'> = {
    easy: 'success',
    medium: 'warning',
    hard: 'error',
  }
  return variants[level] || 'default'
}
