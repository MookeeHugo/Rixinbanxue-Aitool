"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Download, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AdminAuditLog() {
  const { toast } = useToast()
  const [filterUser, setFilterUser] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const logs = [
    {
      id: 1,
      time: "2024-11-19 14:25:30",
      user: "管理员",
      role: "超级管理员",
      type: "修改",
      action: "修改套餐配置",
      object: "专业版套餐",
      result: "成功",
      ip: "192.168.1.100",
      userAgent: "Chrome 120.0",
      oldValue: { price: 299 },
      newValue: { price: 399 },
    },
    {
      id: 2,
      time: "2024-11-19 13:45:12",
      user: "运营人员",
      role: "运营",
      type: "创建",
      action: "生成邀请码",
      object: "批量邀请码 x100",
      result: "成功",
      ip: "192.168.1.101",
      userAgent: "Safari 17.2",
      oldValue: null,
      newValue: { count: 100, channel: "渠道A" },
    },
    {
      id: 3,
      time: "2024-11-19 12:10:45",
      user: "管理员",
      role: "超级管理员",
      type: "供应商切换",
      action: "切换OCR供应商",
      object: "OCR Provider",
      result: "成功",
      ip: "192.168.1.100",
      userAgent: "Chrome 120.0",
      oldValue: { provider: "百度OCR" },
      newValue: { provider: "阿里云OCR" },
    },
    {
      id: 4,
      time: "2024-11-19 11:30:20",
      user: "运营人员",
      role: "运营",
      type: "导出",
      action: "导出题库数据",
      object: "高中数学题库",
      result: "成功",
      ip: "192.168.1.101",
      userAgent: "Safari 17.2",
      oldValue: null,
      newValue: { format: "Excel", count: 500 },
    },
    {
      id: 5,
      time: "2024-11-19 10:15:08",
      user: "管理员",
      role: "超级管理员",
      type: "删除",
      action: "删除用户",
      object: "用户 test@example.com",
      result: "成功",
      ip: "192.168.1.100",
      userAgent: "Chrome 120.0",
      oldValue: { email: "test@example.com", status: "active" },
      newValue: null,
    },
  ]

  const filteredLogs = logs.filter((log) => {
    if (filterUser !== "all" && log.user !== filterUser) return false
    if (filterType !== "all" && log.type !== filterType) return false
    if (searchKeyword && !log.action.includes(searchKeyword) && !log.object.includes(searchKeyword)) return false
    return true
  })

  const handleExport = () => {
    toast({
      title: "导出成功",
      description: "审计日志已导出为Excel文件",
    })
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      创建: "bg-green-100 text-green-700",
      修改: "bg-blue-100 text-blue-700",
      删除: "bg-red-100 text-red-700",
      导出: "bg-purple-100 text-purple-700",
      供应商切换: "bg-orange-100 text-orange-700",
    }
    return colors[type] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">审计与日志</h2>
          <p className="text-sm text-muted-foreground">查看和追踪所有后台操作记录</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          导出日志
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索操作或对象..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="操作人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部用户</SelectItem>
                <SelectItem value="管理员">管理员</SelectItem>
                <SelectItem value="运营人员">运营人员</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="操作类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="创建">创建</SelectItem>
                <SelectItem value="修改">修改</SelectItem>
                <SelectItem value="删除">删除</SelectItem>
                <SelectItem value="导出">导出</SelectItem>
                <SelectItem value="供应商切换">供应商切换</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>操作记录 ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>操作类型</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>对象</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.time}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(log.type)}>{log.type}</Badge>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.object}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {log.result}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>操作详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">操作时间</p>
                  <p className="font-medium">{selectedLog.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">操作人</p>
                  <p className="font-medium">
                    {selectedLog.user} ({selectedLog.role})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">请求 IP</p>
                  <p className="font-medium">{selectedLog.ip}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User-Agent</p>
                  <p className="font-medium">{selectedLog.userAgent}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">操作详情</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">操作类型</p>
                    <Badge className={getTypeColor(selectedLog.type)}>{selectedLog.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">操作对象</p>
                    <p>{selectedLog.object}</p>
                  </div>
                </div>
              </div>

              {selectedLog.oldValue && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">变更前</p>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">变更后</p>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
