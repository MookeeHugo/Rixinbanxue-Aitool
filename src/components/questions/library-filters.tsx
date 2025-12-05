"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface QuestionLibraryFilters {
  type?: string[]
  difficulty?: string[]
  grade?: string[]
  knowledge?: string[]
}

export interface LibraryFiltersProps {
  value: QuestionLibraryFilters
  onChange?: (value: QuestionLibraryFilters) => void
  onReset?: () => void
  onApply?: (value: QuestionLibraryFilters) => void
  className?: string
}

const defaultOptions = {
  type: [
    { label: '选择题', value: 'choice' },
    { label: '填空题', value: 'fill' },
    { label: '解答题', value: 'essay' },
  ],
  difficulty: [
    { label: '简单', value: 'easy' },
    { label: '中等', value: 'medium' },
    { label: '困难', value: 'hard' },
  ],
  grade: [
    { label: '高一', value: 'grade1' },
    { label: '高二', value: 'grade2' },
    { label: '高三', value: 'grade3' },
  ],
  knowledge: [
    { label: '集合', value: 'set' },
    { label: '函数', value: 'function' },
    { label: '三角函数', value: 'trigonometry' },
    { label: '向量', value: 'vector' },
    { label: '数列', value: 'sequence' },
  ],
}

function toggleValue(list: string[] | undefined, value: string) {
  if (!list || list.length === 0) return [value]
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}

export function LibraryFilters({ value, onChange, onApply, onReset, className }: LibraryFiltersProps) {
  const handleToggle = (key: keyof QuestionLibraryFilters, optionValue: string) => {
    const next: QuestionLibraryFilters = {
      ...value,
      [key]: toggleValue(value[key], optionValue),
    }
    onChange?.(next)
  }

  const filterPills = [
    ...(value.type ?? []),
    ...(value.difficulty ?? []),
    ...(value.grade ?? []),
    ...(value.knowledge ?? []),
  ]

  return (
    <div className={cn('space-y-5', className)}>
      <section className="space-y-3">
        <FilterGroup
          title="题型"
          options={defaultOptions.type}
          selected={value.type}
          onToggle={(val) => handleToggle('type', val)}
        />
        <FilterGroup
          title="难度"
          options={defaultOptions.difficulty}
          selected={value.difficulty}
          onToggle={(val) => handleToggle('difficulty', val)}
        />
        <FilterGroup
          title="年级"
          options={defaultOptions.grade}
          selected={value.grade}
          onToggle={(val) => handleToggle('grade', val)}
        />
        <FilterGroup
          title="知识点"
          options={defaultOptions.knowledge}
          selected={value.knowledge}
          onToggle={(val) => handleToggle('knowledge', val)}
        />
      </section>

      {filterPills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterPills.map((pill) => (
            <Badge key={pill} variant="secondary" className="text-xs">
              {pill}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
        >
          重置
        </Button>
        <Button
          size="sm"
          onClick={() => onApply?.(value)}
        >
          应用筛选
        </Button>
      </div>
    </div>
  )
}

interface FilterGroupProps {
  title: string
  options: Array<{ label: string; value: string }>
  selected?: string[]
  onToggle: (value: string) => void
}

function FilterGroup({ title, options, selected, onToggle }: FilterGroupProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected?.includes(option.value)
          return (
            <Button
              key={option.value}
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle(option.value)}
              className={cn(
                'min-w-[72px]',
                active ? 'bg-primary text-white hover:bg-primary/90' : 'text-muted-foreground',
              )}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

