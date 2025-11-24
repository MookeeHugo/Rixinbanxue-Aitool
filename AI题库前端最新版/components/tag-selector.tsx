'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tag {
  category: string
  value: string
}

interface TagSelectorProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
}

const commonTags = {
  knowledge: [
    '集合',
    '函数',
    '三角函数',
    '向量',
    '数列',
    '不等式',
    '立体几何',
    '解析几何',
    '概率统计',
    '导数',
  ],
  difficulty: ['简单', '中等', '困难'],
  grade: ['初一', '初二', '初三', '高一', '高二', '高三'],
  source: ['高考真题', '模拟题', '练习题', '竞赛题'],
}

const categoryLabels = {
  knowledge: '知识点',
  difficulty: '难度',
  grade: '年级',
  source: '来源',
}

export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const [customTag, setCustomTag] = useState('')
  const [activeCategory, setActiveCategory] = useState<keyof typeof commonTags>('knowledge')

  const isTagSelected = (category: string, value: string) => {
    return selectedTags.some((tag) => tag.category === category && tag.value === value)
  }

  const toggleTag = (category: string, value: string) => {
    if (isTagSelected(category, value)) {
      onTagsChange(selectedTags.filter((tag) => !(tag.category === category && tag.value === value)))
    } else {
      onTagsChange([...selectedTags, { category, value }])
    }
  }

  const removeTag = (category: string, value: string) => {
    onTagsChange(selectedTags.filter((tag) => !(tag.category === category && tag.value === value)))
  }

  const addCustomTag = () => {
    if (customTag.trim()) {
      onTagsChange([...selectedTags, { category: 'custom', value: customTag.trim() }])
      setCustomTag('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-text-secondary">已选标签</div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-primary text-white hover:bg-primary-hover pl-3 pr-1 py-1"
              >
                <span className="mr-1">
                  {tag.category !== 'custom' && `${categoryLabels[tag.category as keyof typeof categoryLabels]}: `}
                  {tag.value}
                </span>
                <button
                  onClick={() => removeTag(tag.category, tag.value)}
                  className="ml-1 rounded-full hover:bg-white/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tag Categories */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as keyof typeof commonTags)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="knowledge">知识点</TabsTrigger>
          <TabsTrigger value="difficulty">难度</TabsTrigger>
          <TabsTrigger value="grade">年级</TabsTrigger>
          <TabsTrigger value="source">来源</TabsTrigger>
        </TabsList>

        {Object.entries(commonTags).map(([category, tags]) => (
          <TabsContent key={category} value={category} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTag(category, tag)}
                  className={cn(
                    'transition-all',
                    isTagSelected(category, tag)
                      ? 'bg-primary text-white border-primary hover:bg-primary-hover hover:text-white'
                      : 'hover:border-primary hover:text-primary'
                  )}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Custom Tag Input */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-text-secondary">自定义标签</div>
        <div className="flex gap-2">
          <Input
            placeholder="输入自定义标签..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addCustomTag()
              }
            }}
          />
          <Button
            onClick={addCustomTag}
            disabled={!customTag.trim()}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
