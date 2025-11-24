"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Upload,
  FileText,
  Tags,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Database,
  Ticket,
  Settings,
  ArrowUpRight,
  Lock,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useAppStore } from "@/lib/store"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PostponedTaskButton } from "@/components/task-recovery-banner"
import type { AdminTab } from "@/types/admin"

export function AdminDashboard({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const router = useRouter()
  const incompleteTask = useAppStore((state) => state.getIncompleteTask())
  const restoreIncompleteTask = useAppStore((state) => state.restoreIncompleteTask)
  const hasIncompleteTask = incompleteTask !== null
  const isDismissed = incompleteTask && incompleteTask.isDismissed

  const handleRestoreTask = () => {
    restoreIncompleteTask()
  }

  const quickActions = [
    { label: "开始录题", icon: Upload, action: () => router.push("/upload"), isPrimary: true },
    { label: "查看题库", icon: Database, action: () => onNavigate("questions"), isPrimary: false },
    { label: "创建邀请码", icon: Ticket, action: () => onNavigate("invite"), isPrimary: false },
    { label: "切换供应商", icon: Settings, action: () => onNavigate("provider"), isPrimary: false },
  ]

  const stats = [
    { label: "总题目数", value: "1,234", change: "+12%", icon: FileText, trend: "up" },
    { label: "今日解析", value: "56", change: "+8%", icon: TrendingUp, trend: "up" },
    { label: "AI 调用", value: "3,456", change: "+15%", icon: Tags, trend: "up" },
    { label: "存储使用率", value: "85%", change: "+5%", icon: Clock, trend: "up" },
  ]

  const weeklyTaskData = [
    { day: "周一", tasks: 45, success: 42 },
    { day: "周二", tasks: 52, success: 48 },
    { day: "周三", tasks: 48, success: 46 },
    { day: "周四", tasks: 61, success: 58 },
    { day: "周五", tasks: 55, success: 51 },
    { day: "周六", tasks: 38, success: 36 },
    { day: "周日", tasks: 42, success: 40 },
  ]

  const weeklyQuestionData = [
    { day: "周一", count: 234 },
    { day: "周二", count: 312 },
    { day: "周三", count: 298 },
    { day: "周四", count: 356 },
    { day: "周五", count: 321 },
    { day: "周六", count: 198 },
    { day: "周日", count: 245 },
  ]

  const pendingItems = {
    reviewQuestions: 12,
    failedTasks: 3,
    quotaWarnings: 2,
  }

  const recentTasks = [
    {
      id: 1,
      name: "高中数学试卷.pdf",
      status: "success",
      questions: 12,
      time: "5分钟前",
      provider: "Aliyun OCR",
      duration: "45s",
    },
    {
      id: 2,
      name: "物理习题集.docx",
      status: "processing",
      questions: 8,
      time: "10分钟前",
      provider: "Baidu OCR",
      duration: "-",
    },
    {
      id: 3,
      name: "化学题库.pdf",
      status: "success",
      questions: 15,
      time: "25分钟前",
      provider: "Tencent OCR",
      duration: "52s",
    },
    {
      id: 4,
      name: "生物练习题.doc",
      status: "failed",
      questions: 0,
      time: "1小时前",
      provider: "Aliyun OCR",
      duration: "12s",
      error: "OCR识别失败",
    },
  ]

  const highPriorityAlerts = [
    { type: "error", message: "存储空间即将满，请及时清理", time: "刚刚", priority: "high" },
    { type: "warning", message: "OCR API 调用成功率下降至 92%", time: "10分钟前", priority: "medium" },
  ]

  return (
    <div className="space-y-6">
      {highPriorityAlerts.length > 0 && (
        <div className="space-y-2">
          {highPriorityAlerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === "error" ? "destructive" : "default"} className="border-l-4">
              <AlertTriangle className="w-5 h-5" />
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                <span className="text-xs">{alert.time}</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-8">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">欢迎回来，管理员！</h2>
            <p className="text-gray-600 mb-6">快速开始录题或管理系统配置</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) =>
                action.isPrimary ? (
                  <TooltipProvider key={index}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="relative h-24" data-start-record-button>
                          <Button
                            size="lg"
                            className="h-full w-full text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            onClick={action.action}
                            disabled={hasIncompleteTask}
                          >
                            {hasIncompleteTask ? (
                              <Lock className="w-7 h-7 mr-3" />
                            ) : (
                              <action.icon className="w-7 h-7 mr-3" />
                            )}
                            {action.label}
                          </Button>
                          {isDismissed && (
                            <PostponedTaskButton
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRestoreTask()
                              }}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      {hasIncompleteTask && !isDismissed && (
                        <TooltipContent>
                          <p>请先处理未完成任务</p>
                        </TooltipContent>
                      )}
                    </UITooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    key={index}
                    size="lg"
                    variant="outline"
                    className="h-24 text-base hover:bg-gray-50 bg-white border-2"
                    onClick={action.action}
                  >
                    <action.icon className="w-5 h-5 mr-2" />
                    {action.label}
                  </Button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <span
                  className={`text-sm font-semibold px-2 py-1 rounded ${
                    stat.change.startsWith("+") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="w-5 h-5" />
            待处理事项
          </CardTitle>
          <CardDescription>需要您关注的重要任务</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 bg-white border-2 hover:bg-orange-50"
              onClick={() => onNavigate("questions")}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">{pendingItems.reviewQuestions}</span>
              </div>
              <span className="text-sm text-gray-600">待审核题目</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 bg-white border-2 hover:bg-red-50"
              onClick={() => onNavigate("upload")}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-bold text-red-600">{pendingItems.failedTasks}</span>
              </div>
              <span className="text-sm text-gray-600">失败任务</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 bg-white border-2 hover:bg-yellow-50"
              onClick={() => onNavigate("quota")}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">{pendingItems.quotaWarnings}</span>
              </div>
              <span className="text-sm text-gray-600">配额告警</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>任务趋势（近7天）</CardTitle>
            <CardDescription>解析任务总数与成功率</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyTaskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3b82f6" name="总任务" />
                <Bar dataKey="success" fill="#10b981" name="成功" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>题目增长（近7天）</CardTitle>
            <CardDescription>每日新增题目数量</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyQuestionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} name="题目数" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>最近 10 个解析任务</CardTitle>
            <CardDescription>显示状态、供应商、耗时、错误信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div key={task.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      {task.status === "success" && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                      {task.status === "processing" && (
                        <Clock className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                      )}
                      {task.status === "failed" && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{task.time}</span>
                          <span>·</span>
                          <span>{task.provider}</span>
                          <span>·</span>
                          <span>{task.duration}</span>
                          {task.questions > 0 && (
                            <>
                              <span>·</span>
                              <span>{task.questions} 题</span>
                            </>
                          )}
                        </div>
                        {task.error && <p className="text-xs text-red-600 mt-1">{task.error}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 bg-white border-2 hover:bg-gray-50"
              onClick={() => onNavigate("upload")}
            >
              查看全部任务
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">系统告警</CardTitle>
            <CardDescription>重要通知和异常提醒</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highPriorityAlerts
                .filter((alert) => alert.priority !== "high")
                .map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 border ${
                      alert.type === "warning"
                        ? "bg-orange-50 border-orange-500"
                        : alert.type === "info"
                          ? "bg-blue-50 border-blue-500"
                          : "bg-green-50 border-green-500"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-5 h-5 mt-0.5 ${
                          alert.type === "warning"
                            ? "text-orange-600"
                            : alert.type === "info"
                              ? "text-blue-600"
                              : "text-green-600"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 bg-white border-2 hover:bg-gray-50"
              onClick={() => onNavigate("alerts")}
            >
              查看全部告警
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">AI 用量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">OCR 识别</span>
                  <span className="font-medium">67%</span>
                </div>
                <Progress value={67} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">LLM 解析</span>
                  <span className="font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">存储占用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">文件缓存</span>
                  <span className="font-medium">8.5 GB / 10 GB</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">题库数据</span>
                  <span className="font-medium">2.3 GB / 5 GB</span>
                </div>
                <Progress value={46} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">今日成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900 mb-2">¥ 128</p>
              <p className="text-sm text-gray-600 mb-4">预算: ¥ 500/天</p>
              <Progress value={25.6} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
