"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, Plus, XCircle, Clock, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type ExportStatus = "completed" | "processing" | "failed"

interface ExportTask {
  id: number
  name: string
  format: "Excel" | "Word" | "PDF"
  creator: string
  questionCount: number
  fileSize: string
  status: ExportStatus
  progress: number
  createdAt: string
  downloadUrl?: string | null
}

const MOCK_TASKS: ExportTask[] = [
  {
    id: 1,
    name: "高中数学题库（2024 Q4）",
    format: "Excel",
    creator: "张老师",
    questionCount: 320,
    fileSize: "2.4 MB",
    status: "completed",
    progress: 100,
    createdAt: "2024-11-20 14:30",
    downloadUrl: "#",
  },
  {
    id: 2,
    name: "物理高频选择题合集",
    format: "Word",
    creator: "李老师",
    questionCount: 150,
    fileSize: "-",
    status: "processing",
    progress: 68,
    createdAt: "2024-11-20 15:10",
  },
  {
    id: 3,
    name: "化学实验题库（含解析）",
    format: "PDF",
    creator: "王老师",
    questionCount: 80,
    fileSize: "-",
    status: "failed",
    progress: 0,
    createdAt: "2024-11-20 13:45",
  },
]

const formatLabels: Record<ExportTask["format"], string> = {
  Excel: "Excel",
  Word: "Word",
  PDF: "PDF",
}

const statusBadge: Record<ExportStatus, { label: string; variant: "success" | "warning" | "error" }> = {
  completed: { label: "已完成", variant: "success" },
  processing: { label: "生成中", variant: "warning" },
  failed: { label: "失败", variant: "error" },
}

export function AdminExportCenter() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [tasks] = useState(MOCK_TASKS)
  const [filter, setFilter] = useState<ExportStatus | "all">("all")

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks
    return tasks.filter((task) => task.status === filter)
  }, [tasks, filter])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>导出中心</CardTitle>
            <CardDescription>集中查看各版本题库导出任务，支持生成 Excel / Word / PDF。</CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新建导出任务
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>创建导出任务</DialogTitle>
                <DialogDescription>选择题库范围、输出格式与通知方式，立即生成导出文件。</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-name">任务名称</Label>
                  <Input id="export-name" placeholder="示例：高一必修一题库" />
                </div>
                <div className="space-y-2">
                  <Label>导出格式</Label>
                  <Select defaultValue="Excel">
                    <SelectTrigger>
                      <SelectValue placeholder="选择格式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excel">Excel</SelectItem>
                      <SelectItem value="Word">Word</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>包含内容</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {["题干与选项", "解析与答案", "AI 标签"].map((label) => (
                      <label key={label} className="flex items-center gap-2 text-sm">
                        <Checkbox checked />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => setShowCreateDialog(false)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  创建任务
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {(["all", "completed", "processing", "failed"] as const).map((type) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              onClick={() => setFilter(type)}
            >
              {type === "all" ? "全部" : statusBadge[type].label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>导出任务列表</CardTitle>
          <CardDescription>最近 30 天内发起的导出任务。</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>格式</TableHead>
                <TableHead>创建人</TableHead>
                <TableHead>题目数</TableHead>
                <TableHead>文件大小</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-semibold">{task.name}</div>
                    <div className="text-xs text-muted-foreground">{task.createdAt}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatLabels[task.format]}</Badge>
                  </TableCell>
                  <TableCell>{task.creator}</TableCell>
                  <TableCell>{task.questionCount.toLocaleString()}</TableCell>
                  <TableCell>{task.fileSize}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[task.status].variant}>{statusBadge[task.status].label}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <Progress value={task.progress} className="h-2" />
                  </TableCell>
                  <TableCell className="text-right">
                    {task.status === "completed" && task.downloadUrl ? (
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        下载
                      </Button>
                    ) : task.status === "failed" ? (
                      <Button variant="destructive" size="sm">
                        <XCircle className="mr-2 h-4 w-4" />
                        重试
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        <Clock className="mr-2 h-4 w-4" />
                        生成中
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
