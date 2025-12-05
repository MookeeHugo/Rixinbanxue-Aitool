'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowTag } from '@/components/question-workflow-types'

interface QuestionTagSelectorProps {
  selectedTags: WorkflowTag[]
  onChange: (tags: WorkflowTag[]) => void
  className?: string
}

const TAG_LIBRARY: Record<string, { label: string; tags: string[] }> = {
  knowledge: {
    label: '知识点',
    tags: ['函数', '代数', '几何', '概率统计', '向量', '立体几何', '解析几何']
  },
  thinking: {
    label: '思维方式',
    tags: ['分类讨论', '构造法', '函数建模', '数形结合', '整体代入', '逻辑推理']
  },
  ability: {
    label: '能力目标',
    tags: ['基础', '综合', '拓展', '创新']
  }
}

export function QuestionTagSelector({ selectedTags, onChange, className }: QuestionTagSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof TAG_LIBRARY>('knowledge')
  const [customTag, setCustomTag] = useState('')

  const groupedTags = useMemo(() => {
    const groups: Record<string, WorkflowTag[]> = {}
    selectedTags.forEach((tag) => {
      groups[tag.category] ||= []
      groups[tag.category].push(tag)
    })
    return groups
  }, [selectedTags])

  const toggleTag = (category: string, value: string) => {
    const exists = selectedTags.some((tag) => tag.category === category && tag.value === value)
    if (exists) {
      onChange(selectedTags.filter((tag) => !(tag.category === category && tag.value === value)))
    } else {
      onChange([...selectedTags, { category, value }])
    }
  }

  const handleAddCustomTag = () => {
    if (!customTag.trim()) {
      return
    }
    onChange([...selectedTags, { category: 'custom', value: customTag.trim() }])
    setCustomTag('')
  }

  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-950/70 p-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">精准标签</p>
        <p className="text-xs text-slate-500">至少维护知识点与难度信息</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedTags.length === 0 && <p className="text-xs text-slate-500">暂无标签</p>}
        {selectedTags.map((tag) => (
          <Badge key={`${tag.category}-${tag.value}`} className="flex items-center gap-1 bg-slate-800 text-slate-200">
            <span className="text-xs text-slate-400">{tag.category}</span>
            {tag.value}
            <button
              type="button"
              className="rounded-full bg-slate-700/80 p-0.5"
              onClick={() => toggleTag(tag.category, tag.value)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="mt-4">
        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as keyof typeof TAG_LIBRARY)}>
          <TabsList className="grid grid-cols-3 bg-slate-900">
            {Object.entries(TAG_LIBRARY).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="text-xs text-slate-300 data-[state=active]:text-white">
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(TAG_LIBRARY).map(([key, config]) => (
            <TabsContent key={key} value={key} className="mt-3">
              <div className="flex flex-wrap gap-2">
                {config.tags.map((tag) => {
                  const isActive = groupedTags[key]?.some((selected) => selected.value === tag)
                  return (
                    <Button
                      key={tag}
                      type="button"
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => toggleTag(key, tag)}
                      className={cn(
                        'border-slate-700',
                        isActive ? 'bg-sky-600 text-white' : 'bg-slate-900/40 text-slate-200 hover:bg-slate-900'
                      )}
                    >
                      {tag}
                    </Button>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          placeholder="自定义标签"
          value={customTag}
          onChange={(event) => setCustomTag(event.target.value)}
          className="border-slate-800 bg-slate-900 text-slate-100"
        />
        <Button variant="outline" onClick={handleAddCustomTag} className="border-slate-700 text-slate-100">
          <Plus className="mr-1 h-4 w-4" />
          添加
        </Button>
      </div>
    </div>
  )
}
