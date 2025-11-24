"use client"

import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ErrorStateProps {
  title?: string
  message: string
  showRetry?: boolean
  showHome?: boolean
  onRetry?: () => void
  onHome?: () => void
}

export function ErrorState({
  title = "出错了",
  message,
  showRetry = true,
  showHome = false,
  onRetry,
  onHome,
}: ErrorStateProps) {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="rounded-full bg-red-100 p-4">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 max-w-md">{message}</p>
        </div>
        <div className="flex gap-3">
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          )}
          {showHome && onHome && (
            <Button onClick={onHome} variant="outline" className="gap-2 bg-transparent">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
