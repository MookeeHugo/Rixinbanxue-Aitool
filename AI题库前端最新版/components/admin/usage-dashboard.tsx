"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Label } from "@/components/ui/label"
import { FileText, Zap, HardDrive, Download, AlertTriangle, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const mockTenants = [
  {
    id: 1,
    name: "张三",
    plan: "Pro",
    ocr: 320,
    ocrLimit: 500,
    llm: "450K",
    llmLimit: "500K",
    storage: "3.2GB",
    storageLimit: "5GB",
    exports: 45,
    status: "normal",
  },
  {
    id: 2,
    name: "李四",
    plan: "Free",
    ocr: 9,
    ocrLimit: 10,
    llm: "9.5K",
    llmLimit: "10K",
    storage: "95MB",
    storageLimit: "100MB",
    exports: 5,
    status: "warning",
  },
  {
    id: 3,
    name: "王五",
    plan: "Enterprise",
    ocr: 2500,
    ocrLimit: "∞",
    llm: "2.5M",
    llmLimit: "∞",
    storage: "50GB",
    storageLimit: "∞",
    exports: 230,
    status: "normal",
  },
]

export function AdminUsageDashboard() {
  const [timeRange, setTimeRange] = useState("month")
  const [selectedTenant, setSelectedTenant] = useState("all")
  const [showQuotaDialog, setShowQuotaDialog] = useState(false)
  const [selectedTenantForQuota, setSelectedTenantForQuota] = useState<any>(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>用量统计</CardTitle>
          <CardDescription>各租户/会员的资源消耗情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">本周</SelectItem>
                  <SelectItem value="month">本月</SelectItem>
                  <SelectItem value="quarter">本季度</SelectItem>
                  <SelectItem value="year">本年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="选择租户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部租户</SelectItem>
                  <SelectItem value="1">张三</SelectItem>
                  <SelectItem value="2">李四</SelectItem>
                  <SelectItem value="3">王五</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出报表
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">OCR总页数</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,829</div>
            <p className="text-xs text-muted-foreground">本月使用</p>
            <div className="mt-4 h-20 flex items-end gap-1">
              {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${height}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">LLM Tokens</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.95M</div>
            <p className="text-xs text-muted-foreground">本月消耗</p>
            <div className="mt-4 h-20 flex items-end gap-1">
              {[65, 55, 75, 60, 80, 70, 85].map((height, i) => (
                <div key={i} className="flex-1 bg-green-500 rounded-t" style={{ height: `${height}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">存储占用</CardTitle>
            <HardDrive className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">53.2 GB</div>
            <p className="text-xs text-muted-foreground">总占用空间</p>
            <div className="mt-4 h-20 flex items-end gap-1">
              {[50, 60, 55, 70, 65, 75, 80].map((height, i) => (
                <div key={i} className="flex-1 bg-purple-500 rounded-t" style={{ height: `${height}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>租户用量详情</CardTitle>
          <CardDescription>各租户的资源使用情况和剩余配额</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>租户</TableHead>
                <TableHead>套餐</TableHead>
                <TableHead>OCR页数</TableHead>
                <TableHead>LLM Token</TableHead>
                <TableHead>存储</TableHead>
                <TableHead>导出次数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTenants.map((tenant) => (
                <TableRow key={tenant.id} className={tenant.status === "warning" ? "bg-orange-50" : ""}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tenant.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12">
                        <svg className="transform -rotate-90" width="48" height="48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="4"
                            strokeDasharray={`${tenant.ocrLimit !== "∞" ? (tenant.ocr / Number(tenant.ocrLimit)) * 125 : 0} 125`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {tenant.ocrLimit !== "∞"
                              ? `${Math.round((tenant.ocr / Number(tenant.ocrLimit)) * 100)}%`
                              : "∞"}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">{tenant.ocr}</div>
                        <div className="text-gray-500">/ {tenant.ocrLimit}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {tenant.llm}/{tenant.llmLimit}
                      </div>
                      {tenant.llmLimit !== "∞" && <Progress value={95} className="h-1" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {tenant.storage}/{tenant.storageLimit}
                      </div>
                      {tenant.storageLimit !== "∞" && <Progress value={90} className="h-1" />}
                    </div>
                  </TableCell>
                  <TableCell>{tenant.exports}</TableCell>
                  <TableCell>
                    {tenant.status === "warning" ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        接近上限
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        正常
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog
                        open={showQuotaDialog && selectedTenantForQuota?.id === tenant.id}
                        onOpenChange={(open) => {
                          setShowQuotaDialog(open)
                          if (!open) setSelectedTenantForQuota(null)
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant={tenant.status === "warning" ? "default" : "outline"}
                            onClick={() => setSelectedTenantForQuota(tenant)}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            {tenant.status === "warning" ? "扩容" : "调整"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>调整配额 - {tenant.name}</DialogTitle>
                            <DialogDescription>当前套餐: {tenant.plan}</DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4 py-4">
                            <div>
                              <Label>OCR 页数</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Input type="number" defaultValue={tenant.ocrLimit !== "∞" ? tenant.ocrLimit : 1000} />
                                <span className="text-sm text-gray-500">页/月</span>
                              </div>
                            </div>
                            <div>
                              <Label>LLM Token</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Input type="text" defaultValue={tenant.llmLimit} />
                                <span className="text-sm text-gray-500">Token/月</span>
                              </div>
                            </div>
                            <div>
                              <Label>存储空间</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Input type="text" defaultValue={tenant.storageLimit} />
                              </div>
                            </div>

                            <Card className="bg-blue-50 border-blue-200">
                              <CardContent className="p-4">
                                <div className="text-sm">
                                  <div className="font-semibold mb-2">预估费用变化</div>
                                  <div className="space-y-1 text-gray-700">
                                    <div>当前: ¥99/月</div>
                                    <div>调整后: ¥199/月</div>
                                    <div className="text-blue-600 font-medium">差额: +¥100/月</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowQuotaDialog(false)}>
                              取消
                            </Button>
                            <Button onClick={() => setShowQuotaDialog(false)}>确认调整</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button size="sm" variant="ghost">
                        详情
                      </Button>
                    </div>
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
