"use client"

import { useState, useCallback } from 'react'
import { Drawer, Empty, Modal, Tag, Progress } from 'antd'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Trash2, PlaySquare, FileDown } from 'lucide-react'
import { useQuestionBasketStore } from '@/stores/questionBasketStore'

interface ExportInfo {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  download_url?: string | null
  error_message?: string | null
}

interface QuestionBasketDrawerProps {
  open: boolean
  onClose: () => void
  onStartBuild: () => void
  onExport?: () => void
  exportLoading?: boolean
  exportTask?: ExportInfo | null
}

export function QuestionBasketDrawer({
  open,
  onClose,
  onStartBuild,
  onExport,
  exportLoading,
  exportTask,
}: QuestionBasketDrawerProps) {
  const questions = useQuestionBasketStore((state) => state.questions)
  const selectedIds = useQuestionBasketStore((state) => state.selectedQuestionIds)
  const toggleSelection = useQuestionBasketStore((state) => state.toggleSelection)
  const selectAll = useQuestionBasketStore((state) => state.selectAll)
  const deselectAll = useQuestionBasketStore((state) => state.deselectAll)
  const clearBasket = useQuestionBasketStore((state) => state.clearBasket)
  const removeQuestion = useQuestionBasketStore((state) => state.removeQuestion)
  const reorderQuestions = useQuestionBasketStore((state) => state.reorderQuestions)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [clearModalOpen, setClearModalOpen] = useState(false)

  const handleClear = useCallback(() => {
    if (!questions.length) return
    setClearModalOpen(true)
  }, [questions.length])

  const confirmClear = useCallback(() => {
    clearBasket()
    deselectAll()
    setClearModalOpen(false)
  }, [clearBasket, deselectAll])

  const cancelClear = useCallback(() => {
    setClearModalOpen(false)
  }, [])

  const handleStartBuild = useCallback(() => {
    if (!questions.length) return
    onClose()
    onStartBuild()
  }, [questions.length, onClose, onStartBuild])

  return (
    <Drawer
      width={420}
      closable
      title={
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">题篮</p>
            <p className="text-xs text-muted-foreground mt-1">
              已选 {questions.length} 题，{selectedIds.size} 题已勾选
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!questions.length}
            data-testid="basket-clear"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            清空
          </Button>
        </div>
      }
      open={open}
      onClose={onClose}
      styles={{
        body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' },
      }}
    >
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <div className="space-x-3">
          <button
            className="hover:text-foreground transition-colors"
            onClick={() => selectAll()}
            disabled={!questions.length}
          >
            全选
          </button>
          <button
            className="hover:text-foreground transition-colors"
            onClick={() => deselectAll()}
            disabled={!questions.length}
          >
            全不选
          </button>
        </div>
        <span>拖拽手柄可调整顺序</span>
      </div>

      {exportTask && (
        <div className="mb-3 rounded-lg border border-border/70 bg-background-secondary/80 px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">最新导出任务</span>
            <Badge variant="outline">{exportTask.status}</Badge>
          </div>
          <Progress
            percent={exportTask.progress}
            size="small"
            status={
              exportTask.status === 'FAILED'
                ? 'exception'
                : exportTask.status === 'COMPLETED'
                  ? 'success'
                  : 'active'
            }
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {exportTask.status === 'COMPLETED'
                ? '已生成导出文件'
                : exportTask.status === 'FAILED'
                  ? '导出失败'
                  : '正在生成导出文件…'}
            </span>
            {exportTask.download_url && (
              <a
                href={exportTask.download_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                下载
              </a>
            )}
          </div>
          {exportTask.error_message && (
            <p className="text-xs text-destructive">{exportTask.error_message}</p>
          )}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto rounded-lg border border-border/60 p-2 space-y-2"
        data-testid="basket-card-list"
      >
        {questions.length === 0 && (
          <Empty description="题篮为空" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
        {questions.map((question) => {
          const isSelected = selectedIds.has(question.id)
          return (
            <div
              key={question.id}
              className="rounded-xl border border-border/70 bg-background-secondary/60 px-3 py-2 transition hover:border-brand-red/50"
              draggable
              data-testid={`basket-card-${question.id}`}
              onDragStart={(event) => {
                setDraggingId(question.id)
                event.dataTransfer.setData('text/plain', question.id)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const source = draggingId || event.dataTransfer.getData('text/plain')
                if (source && source !== question.id) {
                  reorderQuestions(source, question.id)
                }
                setDraggingId(null)
              }}
            >
              <div className="flex items-start gap-2">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                  aria-label="拖拽调整顺序"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelection(question.id)}
                      />
                      <Badge variant="secondary">{question.type}</Badge>
                      <Tag color={difficultyColor(question.difficulty)} bordered={false}>
                        {getDifficultyLabel(question.difficulty)}
                      </Tag>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => removeQuestion(question.id)}
                    >
                      移除
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90 line-clamp-2">{question.content}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-4 space-y-2">
        <Button
          className="w-full"
          size="lg"
          disabled={!questions.length || exportLoading}
          onClick={handleStartBuild}
          data-testid="basket-start-build"
        >
          <PlaySquare className="mr-2 h-4 w-4" />
          开始组卷
        </Button>
        <Button
          className="w-full"
          size="lg"
          variant="outline"
          disabled={!questions.length || exportLoading}
          onClick={() => onExport?.()}
          data-testid="basket-export"
        >
          <FileDown className="mr-2 h-4 w-4" />
          导出为 PDF
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          题篮内容会自动同步到“组卷工坊”，支持导出为 PDF/Word
        </p>
      </div>

      <Modal
        title="清空题篮"
        open={clearModalOpen}
        okText="清空"
        cancelText="取消"
        okButtonProps={{ danger: true, 'data-testid': 'basket-clear-confirm' as any }}
        onOk={confirmClear}
        onCancel={cancelClear}
      >
        <p className="text-sm text-muted-foreground">
          确定要清空题篮中的所有题目吗？确认后题篮与本地缓存都会被重置。
        </p>
      </Modal>
    </Drawer>
  )
}

function getDifficultyLabel(level: string) {
  if (level === 'easy') return '简单'
  if (level === 'medium') return '中等'
  if (level === 'hard') return '困难'
  return level
}

function difficultyColor(level: string) {
  if (level === 'easy') return 'success'
  if (level === 'medium') return 'warning'
  if (level === 'hard') return 'error'
  return 'default'
}
