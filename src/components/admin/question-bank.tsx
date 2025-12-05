"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  XCircle,
  Download,
  Search,
  Eye,
  Trash2,
  ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Image from "next/image"

export function AdminQuestionBank() {
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const questions = [
    {
      id: 1,
      content: "若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件...",
      type: "选择题",
      difficulty: "中等",
      subject: "数学",
      grade: "高中",
      tags: ["集合", "函数"],
      status: "待审核",
      aiConfidence: 0.95,
      submitter: "张老师",
      submitTime: "2024-11-20 10:30",
      hasImage: true,
    },
    {
      id: 2,
      content: "已知函数 f(x) = 2sin(x + π/3)，求函数的最小正周期和最大值...",
      type: "解答题",
      difficulty: "困难",
      subject: "数学",
      grade: "高中",
      tags: ["三角函数", "周期函数"],
      status: "已发布",
      aiConfidence: 0.88,
      submitter: "李老师",
      submitTime: "2024-11-20 09:15",
      hasImage: false,
    },
    {
      id: 3,
      content: "在△ABC中，已知a=3，b=4，C=60°，求边c的长度",
      type: "计算题",
      difficulty: "简单",
      subject: "数学",
      grade: "高中",
      tags: ["三角形", "余弦定理"],
      status: "草稿",
      aiConfidence: 0.92,
      submitter: "王老师",
      submitTime: "2024-11-20 08:45",
      hasImage: false,
    },
  ]

  const filteredQuestions = questions.filter((q) => {
    const matchesStatus = statusFilter === "all" || q.status === statusFilter
    const matchesSearch = q.content.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleQuestion = (id: number) => {
    setSelectedQuestions((prev) => (prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([])
    } else {
      setSelectedQuestions(filteredQuestions.map((q) => q.id))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>题库审核与管理</CardTitle>
          <CardDescription>审核、批量操作、导出题目</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索题目内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="草稿">草稿</SelectItem>
                  <SelectItem value="待审核">待审核</SelectItem>
                  <SelectItem value="已发布">已发布</SelectItem>
                  <SelectItem value="已打回">已打回</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="科目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">数学</SelectItem>
                  <SelectItem value="physics">物理</SelectItem>
                  <SelectItem value="chemistry">化学</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Batch Actions */}
            {selectedQuestions.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">已选择 {selectedQuestions.length} 题</span>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    批量通过
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    批量打回
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    导出
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </Button>
                </div>
              </div>
            )}

            {/* Questions Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedQuestions.length === filteredQuestions.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>题目内容</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>难度</TableHead>
                  <TableHead>标签</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>AI 置信度</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={() => toggleQuestion(question.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-md">
                        {question.hasImage && <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        <span className="text-sm truncate">{question.content}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          question.difficulty === "简单"
                            ? "bg-green-100 text-green-700"
                            : question.difficulty === "中等"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }
                      >
                        {question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {question.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          question.status === "已发布"
                            ? "bg-green-100 text-green-700"
                            : question.status === "待审核"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                        }
                      >
                        {question.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{(question.aiConfidence * 100).toFixed(0)}%</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{question.submitter}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>题目详情审核</SheetTitle>
                              <SheetDescription>查看完整内容、原图对照和AI建议</SheetDescription>
                            </SheetHeader>
                            <Tabs defaultValue="content" className="mt-6">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="content">题目内容</TabsTrigger>
                                <TabsTrigger value="ocr">原图对照</TabsTrigger>
                                <TabsTrigger value="similar">相似题推荐</TabsTrigger>
                              </TabsList>

                              <TabsContent value="content" className="space-y-6">
                                <div>
                                  <h4 className="font-semibold mb-2">题干</h4>
                                  <p className="text-sm text-gray-700 leading-relaxed">{question.content}</p>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">当前标签</h4>
                                    <Badge variant="outline" className="text-xs">
                                      AI 置信度: {(question.aiConfidence * 100).toFixed(0)}%
                                    </Badge>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {question.tags.map((tag, idx) => (
                                      <Badge key={idx} className="bg-blue-100 text-blue-700">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                {/* AI suggested tags section */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <h4 className="font-semibold">AI 建议标签</h4>
                                    <Badge variant="outline" className="text-xs">
                                      仅供参考
                                    </Badge>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                                      二次函数 <span className="ml-1 text-xs opacity-70">92%</span>
                                    </Badge>
                                    <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                                      求根公式 <span className="ml-1 text-xs opacity-70">88%</span>
                                    </Badge>
                                    <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                                      函数性质 <span className="ml-1 text-xs opacity-70">75%</span>
                                    </Badge>
                                  </div>
                                </div>
                              </TabsContent>

                              {/* OCR comparison tab */}
                              <TabsContent value="ocr" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">原始图片</h4>
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                      {question.hasImage ? (
                                        <Image
                                          src="/set-theory-venn-diagram.jpg"
                                          alt="原题图片"
                                          width={300}
                                          height={200}
                                          className="w-full rounded"
                                        />
                                      ) : (
                                        <div className="text-center text-gray-400 py-8">无图片</div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">OCR 识别文本</h4>
                                    <div className="border rounded-lg p-4 bg-gray-50 h-full">
                                      <p className="text-sm leading-relaxed">{question.content}</p>
                                      {question.aiConfidence < 0.9 && (
                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                          低置信度区域可能存在识别错误，请仔细核对
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              {/* Similar questions tab */}
                              <TabsContent value="similar" className="space-y-4">
                                <div className="text-sm text-gray-500 mb-4">基于知识点和题型相似度推荐</div>
                                <div className="space-y-3">
                                  {[1, 2].map((idx) => (
                                    <Card key={idx} className="border-l-4 border-l-blue-500">
                                      <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                          <Badge variant="outline" className="text-xs">
                                            相似度 {95 - idx * 5}%
                                          </Badge>
                                          <Badge>集合</Badge>
                                        </div>
                                        <p className="text-sm text-gray-700">
                                          已知集合 A = {`{x | x² - 5x + 6 = 0}`}，B = {`{x | x > 2}`}，则 A ∩ B = ?
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                          <Button size="sm" variant="ghost">
                                            查看详情
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </TabsContent>
                            </Tabs>

                            <div className="flex gap-2 pt-4 mt-6 border-t">
                              <Button className="flex-1" size="sm">
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                通过审核
                              </Button>
                              <Button variant="outline" className="flex-1 bg-transparent" size="sm">
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                打回修改
                              </Button>
                            </div>
                          </SheetContent>
                        </Sheet>
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
