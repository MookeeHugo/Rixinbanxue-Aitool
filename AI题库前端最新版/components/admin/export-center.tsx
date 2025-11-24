"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, CheckCircle, Clock, XCircle, Plus, FileSpreadsheet } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function AdminExportCenter() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const exportTasks = [
    {
      id: 1,
      name: "高中数学题库-2024Q4",
      format: "Excel",
      status: "completed",
      progress: 100,
      fileSize: "2.4 MB",
      questionCount: 320,
      creator: "张老师",
      createTime: "2024-11-20 14:30",
      downloadUrl: "#",
    },
    {
      id: 2,
      name: "物理选择题合集",
      format: "Word",
      status: "processing",
      progress: 65,
      fileSize: "-",
      questionCount: 150,
      creator: "李老师",
      createTime: "2024-11-20 15:10",
      downloadUrl: null,
    },
    {
      id: 3,
      name: "化学实验题库",
      format: "PDF",
      status: "failed",
      progress: 0,
      fileSize: "-",
      questionCount: 80,
      creator: "王老师",
      createTime: "2024-11-20 13:45",
      downloadUrl: null,
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>导出中心</CardTitle>
            <CardDescription>管理题目导出任务和下载历史</CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新建导出
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新建导出任务</DialogTitle>
                <DialogDescription>选择要导出的题目范围和格式</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>导出名称</Label>
                  <Input className="mt-2" placeholder="例如: 高中数学题库-2024Q4" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>导出格式</Label>
                    <Select defaultValue="excel">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="word">Word (.docx)</SelectItem>
                        <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>题目范围</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部题目</SelectItem>
                        <SelectItem value="selected">已选题目</SelectItem>
                        <SelectItem value="custom">自定义筛选</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>包含内容</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="include-question" defaultChecked />
                      <label htmlFor="include-question" className="text-sm">
                        题干
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="include-options" defaultChecked />
                      <label htmlFor="include-options" className="text-sm">
                        选项
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="include-answer" defaultChecked />
                      <label htmlFor="include-answer" className="text-sm">
                        答案
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="include-explanation" />
                      <label htmlFor="include-explanation" className="text-sm">
                        解析
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="include-tags" defaultChecked />
                      <label htmlFor="include-tags" className="text-sm">
                        标签
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="include-images" />
                      <label htmlFor="include-images" className="text-sm">
                        图片
                      </label>
                    </div>
                  </div>
                </div>

                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-700">
                      <div className="font-medium mb-1">预计导出</div>
                      <div>题目数量: 320 道</div>
                      <div>预估文件大小: 约 2.5 MB</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => setShowCreateDialog(false)}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  开始导出
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>导出名称</TableHead>
                <TableHead>格式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>题目数</TableHead>
                <TableHead>文件大小</TableHead>
                <TableHead>创建人</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.format}</Badge>
                  </TableCell>
                  <TableCell>
                    {task.status === "completed" && (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        已完成
                      </Badge>
                    )}
                    {task.status === "processing" && (
                      <Badge className="bg-blue-100 text-blue-700 gap-1">
                        <Clock className="w-3 h-3" />
                        处理中
                      </Badge>
                    )}
                    {task.status === "failed" && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        失败
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 w-32">
                      <Progress value={task.progress} className="h-2" />
                      <div className="text-xs text-gray-500">{task.progress}%</div>
                    </div>
                  </TableCell>
                  <TableCell>{task.questionCount}</TableCell>
                  <TableCell>{task.fileSize}</TableCell>
                  <TableCell className="text-sm text-gray-600">{task.creator}</TableCell>
                  <TableCell className="text-sm text-gray-600">{task.createTime}</TableCell>
                  <TableCell>
                    {task.status === "completed" && (
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                    )}
                    {task.status === "failed" && (
                      <Button size="sm" variant="outline">
                        重试
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
