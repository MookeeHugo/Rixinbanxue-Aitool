"use client"

import { Card } from '@/components/ui/card'
import { FileText, TrendingUp, CheckCircle2, Clock } from 'lucide-react'

interface LibraryStatsProps {
  totalQuestions: number
  weeklyIncrease?: number
  reviewedCount?: number
  pendingReviewCount?: number
}

export function LibraryStats({
  totalQuestions,
  weeklyIncrease = 0,
  reviewedCount = 0,
  pendingReviewCount = 0,
}: LibraryStatsProps) {
  const stats = [
    {
      label: '题目总数',
      value: totalQuestions,
      icon: FileText,
      accent: 'text-primary',
      background: 'bg-primary/10',
    },
    {
      label: '本周新增',
      value: weeklyIncrease,
      icon: TrendingUp,
      accent: 'text-emerald-600',
      background: 'bg-emerald-100/60',
    },
    {
      label: '已标注',
      value: reviewedCount,
      icon: CheckCircle2,
      accent: 'text-sky-600',
      background: 'bg-sky-100/60',
    },
    {
      label: '待复核',
      value: pendingReviewCount,
      icon: Clock,
      accent: 'text-amber-600',
      background: 'bg-amber-100/60',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-5 flex items-center gap-4">
          <div className={`rounded-xl p-3 ${stat.background}`}>
            <stat.icon className={`h-6 w-6 ${stat.accent}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

