"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Mail, MessageSquare, Webhook, BellOff, Edit, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AdminAlerts() {
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showChannelDialog, setShowChannelDialog] = useState(false)
  const [rules, setRules] = useState([
    {
      id: 1,
      name: "OCR失败率告警",
      metric: "OCR失败率",
      threshold: "> 10%",
      duration: "持续5分钟",
      channels: ["邮件", "企业微信"],
      status: "active",
    },
    {
      id: 2,
      name: "Token消耗告警",
      metric: "LLM Token消耗",
      threshold: "> 100万/小时",
      duration: "持续10分钟",
      channels: ["邮件"],
      status: "active",
    },
    {
      id: 3,
      name: "成本预警",
      metric: "每日成本",
      threshold: "> ¥1000",
      duration: "即时",
      channels: ["邮件", "短信", "企业微信"],
      status: "muted",
    },
    {
      id: 4,
      name: "队列堆积告警",
      metric: "队列长度",
      threshold: "> 100",
      duration: "持续15分钟",
      channels: ["Webhook"],
      status: "active",
    },
  ])

  const [alertHistory] = useState([
    {
      id: 1,
      time: "2024-11-19 14:30:00",
      rule: "OCR失败率告警",
      level: "严重",
      message: "OCR失败率达到15%，超过阈值10%",
      status: "已处理",
      handler: "管理员",
    },
    {
      id: 2,
      time: "2024-11-19 12:15:00",
      rule: "成本预警",
      level: "警告",
      message: "今日成本已达¥1200，超过阈值¥1000",
      status: "已处理",
      handler: "管理员",
    },
    {
      id: 3,
      time: "2024-11-19 10:45:00",
      rule: "队列堆积告警",
      level: "一般",
      message: "队列长度达到120，超过阈值100",
      status: "待处理",
      handler: "-",
    },
  ])

  const [channels] = useState([
    { id: 1, type: "邮件", name: "技术团队邮件组", value: "tech@company.com", status: "active" },
    { id: 2, type: "短信", name: "管理员手机", value: "138****8888", status: "active" },
    { id: 3, type: "企业微信", name: "运维群", value: "webhook_url_xxx", status: "active" },
    { id: 4, type: "Webhook", name: "自定义接口", value: "https://api.company.com/alert", status: "active" },
  ])

  const toggleRuleStatus = (ruleId: number) => {
    setRules(
      rules.map((rule) => {
        if (rule.id === ruleId) {
          const newStatus = rule.status === "active" ? "muted" : "active"
          toast({
            title: newStatus === "active" ? "告警已启用" : "告警已静默",
            description: `${rule.name}已${newStatus === "active" ? "启用" : "静默"}`,
          })
          return { ...rule, status: newStatus }
        }
        return rule
      }),
    )
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      严重: "bg-red-100 text-red-700 border-red-200",
      警告: "bg-orange-100 text-orange-700 border-orange-200",
      一般: "bg-blue-100 text-blue-700 border-blue-200",
    }
    return colors[level] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">告警与通知</h2>
          <p className="text-sm text-muted-foreground">配置系统告警规则和通知渠道</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowChannelDialog(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            通知渠道
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建规则
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">告警规则</TabsTrigger>
          <TabsTrigger value="history">告警历史</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>规则列表 ({rules.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>规则名称</TableHead>
                    <TableHead>监控指标</TableHead>
                    <TableHead>阈值条件</TableHead>
                    <TableHead>持续时间</TableHead>
                    <TableHead>通知渠道</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{rule.metric}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.threshold}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.duration}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rule.channels.map((channel, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.status === "active"}
                            onCheckedChange={() => toggleRuleStatus(rule.id)}
                          />
                          {rule.status === "muted" && <BellOff className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash className="w-4 h-4 text-red-500" />
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

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>告警历史</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>触发时间</TableHead>
                    <TableHead>规则名称</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>告警信息</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>处理人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertHistory.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-sm">{alert.time}</TableCell>
                      <TableCell>{alert.rule}</TableCell>
                      <TableCell>
                        <Badge className={getLevelColor(alert.level)}>{alert.level}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">{alert.message}</TableCell>
                      <TableCell>
                        <Badge variant={alert.status === "已处理" ? "outline" : "default"}>{alert.status}</Badge>
                      </TableCell>
                      <TableCell>{alert.handler}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 创建规则对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建告警规则</DialogTitle>
            <DialogDescription>配置监控指标和通知方式</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input placeholder="例如：OCR失败率告警" />
            </div>
            <div className="space-y-2">
              <Label>监控指标</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择监控指标" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocr_fail">OCR失败率</SelectItem>
                  <SelectItem value="llm_token">LLM Token消耗</SelectItem>
                  <SelectItem value="cost">每日成本</SelectItem>
                  <SelectItem value="queue">队列长度</SelectItem>
                  <SelectItem value="provider">供应商状态</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>阈值</Label>
                <Input placeholder="例如：10" />
              </div>
              <div className="space-y-2">
                <Label>单位</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择单位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="count">次</SelectItem>
                    <SelectItem value="yuan">元</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>持续时间（分钟）</Label>
              <Input type="number" placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>通知渠道</Label>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-2">
                    <input type="checkbox" id={`channel-${channel.id}`} />
                    <label htmlFor={`channel-${channel.id}`} className="text-sm">
                      {channel.type} - {channel.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setShowCreateDialog(false)
                toast({ title: "规则已创建", description: "告警规则创建成功" })
              }}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通知渠道对话框 */}
      <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>通知渠道管理</DialogTitle>
            <DialogDescription>配置和管理告警通知渠道</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {channel.type === "邮件" && <Mail className="w-5 h-5 text-blue-500" />}
                  {channel.type === "短信" && <MessageSquare className="w-5 h-5 text-green-500" />}
                  {channel.type === "企业微信" && <MessageSquare className="w-5 h-5 text-blue-500" />}
                  {channel.type === "Webhook" && <Webhook className="w-5 h-5 text-purple-500" />}
                  <div>
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {channel.type}: {channel.value}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={channel.status === "active"} />
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelDialog(false)}>
              关闭
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              添加渠道
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
