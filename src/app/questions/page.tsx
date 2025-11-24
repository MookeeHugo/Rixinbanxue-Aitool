"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface'
import { Table, message, Space, Tag, Modal, Radio, Upload } from 'antd'
import { Input } from 'antd'
import { logger } from '@/lib/logger'
import {
  Plus,
  Filter,
  Search as SearchIcon,
  Trash2,
  Download,
  UploadCloud,
  ShoppingBasket,
  FileDown,
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
        message.error('加载题目失败')
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
        message.error(error instanceof Error ? error.message : '查询导出任务失败')
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
      message.success('导出完成，可在题篮中下载文件')
    }
    if (exportTask.status === 'FAILED') {
      message.error(exportTask.error_message || '导出失败，请稍后重试')
    }
  }, [exportTask?.status])

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
      message.error('加载题目失败')
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
      message.info('题目已在题篮中')
      return
    }
    addToBasket({
      id,
      content: record.content,
      type: (record.type as any) || 'choice',
      difficulty: (record.difficulty as any) || 'medium',
      knowledge_points: record.knowledge_points || [],
    })
    message.success('已加入题篮')
  }, [hasQuestionInBasket, addToBasket])

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
      message.warning('题篮为空')
      return
    }
    try {
      window.localStorage.setItem('rixin-basket-snapshot', JSON.stringify(basketQuestions))
    } catch (error) {
      logger.warn('题篮快照写入失败', { error: error })
    }
    setBasketOpen(false)
    router.push('/papers/create?source=basket')
  }, [basketQuestions, router])

  const handleExportFromBasket = useCallback(async () => {
    if (!basketQuestions.length) {
      message.warning('题篮为空')
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
      message.success('导出任务已创建')
      setBasketOpen(true)
    } catch (error: any) {
      logger.error('创建导出任务失败:', { error: error })
      message.error(error?.message || '创建导出任务失败')
    } finally {
      setExportLoading(false)
    }
  }, [basketQuestions])

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
      message.warning('请选择题目')
      return
    }
    setBulkLoading(true)
    try {
      await callDeleteApi(selectedRowKeys.map(String), deleteMode)
      message.success(deleteMode === 'hard' ? '已硬删除所选题目' : '所选题目已软删除')
      setSelectedRowKeys([])
      setDeleteModalOpen(false)
      void loadQuestions()
    } catch (error: any) {
      logger.error('Error occurred', { error: error })
      message.error(error.message || '批量删除失败')
    } finally {
      setBulkLoading(false)
    }
  }, [selectedRowKeys, deleteMode, callDeleteApi])

  const handleBulkExport = useCallback((format: 'csv' | 'json') => {
    if (!selectedRowKeys.length) {
      message.warning('请选择题目')
      return
    }
    const rows = selectedRowKeys
      .map((key) => questionMap.get(String(key)))
      .filter((item): item is QuestionRecord => Boolean(item))

    if (!rows.length) {
      message.warning('未找到可导出的题目')
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
    message.success(`已导出 ${rows.length} 道题目`)
  }, [selectedRowKeys, questionMap])

  const handleBulkImport = useCallback(async (file: File) => {
    if (!profile) {
      message.error('请先登录')
      return Upload.LIST_IGNORE
    }

    if (!file.name.endsWith('.csv')) {
      message.error('请上传 CSV 文件')
      return Upload.LIST_IGNORE
    }

    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (!rows.length) {
        message.warning('未解析到题目')
        return Upload.LIST_IGNORE
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

      message.success(`成功导入 ${payload.length} 道题目`)
      void loadQuestions()
    } catch (error: any) {
      logger.error('导入失败:', { error: error })
      message.error(error.message || '导入失败')
    }

    return Upload.LIST_IGNORE
  }, [profile])

  const columns: ColumnsType<QuestionRecord> = useMemo(
    () => [
      {
        title: '题干',
        dataIndex: 'content',
        key: 'content',
        render: (text: string) => (
          <div className="line-clamp-2 text-sm text-foreground/90">
            {highlightMatch(text || '')}
          </div>
        ),
      },
      {
        title: '题型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Badge variant="secondary">{getTypeLabel(type)}</Badge>,
      },
      {
        title: '难度',
        dataIndex: 'difficulty',
        key: 'difficulty',
        render: (difficulty: string) => (
          <Tag color={getDifficultyColor(difficulty)}>{getDifficultyLabel(difficulty)}</Tag>
        ),
      },
      {
        title: '知识点',
        dataIndex: 'knowledge_points',
        key: 'knowledge_points',
        render: (points?: string[]) =>
          points?.length ? (
            <Space size={[4, 4]} wrap>
              {points.slice(0, 3).map((kp) => (
                <Badge key={kp} variant="outline">
                  {kp}
                </Badge>
              ))}
              {points.length > 3 && <span className="text-xs text-muted-foreground">+{points.length - 3}</span>}
            </Space>
          ) : (
            <span className="text-xs text-muted-foreground">未关联</span>
          ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space size="small">
            <Link href={`/questions/${record.id}`}>
              <Button variant="outline" size="sm">
                查看
              </Button>
            </Link>
            <Link href={`/questions/${record.id}/edit`}>
              <Button variant="secondary" size="sm">
                编辑
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddToBasketAction(record)}
              disabled={hasQuestionInBasket(String(record.id))}
            >
              {hasQuestionInBasket(String(record.id)) ? '已在题篮' : '加入题篮'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(String(record.id))}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [highlightMatch, hasQuestionInBasket, handleAddToBasketAction, handleDelete]
  )

  const rowSelection: TableRowSelection<QuestionRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: setSelectedRowKeys,
    }),
    [selectedRowKeys]
  )

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
                onPressEnter={() => {
                  updateSearchHistory(searchText)
                  void loadQuestions()
                }}
                allowClear
              />
              <SearchIcon className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
          <Upload
            showUploadList={false}
            beforeUpload={handleBulkImport}
            accept=".csv"
          >
            <Button variant="outline" size="sm">
              <UploadCloud className="mr-1 h-4 w-4" />
              批量导入
            </Button>
          </Upload>
          <span className="text-xs text-muted-foreground">
            已选 {selectedRowKeys.length} / 共 {questions.length}
          </span>
        </div>
      </Card>

      <Card className="p-6">
        <Table
          columns={columns}
          dataSource={questions}
          rowKey={(record) => String(record.id)}
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 道题目`,
          }}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <p className="text-muted-foreground mb-4">暂无题目</p>
                <Link href="/questions/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一道题目
                  </Button>
                </Link>
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title="删除题目"
        open={deleteModalOpen}
        okText={deleteMode === 'hard' ? '硬删除' : '软删除'}
        okButtonProps={{ danger: deleteMode === 'hard', loading: bulkLoading }}
        cancelText="取消"
        onOk={handleBulkDelete}
        onCancel={() => {
          if (!bulkLoading) setDeleteModalOpen(false)
        }}
      >
        <p className="text-sm text-muted-foreground mb-3">
          软删除会将题目设置为私有并保留数据；硬删除会彻底清除题目及图片。
        </p>
        <Radio.Group
          className="flex flex-col gap-2"
          value={deleteMode}
          onChange={(event) => setDeleteMode(event.target.value)}
        >
          <Radio value="soft">软删除（可恢复）</Radio>
          <Radio value="hard">硬删除（不可恢复）</Radio>
        </Radio.Group>
      </Modal>

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

function getDifficultyColor(level: string) {
  const colors: Record<string, string> = {
    easy: 'success',
    medium: 'warning',
    hard: 'error',
  }
  return colors[level] || 'default'
}
