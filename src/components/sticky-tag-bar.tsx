'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronUp, Plus, Search, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowTag } from '@/components/question-workflow-types'

interface StickyTagBarProps {
  currentQuestionIndex: number
  totalQuestions: number
  currentTags: WorkflowTag[]
  onAddTag: (tag: WorkflowTag) => void
  onRemoveTag: (tag: WorkflowTag) => void
  onSelectQuestion: (index: number) => void
  onSubmitCurrent: () => void
}

const PRESET_TAGS: Record<
  string,
  {
    label: string
    tags: string[]
  }
> = {
  knowledge: {
    label: '知识点',
    tags: ['集合', '函数', '三角函数', '向量', '数列', '不等式', '立体几何', '解析几何', '概率统计', '复数']
  },
  difficulty: {
    label: '难度',
    tags: ['简单', '中等', '困难', '挑战']
  },
  grade: {
    label: '年级',
    tags: ['初一', '初二', '初三', '高一', '高二', '高三']
  },
  source: {
    label: '题源',
    tags: ['课后改编', '联考真题', '名校原创', '模拟冲刺']
  }
}

export function StickyTagBar({
  currentQuestionIndex,
  totalQuestions,
  currentTags,
  onAddTag,
  onRemoveTag,
  onSelectQuestion,
  onSubmitCurrent
}: StickyTagBarProps) {
  const [isSticky, setIsSticky] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeCategory, setActiveCategory] = useState<keyof typeof PRESET_TAGS>('knowledge')
  const [search, setSearch] = useState('')
  const [customTag, setCustomTag] = useState('')

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 200)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredTags = useMemo(() => {
    const allTags = PRESET_TAGS[activeCategory].tags
    if (!search.trim()) {
      return allTags
    }
    return allTags.filter((tag) => tag.includes(search.trim()))
  }, [activeCategory, search])

  const handleToggleTag = (category: string, value: string) => {
    const existed = currentTags.some((tag) => tag.category === category && tag.value === value)
    if (existed) {
      onRemoveTag({ category, value })
    } else {
      onAddTag({ category, value })
    }
  }

  const handleAddCustomTag = () => {
    if (!customTag.trim()) {
      return
    }
    onAddTag({ category: 'custom', value: customTag.trim() })
    setCustomTag('')
  }

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isSticky && 'sticky top-16 z-30 drop-shadow-lg',
        !isSticky && 'z-10'
      )}
    >
      <Card className="border-slate-800 bg-slate-950/90 backdrop-blur shadow-xl">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">当前题目</p>
              <p className="text-2xl font-semibold text-white">
                {currentQuestionIndex + 1} / {totalQuestions}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={() => onSelectQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                上一题
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={() => onSelectQuestion(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex >= totalQuestions - 1}
              >
                下一题
              </Button>
              <Button size="sm" className="bg-sky-500 text-white hover:bg-sky-600" onClick={onSubmitCurrent}>
                <Send className="mr-1 h-3.5 w-3.5" />
                提交当前
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => setIsExpanded((prev) => !prev)}
              >
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <>
              <div className="flex flex-wrap gap-2">
                {currentTags.length === 0 && (
                  <p className="text-xs text-slate-500">尚未添加标签，至少补充知识点与难度信息。</p>
                )}
                {currentTags.map((tag) => (
                  <Badge key={`${tag.category}-${tag.value}`} className="bg-slate-800 text-slate-100">
                    <span className="mr-1 text-xs text-slate-400">{tag.category === 'custom' ? '自定义' : tag.category}</span>
                    {tag.value}
                    <button
                      type="button"
                      className="ml-2 rounded-full bg-slate-700 p-0.5 hover:bg-slate-600"
                      onClick={() => onRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                {Object.entries(PRESET_TAGS).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key as keyof typeof PRESET_TAGS)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all',
                      activeCategory === key
                        ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {value.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        placeholder="按名称搜索标签"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="border-slate-800 bg-slate-900 pl-8 text-slate-100"
                      />
                    </div>
                    <Input
                      placeholder="自定义标签"
                      value={customTag}
                      onChange={(event) => setCustomTag(event.target.value)}
                      className="border-slate-800 bg-slate-900 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-100 hover:bg-slate-800"
                      onClick={handleAddCustomTag}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      添加
                    </Button>
                  </div>
                  <ScrollArea className="h-40 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex flex-wrap gap-2">
                      {filteredTags.map((tag, index) => {
                        const isActive = currentTags.some(
                          (selected) => selected.category === activeCategory && selected.value === tag
                        )
                        return (
                          <Button
                      key={`${tag}-${index}`}
                      type="button"
                            size="sm"
                            variant={isActive ? 'default' : 'outline'}
                            className={cn(
                              'border-slate-700',
                              isActive
                                ? 'bg-sky-600 text-white hover:bg-sky-500'
                                : 'bg-slate-900/40 text-slate-100 hover:bg-slate-800'
                            )}
                            onClick={() => handleToggleTag(activeCategory, tag)}
                          >
                            {tag}
                          </Button>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
                <Card className="border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs text-slate-400">AI 建议</p>
                  <p className="text-sm text-slate-200">
                    结合最近一次解析结果，为当前题目推荐最常使用的标签，可直接点击右侧标签快速应用。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['函数综合', '中等偏难', '联考真题'].map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer border-sky-600/40 bg-slate-900 text-sky-100 hover:bg-slate-800"
                        onClick={() => onAddTag({ category: 'ai', value: tag })}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
