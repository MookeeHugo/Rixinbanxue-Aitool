"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Copy, Ban, Download, TrendingUp, Users, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const mockCodes = [
  {
    id: 1,
    code: "WELCOME2025",
    status: "active",
    used: 5,
    limit: 100,
    plan: "Pro",
    expiry: "2025-12-31",
    channel: "官网推广",
    users: ["张三", "李四"],
  },
  {
    id: 2,
    code: "STUDENT50",
    status: "active",
    used: 23,
    limit: 50,
    plan: "Pro",
    expiry: "2025-06-30",
    channel: "学生优惠",
    users: ["王五"],
  },
  {
    id: 3,
    code: "PARTNER100",
    status: "disabled",
    used: 100,
    limit: 100,
    plan: "Enterprise",
    expiry: "2025-03-31",
    channel: "合作伙伴",
    users: [],
  },
]

const channelStats = [
  { channel: "官网推广", total: 100, used: 45, conversion: "45%" },
  { channel: "学生优惠", total: 50, used: 38, conversion: "76%" },
  { channel: "合作伙伴", total: 200, used: 156, conversion: "78%" },
]

export function AdminInviteCode() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "复制成功",
      description: `邀请码 ${code} 已复制到剪贴板`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总邀请码</CardTitle>
            <Gift className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">350</div>
            <p className="text-xs text-muted-foreground">已使用 239</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">新增用户</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">239</div>
            <p className="text-xs text-muted-foreground">本月 +42</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均转化率</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.3%</div>
            <p className="text-xs text-green-600">+5.2% 较上月</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>邀请码管理</CardTitle>
              <CardDescription>生成、管理和追踪邀请码使用情况</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                导出CSV
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                生成邀请码
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀请码</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>使用情况</TableHead>
                <TableHead>绑定套餐</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>来源渠道</TableHead>
                <TableHead>关联用户</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCodes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.code}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "active" ? "default" : "outline"}>
                      {item.status === "active" ? "启用" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">
                        {item.used}/{item.limit}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${(item.used / item.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.plan}</Badge>
                  </TableCell>
                  <TableCell>{item.expiry}</TableCell>
                  <TableCell>{item.channel}</TableCell>
                  <TableCell>{item.users.length}人</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(item.code)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Ban className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>渠道统计</CardTitle>
          <CardDescription>按来源显示使用占比和转化率</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>渠道</TableHead>
                <TableHead>总数</TableHead>
                <TableHead>已使用</TableHead>
                <TableHead>转化率</TableHead>
                <TableHead>占比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelStats.map((stat, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{stat.channel}</TableCell>
                  <TableCell>{stat.total}</TableCell>
                  <TableCell>{stat.used}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{stat.conversion}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: stat.conversion }} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成邀请码</DialogTitle>
            <DialogDescription>配置邀请码的使用规则和权限</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>生成数量</Label>
                <Input type="number" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label>使用次数</Label>
                <Input type="number" defaultValue="1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>绑定套餐</Label>
              <Select defaultValue="pro">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro (7天试用)</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>有效期</Label>
              <Input type="date" />
            </div>

            <div className="space-y-2">
              <Label>来源渠道</Label>
              <Input placeholder="例如：官网推广、学生优惠" />
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea placeholder="添加备注说明..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setCreateDialogOpen(false)}>生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
