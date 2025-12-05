# 日新平台开发指南

## 🚀 快速开始

### 1. 环境要求

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板：
```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 填写真实配置：
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cloudflare R2 配置
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_PUBLIC_BUCKET=rixing-public
R2_PRIVATE_BUCKET=rixing-private
R2_PUBLIC_URL=https://your-bucket.r2.dev
CDN_PUBLIC_URL=https://cdn.rixing.com
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## 📦 技术栈

### 核心框架
- **Next.js 14.2.7** - React 全栈框架（App Router）
- **React 18** - UI 库
- **TypeScript 5** - 类型安全

### UI 组件库
- **shadcn/ui** - 基础 UI 组件（New York 风格）
- **Ant Design 5** - 复杂业务组件
- **Tailwind CSS 3** - 原子化 CSS
- **Lucide Icons** - 图标库

### 状态管理
- **Zustand** - 轻量级状态管理
- **zustand/middleware** - 持久化和 DevTools

### 数据库 & 后端
- **Supabase** - PostgreSQL 数据库 + Auth + Realtime
- **Cloudflare R2** - 对象存储（S3 兼容）
- **AWS SDK** - R2 客户端

### 开发工具
- **ESLint** - 代码检查
- **TypeScript** - 类型检查

---

## 🏗️ 项目结构

```
rixindemo-codex-m1/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # 认证路由组
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── api/                 # API 路由
│   │   ├── questions/           # 题目管理
│   │   ├── papers/              # 试卷管理
│   │   ├── classes/             # 班级管理
│   │   ├── assignments/         # 作业管理
│   │   ├── live/                # 直播教学
│   │   ├── analytics/           # 数据分析
│   │   ├── layout.tsx           # 根布局
│   │   ├── page.tsx             # 首页
│   │   └── globals.css          # 全局样式
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── Navbar.tsx           # 导航栏
│   │   └── ...
│   ├── lib/
│   │   ├── utils.ts             # 工具函数
│   │   ├── supabase.ts          # Supabase 客户端
│   │   └── storage.ts           # R2 存储服务
│   ├── stores/
│   │   ├── userStore.ts         # 用户状态
│   │   └── questionBasketStore.ts # 题篮状态
│   ├── types/
│   │   └── database.ts          # 数据库类型
│   └── hooks/
│       └── useAuth.ts           # 自定义 Hooks
├── public/                       # 静态资源
├── docs/                         # 文档
│   ├── COMPONENT_GUIDE.md
│   ├── CODING_STANDARDS.md
│   └── DEVELOPMENT_GUIDE.md
├── components.json               # shadcn/ui 配置
├── tailwind.config.ts            # Tailwind 配置
├── tsconfig.json                 # TypeScript 配置
├── next.config.mjs               # Next.js 配置
├── package.json
└── .env.local.example            # 环境变量模板
```

---

## 🔧 常用命令

### 开发

```bash
# 启动开发服务器
npm run dev

# 启动开发服务器（指定端口）
npm run dev -- -p 3002

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 构建

```bash
# 生产构建
npm run build

# 启动生产服务器
npm start
```

### shadcn/ui 组件管理

```bash
# 添加新组件
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table

# 查看可用组件列表
npx shadcn-ui@latest add
```

---

## 🎨 设计系统

### SuperDesign 主题色

项目使用 SuperDesign 设计系统，主题色映射如下：

| 用途 | 颜色 | Hex | Tailwind Class |
|------|------|-----|----------------|
| 主色 | 紫色 | #8b5cf6 | `bg-primary` |
| 成功 | 绿色 | #10b981 | `bg-green-500` |
| 警告 | 橙色 | #f59e0b | `bg-yellow-500` |
| 错误 | 红色 | #ef4444 | `bg-red-500` |

### 间距系统

```
space-2  = 8px   (基础单位)
space-4  = 16px  (默认间距)
space-8  = 32px  (组件间距)
space-12 = 48px  (区块间距)
```

### 圆角

```
rounded-sm = 4px   (Tag 标签)
rounded-md = 8px   (Button 按钮)
rounded-lg = 12px  (Card 卡片)
rounded-xl = 16px  (Modal 弹窗)
```

### 字体

- **正文**: Inter (sans-serif)
- **代码**: JetBrains Mono (monospace)

---

## 🗄️ 数据库设计

### Supabase 表结构

#### profiles (用户信息)
```sql
id          UUID (PK, ref: auth.users)
email       TEXT
name        TEXT
role        TEXT ('teacher' | 'student')
created_at  TIMESTAMP
```

#### classes (班级)
```sql
id          UUID (PK)
name        TEXT
grade       TEXT
teacher_id  UUID (FK: profiles)
class_code  TEXT (唯一邀请码)
created_at  TIMESTAMP
```

