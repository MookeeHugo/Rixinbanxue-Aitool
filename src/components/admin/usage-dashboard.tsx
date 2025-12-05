"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, RefreshCw, Users } from "lucide-react"

interface UsageRecord {
  id: string
  org: string
  plan: "旗舰版" | "标准版" | "入门版"
  activeTeachers: number
  uploadQuota: number
  usedQuota: number
  aiCredits: number
  status: "正常" | "预警"
}

const RECORDS: UsageRecord[] = [
  {
    id: "ORG-001",
    org: "杭州市第二中学",
    plan: "旗舰版",
    activeTeachers: 42,
    uploadQuota: 800,
    usedQuota: 620,
    aiCredits: 1200,
    status: "正常",
  },
  {
    id: "ORG-002",
    org: "武汉光谷实验学校",
    plan: "标准版",
    activeTeachers: 18,
    uploadQuota: 300,
    usedQuota: 210,
    aiCredits: 460,
    status: "正常",
  },
  {
    id: "ORG-003",
    org: "深圳科创高中",
    plan: "旗舰版",
    activeTeachers: 55,
    uploadQuota: 900,
    usedQuota: 860,
    aiCredits: 80,
    status: "预警",
  },
]

const planColors: Record<UsageRecord["plan"], string> = {
  旗舰版: "bg-purple-100 text-purple-700",
  标准版: "bg-blue-100 text-blue-700",
  入门版: "bg-gray-100 text-gray-600",
}

export function AdminUsageDashboard() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")

  const totals = useMemo(() => {
    const activeTeachers = RECORDS.reduce((sum, item) => sum + item.activeTeachers, 0)
    const usedQuota = RECORDS.reduce((sum, item) => sum + item.usedQuota, 0)
    const uploadQuota = RECORDS.reduce((sum, item) => sum + item.uploadQuota, 0)
    const aiCredits = RECORDS.reduce((sum, item) => sum + item.aiCredits, 0)
    return { activeTeachers, usedQuota, uploadQuota, aiCredits }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>用量监控</CardTitle>
            <CardDescription>按学校维度查看上传额度、AI 调用额度与教师活跃情况。</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={range} onValueChange={(value: "7d" | "30d" | "90d") => setRange(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">最近 7 天</SelectItem>
                <SelectItem value="30d">最近 30 天</SelectItem>
                <SelectItem value="90d">最近 90 天</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">活跃教师</p>
            <p className="text-2xl font-semibold">{totals.activeTeachers}</p>
            <p className="text-xs text-muted-foreground">范围：{range === "30d" ? "30" : range === "7d" ? "7" : "90"} 天</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">上传额度使用</p>
            <p className="text-sm text-muted-foreground">
              {totals.usedQuota} / {totals.uploadQuota} 页
            </p>
            <Progress value={(totals.usedQuota / totals.uploadQuota) * 100} className="mt-2" />
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">剩余 AI Credits</p>
            <p className="text-2xl font-semibold">{totals.aiCredits}</p>
            <p className="text-xs text-muted-foreground">超限时将自动触发告警与限流</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>计划使用概览</CardTitle>
          <CardDescription>按学校汇总近一段时间的使用情况，方便运营手动干预。</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>学校</TableHead>
                <TableHead>套餐</TableHead>
                <TableHead>活跃教师</TableHead>
                <TableHead>上传额度</TableHead>
                <TableHead>AI Credits</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECORDS.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="font-medium">{record.org}</div>
                    <div className="text-xs text-muted-foreground">{record.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={planColors[record.plan]}>{record.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {record.activeTeachers}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <Progress value={(record.usedQuota / record.uploadQuota) * 100} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground">
                        {record.usedQuota}/{record.uploadQuota} 页
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{record.aiCredits}</TableCell>
                  <TableCell>
                    <Badge variant={record.status === "正常" ? "success" : "warning"}>{record.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="mr-1 h-4 w-4" />
                        导出明细
                      </Button>
                      <Button variant="ghost" size="sm">
                        查看档案
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
