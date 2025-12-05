'use client'

import { Card } from '@/components/ui/card'
import { FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

interface LibraryStatsProps {
  totalQuestions: number
}

export function LibraryStats({ totalQuestions }: LibraryStatsProps) {
  const stats = [
    {
      label: '题目总数',
      value: totalQuestions,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: '本周新增',
      value: 12,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: '已标注',
      value: totalQuestions,
      icon: CheckCircle2,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: '待审核',
      value: 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
