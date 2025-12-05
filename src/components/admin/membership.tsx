"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, Crown, Zap, Building, Plus, Edit, Eye } from "lucide-react"

const plans = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    price: "¥0",
    period: "/月",
    storage: "100MB",
    ocrPages: "10页/月",
    llmTokens: "10K Tokens/月",
    exports: "5次/月",
    concurrent: 1,
    features: ["基础题目解析", "手动标签", "CSV导出"],
    color: "bg-gray-500",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    price: "¥99",
    period: "/月",
    storage: "5GB",
    ocrPages: "500页/月",
    llmTokens: "500K Tokens/月",
    exports: "无限制",
    concurrent: 5,
    features: ["AI自动标注", "高级搜索", "批量导出", "API访问", "优先支持"],
    color: "bg-blue-600",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building,
    price: "定制",
    period: "",
    storage: "无限制",
    ocrPages: "无限制",
    llmTokens: "无限制",
    exports: "无限制",
    concurrent: 20,
    features: ["私有部署", "专属客服", "定制开发", "SLA保证", "数据迁移"],
    color: "bg-purple-600",
  },
]

const mockUsers = [
  {
    id: 1,
    name: "张三",
    email: "zhang@example.com",
    plan: "Pro",
    expiry: "2025-12-31",
    storage: "3.2GB/5GB",
    ocr: "320/500",
    llm: "450K/500K",
  },
  {
    id: 2,
    name: "李四",
    email: "li@example.com",
    plan: "Free",
    expiry: "-",
    storage: "85MB/100MB",
    ocr: "8/10",
    llm: "7K/10K",
  },
  {
    id: 3,
    name: "王五",
    email: "wang@example.com",
    plan: "Enterprise",
    expiry: "2026-06-30",
    storage: "无限制",
    ocr: "无限制",
    llm: "无限制",
  },
]

const mockOrders = [
  {
    id: "ORD001",
    user: "张三",
    amount: "¥99",
    method: "微信支付",
    time: "2025-01-15 10:30",
    status: "已完成",
    invoice: "已开",
  },
  {
    id: "ORD002",
    user: "王五",
    amount: "¥9999",
    method: "对公转账",
    time: "2025-01-10 14:20",
    status: "已完成",
    invoice: "已开",
  },
]

export function AdminMembership() {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(plans[1])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">套餐管理</h2>
            <p className="text-sm text-muted-foreground">设置不同等级的配额和价格</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新建套餐
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? "border-2 border-primary shadow-lg" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">最受欢迎</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-lg ${plan.color} flex items-center justify-center`}>
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPlan(plan)
                      setEditDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">存储空间</span>
                    <span className="font-medium">{plan.storage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">OCR解析</span>
                    <span className="font-medium">{plan.ocrPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LLM Token</span>
                    <span className="font-medium">{plan.llmTokens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">导出次数</span>
                    <span className="font-medium">{plan.exports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">并发数</span>
                    <span className="font-medium">{plan.concurrent}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">用户列表</TabsTrigger>
          <TabsTrigger value="orders">充值记录</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>会员用户</CardTitle>
              <CardDescription>管理用户等级、配额和到期时间</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>套餐</TableHead>
                    <TableHead>到期时间</TableHead>
                    <TableHead>存储</TableHead>
                    <TableHead>OCR</TableHead>
                    <TableHead>LLM</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.plan === "Pro" ? "default" : user.plan === "Enterprise" ? "primary" : "outline"
                          }
                        >
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.expiry}</TableCell>
                      <TableCell>{user.storage}</TableCell>
                      <TableCell>{user.ocr}</TableCell>
                      <TableCell>{user.llm}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            升级
                          </Button>
                          <Button variant="ghost" size="sm">
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
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>充值记录</CardTitle>
              <CardDescription>查看充值记录、金额和发票状态</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>支付方式</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发票</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.id}</TableCell>
                      <TableCell>{order.user}</TableCell>
                      <TableCell className="font-semibold">{order.amount}</TableCell>
                      <TableCell>{order.method}</TableCell>
                      <TableCell>{order.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.invoice}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑套餐：{selectedPlan.name}</DialogTitle>
            <DialogDescription>配置存储、解析、Token等配额和功能权限</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>存储大小</Label>
                <Input defaultValue={selectedPlan.storage} />
              </div>
              <div className="space-y-2">
                <Label>OCR页数</Label>
                <Input defaultValue={selectedPlan.ocrPages} />
              </div>
              <div className="space-y-2">
                <Label>LLM Token</Label>
                <Input defaultValue={selectedPlan.llmTokens} />
              </div>
              <div className="space-y-2">
                <Label>导出次数</Label>
                <Input defaultValue={selectedPlan.exports} />
              </div>
              <div className="space-y-2">
                <Label>并发数</Label>
                <Input type="number" defaultValue={selectedPlan.concurrent} />
              </div>
              <div className="space-y-2">
                <Label>价格</Label>
                <Input defaultValue={selectedPlan.price} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>功能权限</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="ai-tag" defaultChecked />
                  <label htmlFor="ai-tag" className="text-sm">
                    AI自动标注
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="advanced-search" defaultChecked />
                  <label htmlFor="advanced-search" className="text-sm">
                    高级搜索
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="batch-export" defaultChecked />
                  <label htmlFor="batch-export" className="text-sm">
                    批量导出
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="api-access" />
                  <label htmlFor="api-access" className="text-sm">
                    API访问
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="priority-support" />
                  <label htmlFor="priority-support" className="text-sm">
                    优先支持
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="private-deploy" />
                  <label htmlFor="private-deploy" className="text-sm">
                    私有部署
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setEditDialogOpen(false)}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
