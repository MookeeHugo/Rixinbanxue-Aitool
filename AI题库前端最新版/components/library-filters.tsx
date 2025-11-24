'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const filterOptions = {
  type: [
    { label: '选择题', value: 'choice' },
    { label: '填空题', value: 'fill' },
    { label: '解答题', value: 'solve' },
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

export function LibraryFilters() {
  return (
    <div className="space-y-4">
      {/* Filter Categories */}
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-text-secondary mb-2">题型</div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.type.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className="hover:border-primary hover:text-primary"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-text-secondary mb-2">难度</div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.difficulty.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className="hover:border-primary hover:text-primary"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-text-secondary mb-2">年级</div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.grade.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className="hover:border-primary hover:text-primary"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-text-secondary mb-2">知识点</div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.knowledge.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className="hover:border-primary hover:text-primary"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm">
          重置
        </Button>
        <Button size="sm" className="bg-primary hover:bg-primary-hover text-white">
          应用筛选
        </Button>
      </div>
    </div>
  )
}
