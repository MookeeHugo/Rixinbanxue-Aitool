'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileCheck, Tags, Database, ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image
              src="/logo.png"
              alt="日新伴学"
              width={80}
              height={80}
              className="rounded-full shadow-lg"
            />
            <h1 className="text-5xl font-bold text-gray-900">
              日新伴学AI题库系统
              <span className="text-blue-600 ml-2">R1.0</span>
            </h1>
          </div>
          <p className="text-gray-600 text-lg">智能化题目管理，让教学更高效</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: Process Flow Animation */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">工作流程</h2>
            
            <div className="space-y-4">
              {[
                { icon: Upload, title: '上传文件', desc: '支持PDF、Word、图片等多种格式', color: 'text-blue-600' },
                { icon: FileCheck, title: '智能解析', desc: 'AI自动识别题目内容和结构', color: 'text-green-600' },
                { icon: Tags, title: '标签管理', desc: '快速为题目添加知识点、难度等标签', color: 'text-purple-600' },
                { icon: Database, title: '收录题库', desc: '统一管理，随时调用', color: 'text-orange-600' }
              ].map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-3 rounded-lg bg-gray-50 ${step.color}`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.desc}</p>
                  </div>
                  {index < 3 && <ArrowRight className="w-5 h-5 text-gray-400 mt-3" />}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>AI智能解析，准确率高达95%以上</span>
            </div>
          </div>

          {/* Right: Login Form */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">登录系统</CardTitle>
              <CardDescription>选择登录方式开始使用</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="admin" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="admin">管理员</TabsTrigger>
                  <TabsTrigger value="invite">邀请码</TabsTrigger>
                  <TabsTrigger value="wechat">微信</TabsTrigger>
                </TabsList>

                <TabsContent value="admin" className="space-y-4 mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <Input
                        id="username"
                        placeholder="请输入用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">密码</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full">登录</Button>
                  </form>
                </TabsContent>

                <TabsContent value="invite" className="space-y-4 mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite">邀请码</Label>
                      <Input
                        id="invite"
                        placeholder="请输入邀请码"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full">登录</Button>
                  </form>
                </TabsContent>

                <TabsContent value="wechat" className="space-y-4 mt-4">
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-40 h-40 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-2">
                          <span className="text-gray-400">微信二维码</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">使用微信扫码登录</p>
                    <Button onClick={() => router.push('/admin')} className="w-full">
                      模拟扫码成功
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
