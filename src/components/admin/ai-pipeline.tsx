"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AdminAIPipeline() {
  const metrics = [
    { label: "OCR 成功率", value: "96.8%", change: "+2.3%", trend: "up", color: "green" },
    { label: "LLM Token 用量", value: "45.2K", change: "+15%", trend: "up", color: "blue" },
    { label: "平均延迟", value: "1.2s", change: "-0.3s", trend: "down", color: "green" },
    { label: "失败率", value: "3.2%", change: "+0.5%", trend: "up", color: "red" },
  ]

  const recentCalls = [
    { time: "14:32:05", provider: "Aliyun OCR", type: "OCR", tokens: "-", latency: "850ms", status: "success" },
    { time: "14:31:58", provider: "GPT-4", type: "LLM", tokens: "1,234", latency: "2.1s", status: "success" },
    { time: "14:31:45", provider: "Baidu OCR", type: "OCR", tokens: "-", latency: "920ms", status: "failed" },
    { time: "14:31:32", provider: "GPT-4", type: "LLM", tokens: "856", latency: "1.8s", status: "success" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className={`w-5 h-5 text-${metric.color}-600`} />
                {metric.trend === "up" ? (
                  <TrendingUp className={`w-4 h-4 text-${metric.color}-600`} />
                ) : (
                  <TrendingDown className={`w-4 h-4 text-${metric.color}-600`} />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className={`text-xs mt-1 text-${metric.color}-600`}>{metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 请求日志 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI 调用日志</CardTitle>
              <CardDescription>最近的 OCR 和 LLM 调用记录</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>Token 数</TableHead>
                <TableHead>延迟</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCalls.map((call, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">{call.time}</TableCell>
                  <TableCell>{call.provider}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{call.type}</Badge>
                  </TableCell>
                  <TableCell>{call.tokens}</TableCell>
                  <TableCell>{call.latency}</TableCell>
                  <TableCell>
                    {call.status === "success" ? (
                      <Badge className="bg-green-100 text-green-700">成功</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">失败</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 降级/切换面板 */}
      <Card>
        <CardHeader>
          <CardTitle>手动降级与切换</CardTitle>
          <CardDescription>在异常情况下手动切换供应商</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="text-orange-600 border-orange-600 bg-transparent">
              <AlertTriangle className="w-4 h-4 mr-2" />
              切换至备用供应商
            </Button>
            <Button variant="outline">查看告警配置</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