#### questions (题目)
```sql
id                UUID (PK)
type              TEXT ('choice' | 'fill' | 'essay')
content           TEXT
options           JSONB (选择题选项)
answer            TEXT
knowledge_points  TEXT[] (知识点标签)
difficulty        TEXT ('easy' | 'medium' | 'hard')
created_by        UUID (FK: profiles)
created_at        TIMESTAMP
```

#### papers (试卷)
```sql
id           UUID (PK)
name         TEXT
question_ids UUID[] (题目ID数组)
created_by   UUID (FK: profiles)
created_at   TIMESTAMP
```

#### assignments (作业)
```sql
id          UUID (PK)
class_id    UUID (FK: classes)
paper_id    UUID (FK: papers)
deadline    TIMESTAMP
status      TEXT ('draft' | 'published' | 'closed')
created_by  UUID (FK: profiles)
created_at  TIMESTAMP
```

#### submissions (学生提交)
```sql
id             UUID (PK)
assignment_id  UUID (FK: assignments)
student_id     UUID (FK: profiles)
answers        JSONB (答案数据)
score          INTEGER
submitted_at   TIMESTAMP
```

#### live_sessions (直播)
```sql
id              UUID (PK)
title           TEXT
provider        TEXT ('zego' | 'livekit')
status          TEXT ('pending' | 'live' | 'ended')
scheduled_at    TIMESTAMP
duration_min    INTEGER
record_on_start BOOLEAN
room_id         TEXT
created_by      UUID (FK: profiles)
created_at      TIMESTAMP
```

---

## 📁 文件存储

### Cloudflare R2 存储策略

#### 公开文件（PUBLIC）
- **用途**: 题目图片、用户头像
- **存储桶**: `rixing-public`
- **访问方式**: 直接 URL 访问
- **CDN 加速**: 支持

```typescript
// 上传示例
const result = await uploadFile({
  file: imageBuffer,
  key: `questions/${questionId}/image.png`,
  accessLevel: FileAccessLevel.PUBLIC,
});

console.log(result.publicUrl); // https://r2.dev/questions/123/image.png
console.log(result.cdnUrl);    // https://cdn.rixing.com/public/questions/123/image.png
```

#### 私有文件（PRIVATE）
- **用途**: 导出的 PDF、学生数据
- **存储桶**: `rixing-private`
- **访问方式**: 签名 URL（1小时有效）
- **权限控制**: 需验证用户权限

```typescript
// 上传示例
const result = await uploadFile({
  file: pdfBuffer,
  key: `exports/${userId}/paper-${paperId}.pdf`,
  accessLevel: FileAccessLevel.PRIVATE,
});

// 生成签名 URL
const { url, expiresAt } = await generateSignedUrl(
  result.key,
  userId,
  3600 // 1小时
);
```

### 支持的文件类型

- **图片**: PNG, JPG, GIF, WebP, SVG
- **文档**: PDF, DOC, DOCX
- **视频**: MP4, WebM
- **音频**: MP3, WAV
- **其他**: JSON, CSV, ZIP

---

## 🔐 认证流程

### Supabase Auth

```typescript
// 登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// 注册
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      name: '张三',
      role: 'teacher',
    },
  },
});

// 登出
await supabase.auth.signOut();

// 获取当前用户
const { data: { user } } = await supabase.auth.getUser();
```

---

## 🧪 测试

### 组件测试页面

访问 `/test-components` 查看所有 shadcn/ui 和 Ant Design 组件的实际效果。

包含：
- ✅ shadcn/ui 组件（Button, Card, Input, Select, Dialog, Badge, DropdownMenu）
- ✅ Ant Design 组件（Table, Form, DatePicker, Message）
- ✅ SuperDesign 主题色验证
- ✅ 字体系统验证

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# Windows
taskkill /F /PID <PID>

# Mac/Linux
kill -9 <PID>
```

### 2. Supabase 连接失败

检查 `.env.local` 中的配置是否正确：
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```

### 3. R2 上传失败

确认环境变量配置：
```env
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
```

### 4. TypeScript 类型错误

运行类型检查：
```bash
npm run type-check
```

排除不需要的文件（已在 `tsconfig.json` 配置）：
```json
{
  "exclude": [
    "node_modules",
    "**/*.stories.tsx",
    "**/*.stories.ts",
    "legacy/**"
  ]
}
```

---

## 📚 参考文档

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Ant Design 文档](https://ant.design)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2)

---

## 🚀 部署

### Vercel 部署（推荐）

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 自动部署

### 环境变量配置

在 Vercel 项目设置中添加：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BUCKET`
- `R2_PRIVATE_BUCKET`

### 构建命令

```bash
npm run build
```

### 启动命令

```bash
npm start
```

---

## 📞 技术支持

如有问题，请联系开发团队或查阅项目文档。
