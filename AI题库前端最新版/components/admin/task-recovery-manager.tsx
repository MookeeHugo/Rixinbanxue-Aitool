"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { Badge } from "../ui/badge"
import { Clock, FileText, Trash2, Play, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

const STAGE_LABELS = {
  uploading: "上传文件",
  parsing: "解析题目",
  editing: "编辑题目",
  tagging: "标签管理",
  completed: "已完成",
}

const STAGE_ROUTES = {
  uploading: "/upload",
  parsing: "/parse",
  editing: "/parse",
  tagging: "/edit",
  completed: "/library",
}

const STAGE_COLORS = {
  uploading: "bg-blue-100 text-blue-700",
  parsing: "bg-purple-100 text-purple-700",
  editing: "bg-orange-100 text-orange-700",
  tagging: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
}

export function AdminTaskRecoveryManager() {
  const router = useRouter()
  const { getIncompleteTask, clearIncompleteTask, taskHistory } = useAppStore()
  const incompleteTask = getIncompleteTask()

  const handleContinue = () => {
    if (incompleteTask) {
      const route = STAGE_ROUTES[incompleteTask.stage as keyof typeof STAGE_ROUTES]
      router.push(route)
    }
  }

  const handleClear = () => {
    if (confirm("确定要清除未完成任务吗？所有进度将丢失。")) {
      clearIncompleteTask()
    }
  }

  const getTimeSince = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle>任务恢复管理</CardTitle>
          <CardDescription>管理未完成的任务，支持继续或放弃</CardDescription>
        </CardHeader>
        <CardContent>
          {incompleteTask ? (
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2">{incompleteTask.fileName}</h3>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge className={STAGE_COLORS[incompleteTask.stage as keyof typeof STAGE_COLORS]}>
                      {STAGE_LABELS[incompleteTask.stage as keyof typeof STAGE_LABELS]}
                    </Badge>

                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {getTimeSince(incompleteTask.lastActiveAt)}
                    </div>

                    {incompleteTask.progress > 0 && (
                      <Badge variant="outline">进度 {Math.round(incompleteTask.progress)}%</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleContinue} className="bg-amber-600 hover:bg-amber-700">
                      <Play className="w-4 h-4 mr-2" />
                      继续任务
                    </Button>
                    <Button variant="destructive" onClick={handleClear}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      放弃任务
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">当前没有未完成的任务</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>任务历史</CardTitle>
          <CardDescription>最近完成的任务记录</CardDescription>
        </CardHeader>
        <CardContent>
          {taskHistory && taskHistory.length > 0 ? (
            <div className="space-y-3">
              {taskHistory
                .slice(-10)
                .reverse()
                .map((task: any) => (
                  <div key={task.id} className="p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{task.fileName || `任务 ${task.id}`}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>{task.totalQuestions || 0} 道题目</span>
                            <span>·</span>
                            <span>{new Date(task.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        已完成
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">暂无任务历史</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
