"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Upload, Download, Search, Edit, Trash2, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AdminTagSystem() {
  const [searchTerm, setSearchTerm] = useState("")

  const knowledgeTags = [
    { id: 1, name: "集合", parent: "代数", usageCount: 245, status: "active" },
    { id: 2, name: "函数", parent: "代数", usageCount: 532, status: "active" },
    { id: 3, name: "三角函数", parent: "几何", usageCount: 423, status: "active" },
    { id: 4, name: "导数", parent: "微积分", usageCount: 198, status: "active" },
  ]

  const difficultyTags = [
    { id: 1, name: "简单", level: 1, usageCount: 456, status: "active" },
    { id: 2, name: "中等", level: 2, usageCount: 789, status: "active" },
    { id: 3, name: "困难", level: 3, usageCount: 234, status: "active" },
  ]

  const methodTags = [
    { id: 1, name: "归纳推理", usageCount: 156, status: "active" },
    { id: 2, name: "演绎推理", usageCount: 234, status: "active" },
    { id: 3, name: "类比推理", usageCount: 178, status: "active" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>标签体系管理</CardTitle>
              <CardDescription>维护知识点、难度、思维方法等分类标签</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                新建标签
              </Button>
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                批量导入
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                导出CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="knowledge" className="space-y-4">
            <TabsList>
              <TabsTrigger value="knowledge">知识点</TabsTrigger>
              <TabsTrigger value="difficulty">难易程度</TabsTrigger>
              <TabsTrigger value="method">思维方法</TabsTrigger>
              <TabsTrigger value="textbook">教材版本</TabsTrigger>
              <TabsTrigger value="grade">年级</TabsTrigger>
            </TabsList>

            <TabsContent value="knowledge" className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索知识点..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  添加知识点
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标签名称</TableHead>
                    <TableHead>父级分类</TableHead>
                    <TableHead>使用频次</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {knowledgeTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        {tag.name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{tag.parent}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tag.usageCount} 次</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">启用</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="difficulty" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>难度等级</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>使用频次</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {difficultyTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>Level {tag.level}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tag.usageCount} 次</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="method" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>思维方法</TableHead>
                    <TableHead>使用频次</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methodTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tag.usageCount} 次</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="textbook">
              <div className="text-center py-12 text-gray-500">教材版本标签管理</div>
            </TabsContent>

            <TabsContent value="grade">
              <div className="text-center py-12 text-gray-500">年级标签管理</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
