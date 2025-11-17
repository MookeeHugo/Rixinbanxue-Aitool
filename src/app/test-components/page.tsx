'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button as AntButton, Table, DatePicker, Form, message } from 'antd';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export default function TestComponentsPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const showMessage = () => {
    messageApi.success('Ant Design Message 组件工作正常！');
  };

  const antTableColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '年龄', dataIndex: 'age', key: 'age' },
    { title: '班级', dataIndex: 'class', key: 'class' },
  ];

  const antTableData = [
    { key: '1', name: '张三', age: 18, class: '高三(1)班' },
    { key: '2', name: '李四', age: 17, class: '高二(2)班' },
    { key: '3', name: '王五', age: 19, class: '高三(3)班' },
  ];

  return (
    <div className="space-y-8">
      {contextHolder}

      <div>
        <h1 className="text-3xl font-bold mb-2">组件测试页面</h1>
        <p className="text-muted-foreground">
          验证 shadcn/ui 和 Ant Design 组件是否正常工作
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">shadcn/ui 组件测试</h2>

        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Button 按钮</h3>
            <div className="flex gap-3 flex-wrap">
              <Button variant="default">默认按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="destructive">危险按钮</Button>
              <Button variant="outline">轮廓按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="link">链接按钮</Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Badge 徽章</h3>
            <div className="flex gap-3 flex-wrap">
              <Badge variant="default">默认</Badge>
              <Badge variant="secondary">次要</Badge>
              <Badge variant="destructive">危险</Badge>
              <Badge variant="outline">轮廓</Badge>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Input 输入框</h3>
            <div className="grid gap-3 max-w-md">
              <div>
                <Label htmlFor="name">姓名</Label>
                <Input id="name" placeholder="请输入姓名" />
              </div>
              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" type="email" placeholder="请输入邮箱" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Select 选择器</h3>
            <div className="max-w-xs">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grade1">高一</SelectItem>
                  <SelectItem value="grade2">高二</SelectItem>
                  <SelectItem value="grade3">高三</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Textarea 文本域</h3>
            <div className="max-w-md">
              <Textarea placeholder="请输入内容..." rows={4} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Dialog 对话框</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>打开对话框</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>shadcn/ui Dialog 标题</DialogTitle>
                  <DialogDescription>
                    这是一个 shadcn/ui Dialog 组件的示例。它使用了 SuperDesign 的主题色系。
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline">取消</Button>
                  <Button>确认</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">DropdownMenu 下拉菜单</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">打开菜单</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  通过
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <XCircle className="mr-2 h-4 w-4" />
                  拒绝
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  待审核
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Icons 图标 (lucide-react)</h3>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <XCircle className="h-6 w-6 text-red-500" />
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <Info className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Ant Design 组件测试</h2>

        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Button 按钮</h3>
            <div className="flex gap-3 flex-wrap">
              <AntButton type="primary">主要按钮</AntButton>
              <AntButton>默认按钮</AntButton>
              <AntButton type="dashed">虚线按钮</AntButton>
              <AntButton type="link">链接按钮</AntButton>
              <AntButton danger>危险按钮</AntButton>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Table 表格</h3>
            <Table
              columns={antTableColumns}
              dataSource={antTableData}
              pagination={false}
              size="middle"
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">DatePicker 日期选择</h3>
            <div className="max-w-xs">
              <DatePicker className="w-full" placeholder="选择日期" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Form 表单</h3>
            <Form layout="vertical" className="max-w-md">
              <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="请输入邮箱" />
              </Form.Item>
              <Form.Item>
                <AntButton type="primary" htmlType="submit">
                  提交
                </AntButton>
              </Form.Item>
            </Form>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Message 消息提示</h3>
            <AntButton type="primary" onClick={showMessage}>
              点击显示消息
            </AntButton>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">主题色验证</h2>
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="h-20 bg-primary rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">#8b5cf6</p>
            </div>
            <div className="text-center">
              <div className="h-20 bg-green-500 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Success</p>
              <p className="text-xs text-muted-foreground">#10b981</p>
            </div>
            <div className="text-center">
              <div className="h-20 bg-yellow-500 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Warning</p>
              <p className="text-xs text-muted-foreground">#f59e0b</p>
            </div>
            <div className="text-center">
              <div className="h-20 bg-red-500 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Error</p>
              <p className="text-xs text-muted-foreground">#ef4444</p>
            </div>
            <div className="text-center">
              <div className="h-20 bg-muted rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Muted</p>
              <p className="text-xs text-muted-foreground">Secondary</p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">字体系统验证</h2>
        <Card className="p-6 space-y-4">
          <div>
            <h1 className="text-4xl font-bold">标题 1 - 36px Bold</h1>
            <h2 className="text-3xl font-bold">标题 2 - 30px Bold</h2>
            <h3 className="text-2xl font-semibold">标题 3 - 24px Semibold</h3>
            <h4 className="text-xl font-semibold">标题 4 - 20px Semibold</h4>
          </div>
          <div>
            <p className="text-base">正文 - 16px Regular (Inter 字体)</p>
            <p className="text-sm text-muted-foreground">辅助文字 - 14px Regular</p>
            <p className="text-xs text-muted-foreground">小字 - 12px Regular</p>
          </div>
          <div>
            <code className="font-mono bg-muted px-2 py-1 rounded">
              代码字体 - JetBrains Mono
            </code>
          </div>
        </Card>
      </section>
    </div>
  );
}
