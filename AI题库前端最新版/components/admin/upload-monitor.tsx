"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ImageIcon,
  FileText,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

export function AdminUploadMonitor() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  const tasks = [
    {
      id: "T001",
      fileName: "高中数学试卷2024.pdf",
      status: "success",
      provider: "Aliyun OCR",
      taskType: "试卷扫描",
      pages: 5,
      questions: 12,
      time: "2024-11-20 10:30",
      duration: "45s",
      uploader: "张老师",
      progress: 100,
      steps: [
        { name: "文件上传", status: "success", time: "5s" },
        { name: "OCR识别", status: "success", time: "25s" },
        { name: "题目切分", status: "success", time: "10s" },
        { name: "AI标注", status: "success", time: "5s" },
      ],
      imageUrls: ["/math-test-page-1.jpg", "/math-test-page-2.jpg"],
    },
    {
      id: "T002",
      fileName: "物理习题集.docx",
      status: "processing",
      provider: "Baidu OCR",
      taskType: "文档导入",
      pages: 3,
      questions: 0,
      time: "2024-11-20 10:25",
      duration: "-",
      uploader: "李老师",
      progress: 65,
      steps: [
        { name: "文件上传", status: "success", time: "3s" },
        { name: "OCR识别", status: "success", time: "18s" },
        { name: "题目切分", status: "processing", time: "-" },
        { name: "AI标注", status: "pending", time: "-" },
      ],
      imageUrls: [],
    },
    {
      id: "T003",
      fileName: "化学题库精选.pdf",
      status: "success",
      provider: "Tencent OCR",
      taskType: "试卷扫描",
      pages: 8,
      questions: 15,
      time: "2024-11-20 10:15",
      duration: "52s",
      uploader: "王老师",
      progress: 100,
      steps: [
        { name: "文件上传", status: "success", time: "4s" },
        { name: "OCR识别", status: "success", time: "30s" },
        { name: "题目切分", status: "success", time: "12s" },
        { name: "AI标注", status: "success", time: "6s" },
      ],
      imageUrls: ["/chemistry-test.jpg"],
    },
    {
      id: "T004",
      fileName: "生物练习题.doc",
      status: "failed",
      provider: "Aliyun OCR",
      taskType: "文档导入",
      pages: 2,
      questions: 0,
      time: "2024-11-20 09:50",
      duration: "12s",
      uploader: "赵老师",
      progress: 40,
      error: "OCR识别失败：文件格式不支持",
      steps: [
        { name: "文件上传", status: "success", time: "2s" },
        { name: "OCR识别", status: "failed", time: "10s", error: "文件格式不支持" },
        { name: "题目切分", status: "pending", time: "-" },
        { name: "AI标注", status: "pending", time: "-" },
      ],
      logs: [
        "[10:30:01] 开始上传文件",
        "[10:30:03] 文件上传完成，开始OCR识别",
        "[10:30:10] OCR服务返回错误: 不支持的文件格式 .doc",
        "[10:30:13] 任务失败，请转换为 .docx 或 PDF 格式后重试",
      ],
      imageUrls: [],
    },
    {
      id: "T005",
      fileName: "英语阅读理解.pdf",
      status: "success",
      provider: "Baidu OCR",
      taskType: "试卷扫描",
      pages: 4,
      questions: 8,
      time: "2024-11-20 09:30",
      duration: "38s",
      uploader: "刘老师",
      progress: 100,
      steps: [
        { name: "文件上传", status: "success", time: "3s" },
        { name: "OCR识别", status: "success", time: "22s" },
        { name: "题目切分", status: "success", time: "8s" },
        { name: "AI标注", status: "success", time: "5s" },
      ],
      imageUrls: ["/english-reading.jpg"],
    },
  ]

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesSearch =
      task.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-700 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            成功
          </Badge>
        )
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-0">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            解析中
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        )
      default:
        return null
    }
  }

  const toggleTask = (id: string) => {
    setSelectedTasks((prev) => (prev.includes(id) ? prev.filter((taskId) => taskId !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredTasks.map((t) => t.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">当前排队</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均耗时</p>
                <p className="text-2xl font-bold">45s</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">失败率</p>
                <p className="text-2xl font-bold">3.2%</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>上传任务监控</CardTitle>
              <CardDescription>实时观察文件解析任务状态和进度</CardDescription>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索文件名或任务ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="processing">解析中</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="供应商筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部供应商</SelectItem>
                <SelectItem value="aliyun">Aliyun OCR</SelectItem>
                <SelectItem value="baidu">Baidu OCR</SelectItem>
                <SelectItem value="tencent">Tencent OCR</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white border-2">
              <Download className="w-4 h-4 mr-2" />
              导出日志
            </Button>
          </div>

          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg mb-4 border-2 border-blue-200">
              <span className="text-sm font-medium text-blue-900">已选择 {selectedTasks.length} 个任务</span>
              <div className="flex gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  批量重解析
                </Button>
                <Button size="sm" variant="outline" className="bg-white">
                  <Download className="w-4 h-4 mr-2" />
                  导出日志
                </Button>
              </div>
            </div>
          )}

          <div className="border-2 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={selectedTasks.length === filteredTasks.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>任务ID</TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>任务类型</TableHead>
                  <TableHead>页数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>进度</TableHead>
                  <TableHead>题目数</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead>上传人</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox checked={selectedTasks.includes(task.id)} onCheckedChange={() => toggleTask(task.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">{task.id}</TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{task.fileName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-2">
                        {task.taskType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{task.pages}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm">{task.provider}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress} className="h-2 w-20" />
                        <span className="text-sm text-gray-600 font-medium">{task.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{task.questions}</TableCell>
                    <TableCell className="font-medium">{task.duration}</TableCell>
                    <TableCell className="text-sm text-gray-600">{task.uploader}</TableCell>
                    <TableCell className="text-sm text-gray-600">{task.time}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button size="sm" variant="ghost" className="hover:bg-blue-50">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DrawerTrigger>
                          <DrawerContent className="max-h-[90vh]">
                            <DrawerHeader>
                              <DrawerTitle>任务详情 - {task.id}</DrawerTitle>
                              <DrawerDescription>查看解析步骤、图像预览和日志</DrawerDescription>
                            </DrawerHeader>
                            <div className="overflow-y-auto px-6">
                              <Tabs defaultValue="steps" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-6">
                                  <TabsTrigger value="steps">解析步骤</TabsTrigger>
                                  <TabsTrigger value="images">
                                    图像预览 {task.imageUrls.length > 0 && `(${task.imageUrls.length})`}
                                  </TabsTrigger>
                                  <TabsTrigger value="logs">日志</TabsTrigger>
                                </TabsList>

                                <TabsContent value="steps" className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border-2">
                                    <div>
                                      <p className="text-sm text-gray-600 mb-1">文件名</p>
                                      <p className="font-medium">{task.fileName}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600 mb-1">供应商</p>
                                      <p className="font-medium">{task.provider}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600 mb-1">上传人</p>
                                      <p className="font-medium">{task.uploader}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600 mb-1">总耗时</p>
                                      <p className="font-medium">{task.duration}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-4 text-lg">解析步骤</h4>
                                    <div className="space-y-3">
                                      {task.steps.map((step, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2"
                                        >
                                          <div className="flex items-center gap-3">
                                            {step.status === "success" && (
                                              <CheckCircle className="w-5 h-5 text-green-600" />
                                            )}
                                            {step.status === "processing" && (
                                              <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                                            )}
                                            {step.status === "failed" && <XCircle className="w-5 h-5 text-red-600" />}
                                            {step.status === "pending" && <Clock className="w-5 h-5 text-gray-400" />}
                                            <div>
                                              <p className="font-medium text-sm">{step.name}</p>
                                              {step.error && <p className="text-xs text-red-600 mt-1">{step.error}</p>}
                                            </div>
                                          </div>
                                          <span className="text-sm text-gray-600 font-medium">{step.time}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {task.error && (
                                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                                      <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        错误信息
                                      </h4>
                                      <p className="text-sm text-red-700">{task.error}</p>
                                    </div>
                                  )}
                                </TabsContent>

                                <TabsContent value="images">
                                  {task.imageUrls.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                      {task.imageUrls.map((url, index) => (
                                        <div key={index} className="border-2 rounded-lg overflow-hidden bg-gray-50">
                                          <img
                                            src={url || "/placeholder.svg"}
                                            alt={`Page ${index + 1}`}
                                            className="w-full h-auto"
                                          />
                                          <div className="p-2 text-center text-sm text-gray-600 bg-white border-t-2">
                                            第 {index + 1} 页
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 text-gray-500">
                                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                      <p>暂无图像预览</p>
                                    </div>
                                  )}
                                </TabsContent>

                                <TabsContent value="logs">
                                  {task.logs ? (
                                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-1 border-2">
                                      {task.logs.map((log, index) => (
                                        <div key={index}>{log}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 text-gray-500">
                                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                      <p>暂无详细日志</p>
                                    </div>
                                  )}
                                </TabsContent>
                              </Tabs>
                            </div>
                            <DrawerFooter className="border-t-2">
                              {task.status === "failed" && (
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  重新解析
                                </Button>
                              )}
                              <DrawerClose asChild>
                                <Button variant="outline" className="w-full bg-white border-2">
                                  关闭
                                </Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </DrawerContent>
                        </Drawer>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
