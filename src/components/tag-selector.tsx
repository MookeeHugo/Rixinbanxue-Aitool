'use client'

/**
 * 标签选择器组件
 *
 * 支持：
 * - 分类Tab展示
 * - 搜索过滤
 * - 常用标签快捷区
 * - AI推荐标签
 * - 自定义标签创建
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  Plus,
  X,
  Sparkles,
  Search,
  Star,
  Loader2,
  Tag as TagIcon,
  ChevronRight
} from 'lucide-react'
import {
  getTagTree,
  getFrequentTags,
  getQuestionTags,
  addTagToQuestion,
  removeTagFromQuestion,
  getAIRecommendedTags,
  createCustomTag
} from '@/app/actions/tags'
import type { Tag, QuestionTag, TagTree } from '@/lib/tags'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface TagSelectorProps {
  questionId: string
  questionTable: 'parsed_questions' | 'questions'
  onTagsChange?: (tags: QuestionTag[]) => void
  showAIRecommend?: boolean
  compact?: boolean
  className?: string
}

export function TagSelector({
  questionId,
  questionTable,
  onTagsChange,
  showAIRecommend = true,
  compact = false,
  className
}: TagSelectorProps) {
  const { toast } = useToast()

  // 状态
  const [tagTree, setTagTree] = useState<TagTree[]>([])
  const [selectedTags, setSelectedTags] = useState<QuestionTag[]>([])
  const [frequentTags, setFrequentTags] = useState<Tag[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [aiRecommending, setAiRecommending] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')

  // 加载标签数据
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [treeResult, frequentResult, questionTagsResult] = await Promise.all([
        getTagTree(),
        getFrequentTags(8),
        getQuestionTags(questionId, questionTable)
      ])

      if (treeResult.success && treeResult.data) {
        setTagTree(treeResult.data)
        if (treeResult.data.length > 0 && !activeCategory) {
          setActiveCategory(treeResult.data[0].category.name)
        }
      }

      if (frequentResult.success && frequentResult.data) {
        setFrequentTags(frequentResult.data)
      }

      if (questionTagsResult.success && questionTagsResult.data) {
        setSelectedTags(questionTagsResult.data)
      }
    } catch (error) {
      console.error('加载标签数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [questionId, questionTable, activeCategory])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 添加标签
  const handleAddTag = async (tag: Tag) => {
    // 检查是否已存在
    if (selectedTags.some(t => t.tagId === tag.id)) {
      return
    }

    const result = await addTagToQuestion({
      questionId,
      questionTable,
      tagId: tag.id
    })

    if (result.success && result.data) {
      const newTags = [...selectedTags, { ...result.data, tag }]
      setSelectedTags(newTags)
      onTagsChange?.(newTags)
      toast({
        title: '标签已添加',
        description: tag.displayName
      })
    } else {
      toast({
        title: '添加失败',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  // 移除标签
  const handleRemoveTag = async (tagId: string) => {
    const result = await removeTagFromQuestion({
      questionId,
      questionTable,
      tagId
    })

    if (result.success) {
      const newTags = selectedTags.filter(t => t.tagId !== tagId)
      setSelectedTags(newTags)
      onTagsChange?.(newTags)
    } else {
      toast({
        title: '移除失败',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  // AI推荐标签
  const handleAIRecommend = async () => {
    setAiRecommending(true)
    try {
      const result = await getAIRecommendedTags(questionId, questionTable)

      if (result.success && result.data && result.data.length > 0) {
        // 逐个添加推荐的标签
        for (const rec of result.data) {
          if (!selectedTags.some(t => t.tagId === rec.tagId)) {
            await addTagToQuestion({
              questionId,
              questionTable,
              tagId: rec.tagId,
              source: 'ai',
              confidence: rec.confidence
            })
          }
        }

        // 重新加载标签
        const questionTagsResult = await getQuestionTags(questionId, questionTable)
        if (questionTagsResult.success && questionTagsResult.data) {
          setSelectedTags(questionTagsResult.data)
          onTagsChange?.(questionTagsResult.data)
        }

        toast({
          title: 'AI 推荐完成',
          description: `已添加 ${result.data.length} 个推荐标签`
        })
      } else {
        toast({
          title: 'AI 推荐',
          description: '未找到合适的标签推荐'
        })
      }
    } catch (error) {
      toast({
        title: 'AI 推荐失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setAiRecommending(false)
    }
  }

  // 搜索过滤标签
  const getFilteredTags = (categoryTree: TagTree) => {
    if (!searchQuery) {
      return categoryTree.subcategories
    }

    const query = searchQuery.toLowerCase()
    return categoryTree.subcategories
      .map(sc => ({
        ...sc,
        tags: sc.tags.filter(tag =>
          tag.displayName.toLowerCase().includes(query) ||
          tag.name.toLowerCase().includes(query)
        )
      }))
      .filter(sc => sc.tags.length > 0)
  }

  // 判断标签是否已选中
  const isTagSelected = (tagId: string) => {
    return selectedTags.some(t => t.tagId === tagId)
  }

  // 获取分类颜色
  const getCategoryColor = (color: string) => {
    return { backgroundColor: `${color}15`, borderColor: `${color}40`, color }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-500', className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">加载标签...</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 已选标签展示 */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-gray-400">暂无标签</span>
        ) : (
          selectedTags.map(qt => (
            <Badge
              key={qt.id}
              variant="outline"
              className="flex items-center gap-1 px-2 py-1 pr-1"
            >
              {qt.tag?.displayName || '未知标签'}
              {qt.source === 'ai' && (
                <Sparkles className="w-3 h-3 text-purple-500 ml-0.5" />
              )}
              <button
                onClick={() => handleRemoveTag(qt.tagId)}
                className="ml-1 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* 添加标签按钮 */}
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={compact ? 'sm' : 'default'}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              添加标签
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            {/* 搜索框 */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* 常用标签 */}
            {frequentTags.length > 0 && !searchQuery && (
              <div className="p-3 border-b bg-gray-50/50">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  常用标签
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {frequentTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={isTagSelected(tag.id) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isTagSelected(tag.id)
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-100'
                      )}
                      onClick={() => !isTagSelected(tag.id) && handleAddTag(tag)}
                    >
                      {tag.displayName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 分类标签 */}
            <Tabs
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto">
                {tagTree.slice(0, 6).map(tree => (
                  <TabsTrigger
                    key={tree.category.id}
                    value={tree.category.name}
                    className={cn(
                      'rounded-none border-b-2 border-transparent px-3 py-2 text-sm',
                      'data-[state=active]:border-primary data-[state=active]:bg-transparent'
                    )}
                    style={{
                      '--category-color': tree.category.color
                    } as React.CSSProperties}
                  >
                    {tree.category.displayName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {tagTree.map(tree => (
                <TabsContent
                  key={tree.category.id}
                  value={tree.category.name}
                  className="mt-0 p-3 max-h-[300px] overflow-y-auto"
                >
                  {getFilteredTags(tree).map((sc, idx) => (
                    <div key={sc.subcategory?.id || idx} className="mb-3 last:mb-0">
                      {sc.subcategory && (
                        <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          {sc.subcategory.displayName}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {sc.tags.map(tag => (
                          <Badge
                            key={tag.id}
                            variant={isTagSelected(tag.id) ? 'default' : 'outline'}
                            className={cn(
                              'cursor-pointer transition-colors',
                              isTagSelected(tag.id)
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                            )}
                            onClick={() => !isTagSelected(tag.id) && handleAddTag(tag)}
                          >
                            {tag.displayName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}

                  {getFilteredTags(tree).length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">未找到匹配的标签</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* AI 推荐按钮 */}
        {showAIRecommend && (
          <Button
            variant="outline"
            size={compact ? 'sm' : 'default'}
            onClick={handleAIRecommend}
            disabled={aiRecommending}
            className="gap-1"
          >
            {aiRecommending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {aiRecommending ? 'AI 分析中...' : 'AI 推荐'}
          </Button>
        )}
      </div>
    </div>
  )
}
