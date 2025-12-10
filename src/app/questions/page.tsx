
"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'
import {
  Plus,
  Search as SearchIcon,
  Trash2,
  Download,
  UploadCloud,
  ShoppingBasket,
} from 'lucide-react'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import type { Profile, Question } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { LibraryStats } from '@/components/questions/library-stats'
import { LibraryFilters, type QuestionLibraryFilters } from '@/components/questions/library-filters'
import { QuestionLibraryCard, type QuestionLibraryCardData } from '@/components/questions/question-library-card'

type QuestionRecord = Question & {
  knowledge_points?: string[]
  tags?: string[]
  image_url?: string | null
  analysis_content?: string | null
  is_public?: boolean
}

interface ExportTask {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  download_url?: string | null
  error_message?: string | null
  created_at?: string
  completed_at?: string | null
}

interface LibraryStatsState {
  weekly: number
  reviewed: number
  pending: number
}

const SEARCH_HISTORY_KEY = 'rixin-question-search-history'
const allowedImportColumns = ['content', 'answer', 'type', 'difficulty', 'knowledge_points']

export default function QuestionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [libraryFilters, setLibraryFilters] = useState<QuestionLibraryFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<QuestionLibraryFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [basketOpen, setBasketOpen] = useState(false)
  const [exportTask, setExportTask] = useState<ExportTask | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [stats, setStats] = useState<LibraryStatsState>({ weekly: 0, reviewed: 0, pending: 0 })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
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
        logger.error('加载用户信息失败', { error })
        router.push('/login')
      }
    }

    loadProfileAsync()

    return () => {
      mountedRef.current = false
    }
  }, [router])

  const loadQuestions = useCallback(async (nextFilters?: QuestionLibraryFilters) => {
    if (!profile) return
    setLoading(true)
    const filters = nextFilters ?? appliedFilters

    try {
      let query = supabase.from('questions').select('*').order('created_at', { ascending: false })

      if (filters.type?.length) {
        query = query.in('type', filters.type)
      }
      if (filters.difficulty?.length) {
        query = query.in('difficulty', filters.difficulty)
      }
      if (filters.knowledge?.length) {
        query = query.contains('knowledge_points', filters.knowledge)
      }
      if (searchText.trim()) {
        const keyword = searchText.trim().replace(/[^\w\s\u4e00-\u9fa5]/g, '')
        if (keyword) {
          query = query.or(`content.ilike.%${keyword}%,answer.ilike.%${keyword}%`)
        }
      }

      const { data, error } = await query
      if (error) throw error
      const result = (data as QuestionRecord[]) || []
      const filteredResult = applyInMemoryFilters(result, filters)
      setQuestions(filteredResult)
      setCurrentPage(1)
    } catch (error) {
      logger.error('加载题库失败', { error })
      toast({
        title: '加载失败',
        description: '请稍后重试或检查网络',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [profile, appliedFilters, searchText, toast])

  useEffect(() => {
    if (!profile) return
    void loadQuestions()
  }, [profile, loadQuestions])

  useEffect(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    let weekly = 0
    let reviewed = 0

    questions.forEach((question) => {
      if (question.created_at) {
        const created = new Date(question.created_at).getTime()
        if (!Number.isNaN(created) && created >= weekAgo) {
          weekly++
        }
      }
      if (question.is_public) {
        reviewed++
      }
    })

    setStats({
      weekly,
      reviewed,
      pending: Math.max(questions.length - reviewed, 0),
    })
  }, [questions])

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
        logger.error('杞瀵煎嚭浠诲姟澶辫触', { error })
        toast({
          title: '鏌ヨ澶辫触',
          description: error instanceof Error ? error.message : '鏌ヨ瀵煎嚭浠诲姟澶辫触',
          variant: 'destructive',
        })
        setExportTask(null)
      }
    }, 4000)

    return () => {
      mountedRef.current = false
      clearInterval(timer)
    }
  }, [exportTask, toast])

  useEffect(() => {
    if (!exportTask) return
        if (exportTask.status === 'COMPLETED') {
      toast({
        title: '导出完成',
        description: '可在题库中下载文件',
      })
    }
    if (exportTask.status === 'FAILED') {
      toast({
        title: '导出失败',
        description: exportTask.error_message || '导出失败，请稍后重试',
        variant: 'destructive',
      })
    }
  }, [exportTask, toast])

  const questionMap = useMemo(() => {
    const map = new Map<string, QuestionRecord>()
    questions.forEach((q) => map.set(String(q.id), q))
    return map
  }, [questions])

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return questions.slice(start, end)
  }, [questions, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize))

  const updateSearchHistory = (term: string) => {
    const normalized = term.trim()
    if (!normalized) return
    setSearchHistory((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 5)
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
      return next
    })
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
      title: '提示',
      description: '已加入题篮',
    })
  }, [addToBasket, hasQuestionInBasket, toast])

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
      logger.warn('保存题篮快照失败', { error })
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
        throw new Error(data.error || '导出任务创建失败')
      }
      setExportTask(data.task as ExportTask)
      toast({
        title: '导出任务已创建',
        description: '请等待生成完成',
      })
      setBasketOpen(true)
    } catch (error: any) {
      logger.error('导出任务创建失败', { error })
      toast({
        title: '创建失败',
        description: error?.message || '导出任务创建失败',
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
        description: '请先选择题目',
        variant: 'destructive',
      })
      return
    }
    setBulkLoading(true)
    try {
      await callDeleteApi(selectedRowKeys.map(String), deleteMode)
      toast({
        title: '删除成功',
        description: deleteMode === 'hard' ? '已硬删除所选题目' : '已软删除所选题目',
      })
      setSelectedRowKeys([])
      setDeleteModalOpen(false)
      void loadQuestions()
    } catch (error: any) {
      logger.error('批量删除失败', { error })
      toast({
        title: '删除失败',
        description: error.message || '批量删除失败',
        variant: 'destructive',
      })
    } finally {
      setBulkLoading(false)
    }
  }, [selectedRowKeys, deleteMode, callDeleteApi, loadQuestions, toast])

  const handleBulkExport = useCallback((format: 'csv' | 'json') => {
    if (!selectedRowKeys.length) {
      toast({
        title: '提示',
        description: '请先选择题目',
        variant: 'destructive',
      })
      return
    }
    const rows = selectedRowKeys
      .map((key) => questionMap.get(String(key)))
      .filter((item): item is QuestionRecord => Boolean(item))

    if (!rows.length) {
      toast({
        title: '导出失败',
        description: '未找到可导出的题目',
        variant: 'destructive',
      })
      return
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' })
      triggerDownload(blob, 'questions-export.json')
    } else {
      const header = ['题干', '答案', '题型', '难度', '知识点']
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
  }, [questionMap, selectedRowKeys, toast])

  const handleBulkImport = useCallback(async (file: File) => {
    if (!profile) {
      toast({
        title: '提示',
        description: '请先登录',
        variant: 'destructive',
      })
      return
    }

    if (!file.name.endsWith('.csv')) {
      toast({
        title: '格式错误',
        description: '仅支持 CSV 文件',
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
          description: '未读取到数据',
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
        description: `已导入 ${payload.length} 道题目`,
      })
      void loadQuestions()
    } catch (error: any) {
      logger.error('导入失败', { error })
      toast({
        title: '导入失败',
        description: error.message || '导入失败',
        variant: 'destructive',
      })
    }
  }, [profile, toast, loadQuestions])

  const handleSelectAll = useCallback((checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedRowKeys(paginatedQuestions.map((q) => String(q.id)))
    } else {
      setSelectedRowKeys([])
    }
  }, [paginatedQuestions])

  const handleSelectRow = useCallback((id: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedRowKeys((prev) => (prev.includes(id) ? prev : [...prev, id]))
    } else {
      setSelectedRowKeys((prev) => prev.filter((key) => key !== id))
    }
  }, [])

  const isAllSelected = paginatedQuestions.length > 0 && paginatedQuestions.every((q) => selectedRowKeys.includes(String(q.id)))
  const isSomeSelected = paginatedQuestions.some((q) => selectedRowKeys.includes(String(q.id)))

  const handleApplyFilters = (value: QuestionLibraryFilters) => {
    setLibraryFilters(value)
    setAppliedFilters(value)
    void loadQuestions(value)
  }

  const handleResetFilters = () => {
    setLibraryFilters({})
    setAppliedFilters({})
    void loadQuestions({})
  }

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
          <p className="text-muted-foreground mt-1">查看、筛选、导出/导入题目</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tools/ingest">
            <Button variant="outline" size="lg">
              批量导入
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

      <div className="grid gap-4 xl:grid-cols-[3fr,2fr]">
        <div>
          <LibraryStats
            totalQuestions={questions.length}
            weeklyIncrease={stats.weekly}
            reviewedCount={stats.reviewed}
            pendingReviewCount={stats.pending}
          />
        </div>
        <Card className="p-5">
          <LibraryFilters
            value={libraryFilters}
            onChange={setLibraryFilters}
            onReset={handleResetFilters}
            onApply={handleApplyFilters}
          />
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Input
              placeholder="搜索题干/答案"
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

        {searchHistory.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">最近搜索:</span>
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
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
              onCheckedChange={handleSelectAll}
              aria-label="全选"
            />
            <span className="text-xs text-muted-foreground">全选</span>
          </div>
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
            删除选中
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
                导入 CSV
              </span>
            </Button>
          </label>
          <span className="text-xs text-muted-foreground">
            已选 {selectedRowKeys.length} / 共 {questions.length}
          </span>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
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
                去创建题目
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedQuestions.map((question) => {
                const cardData = toLibraryCardData(question)
                return (
                  <QuestionLibraryCard
                    key={question.id}
                    question={cardData}
                    isSelected={selectedRowKeys.includes(String(question.id))}
                    onToggle={(checked) => handleSelectRow(String(question.id), checked)}
                    onView={() => router.push(`/questions/${question.id}`)}
                    onEdit={() => router.push(`/questions/${question.id}/edit`)}
                    onDuplicate={() => handleAddToBasketAction(question)}
                    onDelete={() => handleDelete(String(question.id))}
                  />
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {questions.length} 道题，第 {currentPage} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
              请选择删除方式：软删除仅隐藏题目，硬删除会同时删除资源
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={deleteMode} onValueChange={(value) => setDeleteMode(value as 'soft' | 'hard')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="soft" id="soft" />
              <Label htmlFor="soft">软删除（保留数据）</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hard" id="hard" />
              <Label htmlFor="hard">硬删除（删除配图等资源）</Label>
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
              {bulkLoading ? '删除中...' : deleteMode === 'hard' ? '硬删除' : '软删除'}
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

function applyInMemoryFilters(list: QuestionRecord[], filters: QuestionLibraryFilters) {
  return list.filter((question) => {
    if (filters.grade?.length) {
      const gradeMatches = (question.tags || []).some((tag) => filters.grade?.includes(tag))
      if (!gradeMatches) {
        return false
      }
    }
    if (filters.knowledge?.length && (question.knowledge_points?.length || 0) > 0) {
      const knowledgeMatches = question.knowledge_points!.some((kp) => filters.knowledge!.includes(kp))
      if (!knowledgeMatches) {
        return false
      }
    }
    return true
  })
}

async function getAccessToken() {
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) {
    throw new Error('未找到登录凭证')
  }
  return token
}

async function fetchExportTaskStatus(taskId: string): Promise<ExportTask | null> {
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
    throw new Error(data.error || '鏌ヨ瀵煎嚭浠诲姟澶辫触')
  }
  return data.task as ExportTask
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

function getDifficultyLabel(level: string) {
  const labels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  }
  return labels[level] || level
}

function formatCreatedAt(dateString?: string) {
  if (!dateString) return undefined
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return undefined
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function toLibraryCardData(question: QuestionRecord): QuestionLibraryCardData {
  const safeType: QuestionLibraryCardData['type'] = ['choice', 'fill', 'solve', 'essay', 'proof'].includes(question.type as any)
    ? (question.type as QuestionLibraryCardData['type'])
    : 'choice'

  const tags: QuestionLibraryCardData['tags'] = []
  if (question.difficulty) {
    tags.push({ category: 'difficulty', value: getDifficultyLabel(question.difficulty) })
  }
  ;(question.knowledge_points || []).forEach((kp) => {
    tags.push({ category: 'knowledge', value: kp })
  })

  return {
    id: String(question.id),
    type: safeType,
    content: question.content || '',
    answer: question.answer || '',
    imageUrl: question.image_url || null,
    createdAt: formatCreatedAt(question.created_at),
    tags,
  }
}

