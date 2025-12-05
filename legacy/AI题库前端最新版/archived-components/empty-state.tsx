"use client"

import { FileQuestion, Inbox, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EmptyStateProps {
  type?: "empty" | "error" | "no-results"
  icon?: string
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  type = "empty",
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const config = {
    empty: {
      icon: Inbox,
      defaultTitle: "暂无数据",
      defaultDescription: "开始上传文件以创建题目",
      iconColor: "text-gray-400",
    },
    error: {
      icon: AlertCircle,
      defaultTitle: "加载失败",
      defaultDescription: "请稍后重试或联系管理员",
      iconColor: "text-red-400",
    },
    "no-results": {
      icon: FileQuestion,
      defaultTitle: "未找到匹配的题目",
      defaultDescription: "尝试调整筛选条件或搜索关键词",
      iconColor: "text-gray-400",
    },
  }

  const currentConfig = config[type] || config.empty
  const { icon: Icon, defaultTitle, defaultDescription, iconColor } = currentConfig

  const finalAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined)

  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className={`mb-4 rounded-full bg-gray-50 p-6 ${iconColor}`}>
        <Icon className="h-12 w-12" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title || defaultTitle}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{description || defaultDescription}</p>
      {finalAction && (
        <Button onClick={finalAction.onClick} variant="outline">
          {finalAction.label}
        </Button>
      )}
    </Card>
  )
}
