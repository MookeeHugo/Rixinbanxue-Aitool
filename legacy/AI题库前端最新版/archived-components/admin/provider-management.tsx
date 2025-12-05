"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, GripVertical, Play, RotateCcw, Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export function AdminProviderManagement() {
  const [providers, setProviders] = useState([
    { id: 1, name: "Aliyun OCR", type: "OCR", status: "healthy", success: "98.5%", cost: "¥45/天", priority: 1 },
    { id: 2, name: "Baidu OCR", type: "OCR", status: "healthy", success: "97.2%", cost: "¥38/天", priority: 2 },
    { id: 3, name: "OpenAI GPT-4", type: "LLM", status: "warning", success: "95.1%", cost: "¥120/天", priority: 1 },
    { id: 4, name: "Aliyun OSS", type: "Storage", status: "healthy", success: "99.9%", cost: "¥12/天", priority: 1 },
  ])

  const [showExperiment, setShowExperiment] = useState(false)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Provider & API 管理</CardTitle>
            <CardDescription>拖拽调整优先级，配置策略和实验</CardDescription>
          </div>
          <Dialog open={showExperiment} onOpenChange={setShowExperiment}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Play className="w-4 h-4 mr-2" />
                A/B 实验面板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>供应商 A/B 实验</DialogTitle>
                <DialogDescription>配置实验策略，对比不同供应商的效果</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="config" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="config">实验配置</TabsTrigger>
                  <TabsTrigger value="results">结果对比</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>策略 A</Label>
                      <Select defaultValue="aliyun">
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aliyun">Aliyun OCR</SelectItem>
                          <SelectItem value="baidu">Baidu OCR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>策略 B</Label>
                      <Select defaultValue="baidu">
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aliyun">Aliyun OCR</SelectItem>
                          <SelectItem value="baidu">Baidu OCR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>流量分配</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm">策略 A: 50%</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-1/2 bg-blue-500"></div>
                      </div>
                      <span className="text-sm">策略 B: 50%</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">98.5%</div>
                          <div className="text-xs text-gray-500 mt-1">策略 A 成功率</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">97.2%</div>
                          <div className="text-xs text-gray-500 mt-1">策略 B 成功率</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">+1.3%</div>
                          <div className="text-xs text-gray-500 mt-1">A 优于 B</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Badge className="bg-green-100 text-green-700">策略 A 胜出</Badge>
                    <span className="text-sm text-gray-500">建议应用策略 A</span>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExperiment(false)}>
                  取消
                </Button>
                <Button>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  应用策略
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {providers.map((provider, index) => (
              <Card key={provider.id} className="border cursor-move hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{provider.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              优先级 {provider.priority}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {provider.type}
                          </Badge>
                        </div>
                        {provider.status === "healthy" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">成功率:</span>
                          <span className="font-medium">{provider.success}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">成本:</span>
                          <span className="font-medium">{provider.cost}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Settings className="w-4 h-4 mr-1" />
                          配置
                        </Button>
                        <Button size="sm" variant="ghost">
                          <RotateCcw className="w-4 h-4 mr-1" />
                          测试
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
