"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AdvancedQuestionEditor } from "@/components/advanced-question-editor"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import DebugPanel from "@/components/debug-panel"
import { FileUpload } from "@/components/file-upload"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const mockQuestion = {
  id: "test-1",
  type: "choice" as const,
  rawText: "若集台 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则満足条件 A ⊆ C ⊆ B 的集合 C 的个数为",
  cleanText: "若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为",
  options: ["1", "2", "3", "4"],
  answer: "D",
  images: [
    {
      id: "img-1",
      url: "/set-theory-venn-diagram.jpg",
      pageIndex: 1,
      position: 1,
      width: 80,
      align: "center" as const,
      confidence: 0.95,
      used: false,
    },
    {
      id: "img-2",
      url: "/sine-function-graph-with-period-pi.jpg",
      pageIndex: 1,
      position: 2,
      width: 70,
      align: "left" as const,
      confidence: 0.72,
      used: false,
    },
  ],
  aiTags: [
    { category: "知识点", value: "集合", confidence: 0.95 },
    { category: "难易程度", value: "中等", confidence: 0.88 },
    { category: "学段", value: "高一", confidence: 0.92 },
  ],
  confidence: 0.82,
}

export default function TestComponentsPage() {
  const [showEditor, setShowEditor] = useState(false)
  const [showLoading, setShowLoading] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">组件测试场景</h1>
          <p className="text-base md:text-lg text-gray-600">用于演示各种组件状态和交互效果</p>
        </div>

        <Tabs defaultValue="states" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="states">状态组件</TabsTrigger>
            <TabsTrigger value="editor">编辑器</TabsTrigger>
            <TabsTrigger value="upload">上传</TabsTrigger>
            <TabsTrigger value="debug">调试面板</TabsTrigger>
          </TabsList>

          {/* States Tab */}
          <TabsContent value="states" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">空状态组件</h3>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Badge className="mb-2">无题目</Badge>
                  <EmptyState
                    icon="FileQuestion"
                    title="暂无题目"
                    description="点击新增题目开始录入"
                    actionLabel="新增题目"
                    onAction={() => alert("跳转到上传页面")}
                  />
                </div>
                <div>
                  <Badge className="mb-2">无解析任务</Badge>
                  <EmptyState
                    icon="Inbox"
                    title="暂无解析任务"
                    description="请先上传文件以创建解析任务"
                    actionLabel="上传文件"
                    onAction={() => alert("跳转到上传页面")}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">错误状态组件</h3>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Badge variant="error" className="mb-2">
                    解析失败
                  </Badge>
                  <ErrorState
                    title="解析失败"
                    message="OCR 识别错误，请检查文件格式"
                    onRetry={() => alert("重试解析")}
                  />
                </div>
                <div>
                  <Badge variant="error" className="mb-2">
                    网络错误
                  </Badge>
                  <ErrorState
                    title="网络连接失败"
                    message="无法连接到服务器，请检查网络连接"
                    onRetry={() => alert("重新连接")}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">加载状态</h3>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <Button onClick={() => setShowLoading(!showLoading)}>{showLoading ? "隐藏加载" : "显示加载"}</Button>
                  <Badge>{showLoading ? "加载中" : "空闲"}</Badge>
                </div>
                {showLoading && (
                  <div className="space-y-4">
                    <SkeletonLoader type="card" count={2} />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">超级编辑器</h3>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex gap-4 items-center flex-wrap">
                  <Button onClick={() => setShowEditor(true)}>打开编辑器</Button>
                  <Badge>包含原图对照、拖拽插入、AI标签</Badge>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">功能清单:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>左侧可编辑的OCR文本区域</li>
                    <li>右侧素材面板展示未使用图片</li>
                    <li>拖拽图片到编辑器插入</li>
                    <li>已插入图片可调整宽度、对齐、说明</li>
                    <li>低置信度题目显示原始OCR对照</li>
                    <li>AI建议标签供参考</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">文件上传组件</h3>
              <Separator className="my-4" />
              <FileUpload />
            </Card>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">调试面板</h3>
              <Separator className="my-4" />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  调试面板允许动态调整 Mock API 行为，包括上传延迟、解析速度、失败概率等。
                </p>
              </div>
              <DebugPanel />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-7xl h-[90vh] p-0">
          <AdvancedQuestionEditor
            question={mockQuestion}
            onSave={(q) => {
              console.log("Saved:", q)
              setShowEditor(false)
            }}
            onCancel={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
