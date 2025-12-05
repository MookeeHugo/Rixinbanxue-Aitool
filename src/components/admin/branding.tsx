"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, Save, History, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AdminBranding() {
  const { toast } = useToast()
  const [config, setConfig] = useState({
    mainLogo: "/logo.png",
    loginLogo: "/logo.png",
    favicon: "/logo.png",
    primaryColor: "#3b82f6",
    backgroundImage: "",
    loginText: "欢迎使用日新伴学AI题库系统",
    customDomain: "",
    supportEmail: "support@rixinbanxue.com",
    supportPhone: "400-888-8888",
    supportIM: "",
    privacyUrl: "/privacy",
  })
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishEnv, setPublishEnv] = useState("staging")
  const [showPreview, setShowPreview] = useState(false)
  const [history] = useState([
    { id: 1, version: "v1.2", time: "2024-11-19 10:30", operator: "管理员", env: "Production" },
    { id: 2, version: "v1.1", time: "2024-11-18 15:20", operator: "管理员", env: "Staging" },
    { id: 3, version: "v1.0", time: "2024-11-17 09:00", operator: "管理员", env: "Production" },
  ])

  const handleSave = () => {
    toast({
      title: "配置已保存",
      description: "品牌配置已成功保存到草稿",
    })
  }

  const handlePublish = () => {
    setShowPublishDialog(false)
    toast({
      title: "发布成功",
      description: `配置已发布到${publishEnv === "staging" ? "测试" : "生产"}环境`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">品牌自定义</h2>
          <p className="text-sm text-muted-foreground">自定义Logo、主题色、域名等品牌元素</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存草稿
          </Button>
          <Button onClick={() => setShowPublishDialog(true)}>发布配置</Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding">品牌元素</TabsTrigger>
          <TabsTrigger value="contact">联系方式</TabsTrigger>
          <TabsTrigger value="history">历史版本</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo 设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>主 Logo</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">点击上传</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>登录页 Logo</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">点击上传</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">点击上传</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>主题配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>主题色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>白标域名</Label>
                  <Input
                    placeholder="custom.yourdomain.com"
                    value={config.customDomain}
                    onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>登录页文案</Label>
                <Textarea
                  placeholder="欢迎使用..."
                  value={config.loginText}
                  onChange={(e) => setConfig({ ...config, loginText: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>背景图</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击或拖拽上传背景图</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>联系方式</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>客服邮箱</Label>
                  <Input
                    type="email"
                    value={config.supportEmail}
                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>客服电话</Label>
                  <Input
                    value={config.supportPhone}
                    onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>在线客服 URL</Label>
                <Input
                  placeholder="https://..."
                  value={config.supportIM}
                  onChange={(e) => setConfig({ ...config, supportIM: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>隐私政策链接</Label>
                <Input
                  value={config.privacyUrl}
                  onChange={(e) => setConfig({ ...config, privacyUrl: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>历史版本</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <History className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{item.version}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.time} · {item.operator} · {item.env}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      回滚到此版本
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 发布确认对话框 */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发布品牌配置</DialogTitle>
            <DialogDescription>请选择要发布到的环境，发布后将立即生效</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>目标环境</Label>
              <Select value={publishEnv} onValueChange={setPublishEnv}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">测试环境 (Staging)</SelectItem>
                  <SelectItem value="production">生产环境 (Production)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              取消
            </Button>
            <Button onClick={handlePublish}>确认发布</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>品牌预览</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>登录页预览</Label>
              <div
                className="border rounded-lg p-8 bg-gradient-to-br from-blue-50 to-white"
                style={{ backgroundColor: config.primaryColor + "10" }}
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto" />
                  <p className="text-lg font-medium">{config.loginText}</p>
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 rounded" style={{ backgroundColor: config.primaryColor }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>后台主色预览</Label>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="h-12 rounded" style={{ backgroundColor: config.primaryColor }} />
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
