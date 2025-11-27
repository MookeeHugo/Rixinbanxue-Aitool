/**
 * 题目筛选和搜索栏组件
 * 包含类型筛选、难度筛选、搜索框和搜索历史
 */

import { Filter, Search as SearchIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { QuestionFilter } from '@/hooks/useQuestionsData'

interface QuestionsFilterBarProps {
  filter: QuestionFilter
  onFilterChange: (filter: QuestionFilter) => void
  searchText: string
  onSearchTextChange: (text: string) => void
  searchHistory: string[]
  onSearchHistorySelect: (keyword: string) => void
  onClearHistory: () => void
  onSearch: () => void
}

export function QuestionsFilterBar({
  filter,
  onFilterChange,
  searchText,
  onSearchTextChange,
  searchHistory,
  onSearchHistorySelect,
  onClearHistory,
  onSearch,
}: QuestionsFilterBarProps) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 筛选标题 */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">筛选条件</span>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* 题型筛选 */}
          <div className="w-40">
            <Select
              value={filter.type || 'all'}
              onValueChange={(value) =>
                onFilterChange({ ...filter, type: value === 'all' ? undefined : value })
              }
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

          {/* 难度筛选 */}
          <div className="w-40">
            <Select
              value={filter.difficulty || 'all'}
              onValueChange={(value) =>
                onFilterChange({ ...filter, difficulty: value === 'all' ? undefined : value })
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

          {/* 清除筛选按钮 */}
          {(filter.type || filter.difficulty) && (
            <Button variant="outline" size="sm" onClick={() => onFilterChange({})}>
              清除筛选
            </Button>
          )}
        </div>

        {/* 搜索框 */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-64">
            <Input
              placeholder="全文搜索题干/答案"
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch()
                }
              }}
              className="pr-16"
            />
            {searchText && (
              <button
                onClick={() => onSearchTextChange('')}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <Button variant="ghost" size="sm" onClick={onSearch}>
            搜索
          </Button>
        </div>
      </div>

      {/* 搜索历史 */}
      {searchHistory.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">历史搜索:</span>
          {searchHistory.map((keyword) => (
            <button
              key={keyword}
              className="rounded-full border px-3 py-1 hover:bg-background-secondary transition"
              onClick={() => onSearchHistorySelect(keyword)}
            >
              {keyword}
            </button>
          ))}
          <Button variant="link" size="sm" className="text-xs" onClick={onClearHistory}>
            清空
          </Button>
        </div>
      )}
    </Card>
  )
}
