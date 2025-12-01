# 日新平台组件使用指南

## 📦 组件库架构

本项目采用 **双组件库策略**：
- **shadcn/ui**: 基础 UI 组件（按钮、输入框、卡片等）
- **Ant Design**: 复杂业务组件（表格、表单、日期选择器等）

## 🎨 设计系统：SuperDesign

### 主题色
```typescript
primary: '#8b5cf6'    // 主色-紫色
success: '#10b981'    // 成功-绿色
warning: '#f59e0b'    // 警告-橙色
error: '#ef4444'      // 错误-红色
```

### 间距系统
```
2  = 8px   (基础单位)
4  = 16px  (默认间距)
8  = 32px  (组件间距)
12 = 48px  (区块间距)
```

### 圆角
```
sm = 4px   (Tag 标签)
md = 8px   (Button 按钮)
lg = 12px  (Card 卡片)
xl = 16px  (Modal 弹窗)
```

## 📚 shadcn/ui 组件使用

### 1. Button 按钮
```tsx
import { Button } from '@/components/ui/button';

// 基础用法
<Button variant="default">默认按钮</Button>
<Button variant="destructive">危险按钮</Button>
<Button variant="outline">轮廓按钮</Button>
<Button variant="ghost">幽灵按钮</Button>

// 带图标
import { Check } from 'lucide-react';
<Button>
  <Check className="mr-2 h-4 w-4" />
  保存
</Button>
```

### 2. Card 卡片
```tsx
import { Card } from '@/components/ui/card';

<Card className="p-6">
  <h3 className="text-lg font-semibold mb-4">标题</h3>
  <p className="text-muted-foreground">内容</p>
</Card>
```

### 3. Input 输入框
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div>
  <Label htmlFor="email">邮箱</Label>
  <Input id="email" type="email" placeholder="请输入邮箱" />
</div>
```

### 4. Select 选择器
```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
```

### 5. Dialog 对话框
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>打开对话框</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
      <DialogDescription>描述信息</DialogDescription>
    </DialogHeader>
    <div>对话框内容</div>
  </DialogContent>
</Dialog>
```

### 6. Badge 徽章
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">默认</Badge>
<Badge variant="secondary">次要</Badge>
<Badge variant="destructive">危险</Badge>
<Badge variant="outline">轮廓</Badge>
```

## 📊 Ant Design 组件使用

### 1. Table 表格
```tsx
import { Table } from 'antd';

const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '年龄', dataIndex: 'age', key: 'age' },
  { title: '班级', dataIndex: 'class', key: 'class' },
];

const data = [
  { key: '1', name: '张三', age: 18, class: '高三(1)班' },
];

<Table columns={columns} dataSource={data} />
```

### 2. Form 表单
```tsx
import { Form, Input, Button } from 'antd';

<Form layout="vertical">
  <Form.Item
    label="用户名"
    name="username"
    rules={[{ required: true, message: '请输入用户名' }]}
  >
    <Input placeholder="请输入用户名" />
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit">
      提交
    </Button>
  </Form.Item>
</Form>
```

### 3. DatePicker 日期选择
```tsx
import { DatePicker } from 'antd';

<DatePicker
  placeholder="选择日期"
  className="w-full"
/>
```

### 4. Message 消息提示
```tsx
'use client';
import { message } from 'antd';

export default function MyComponent() {
  const [messageApi, contextHolder] = message.useMessage();

  const showMessage = () => {
    messageApi.success('操作成功！');
  };

  return (
    <>
      {contextHolder}
      <Button onClick={showMessage}>显示消息</Button>
    </>
  );
}
```

## 🎯 组件选择策略

### 使用 shadcn/ui 的场景：
- ✅ 简单的按钮、输入框
- ✅ 卡片、对话框、下拉菜单
- ✅ 需要高度自定义样式的组件
- ✅ 轻量级交互组件

### 使用 Ant Design 的场景：
- ✅ 复杂的数据表格（排序、筛选、分页）
- ✅ 复杂的表单验证和布局
- ✅ 日期时间选择器
- ✅ 上传、树形控件等复杂组件
- ✅ 需要快速开发的后台管理页面

## 🔄 状态管理 (Zustand)

### User Store
```tsx
import { useUserStore } from '@/stores/userStore';

function MyComponent() {
  const { user, setUser, logout } = useUserStore();

  return (
    <div>
      {user ? (
        <p>欢迎, {user.name}</p>
      ) : (
        <p>请登录</p>
      )}
    </div>
  );
}
```

### Question Basket Store
```tsx
import { useQuestionBasketStore } from '@/stores/questionBasketStore';

function QuestionSelector() {
  const { items, addItem, removeItem, clear } = useQuestionBasketStore();

  const handleAdd = (question) => {
    addItem(question);
  };

  return (
    <div>
      <p>已选题目: {items.length}</p>
      <Button onClick={clear}>清空</Button>
    </div>
  );
}
```

## 📁 文件存储 (Cloudflare R2)

### 上传文件
```tsx
import { uploadFile, FileAccessLevel } from '@/lib/storage';

// 上传公开文件（题目图片）
const result = await uploadFile({
  file: fileBuffer,
  key: `questions/${questionId}/image.png`,
  accessLevel: FileAccessLevel.PUBLIC,
});

console.log(result.publicUrl); // 直接访问 URL
console.log(result.cdnUrl);    // CDN 加速 URL
```

```tsx
// 上传私有文件（导出的 PDF）
const result = await uploadFile({
  file: pdfBuffer,
  key: `exports/${userId}/paper-${paperId}.pdf`,
  accessLevel: FileAccessLevel.PRIVATE,
});

// 需要生成签名 URL
const { url, expiresAt } = await generateSignedUrl(
  result.key,
  userId,
  3600 // 1小时有效期
);
```

### 删除文件
```tsx
import { deleteFile, FileAccessLevel } from '@/lib/storage';

await deleteFile('questions/123/image.png', FileAccessLevel.PUBLIC);
```

## 🎨 样式规范

### 1. 使用 Tailwind 类名
```tsx
// ✅ 推荐
<div className="flex items-center gap-4 p-6 rounded-lg bg-card">
  <h2 className="text-2xl font-semibold text-foreground">标题</h2>
  <p className="text-sm text-muted-foreground">描述</p>
</div>

// ❌ 避免
<div style={{ display: 'flex', padding: '24px' }}>
  ...
</div>
```

### 2. 使用 CSS 变量
```tsx
// ✅ 推荐 - 使用语义化颜色
<div className="bg-primary text-primary-foreground">主色块</div>
<div className="bg-card text-card-foreground">卡片</div>
<div className="text-muted-foreground">辅助文字</div>

// ❌ 避免 - 硬编码颜色
<div className="bg-purple-500">主色块</div>
```

### 3. 响应式设计
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 移动端1列，平板2列，桌面3列 */}
</div>
```

## 🔍 图标使用

项目使用 **lucide-react** 图标库：
```tsx
import { Check, X, AlertCircle, Info, Upload, Download } from 'lucide-react';

<Button>
  <Check className="mr-2 h-4 w-4" />
  保存
</Button>

<AlertCircle className="h-5 w-5 text-yellow-500" />
```

## 📖 参考资源

- shadcn/ui 文档: https://ui.shadcn.com
- Ant Design 文档: https://ant.design
- Tailwind CSS 文档: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- Zustand 文档: https://docs.pmnd.rs/zustand

## 🧪 测试页面

访问 `/test-components` 查看所有组件的实际效果和示例代码。
