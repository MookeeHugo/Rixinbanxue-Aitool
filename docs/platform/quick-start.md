# 日新教学平台 - 快速开始指?
## 🎉 当前进度

### ?已完成功?
#### M1: 项目初始?(100%)
- ?Next.js 14 + TypeScript 环境搭建
- ?Tailwind CSS 配置
- ?Supabase 数据库连?- ?6张数据库表设计（profiles, classes, questions, papers, assignments, submissions?- ?用户认证系统（登?注册?- ?响应式导航栏
- ?教师?学生端首页仪表盘

#### M2: 题库管理后台 (100%)
- ?题目列表页面（支持分页和筛选）
- ?新建题目（支持选择题、填空题、解答题?- ?编辑题目
- ?删除题目
- ?知识点多选（50个初中数学知识点?- ?难度分级（简?中等/困难?
### 🔄 下一步开?
- M3: 智能组卷功能
- M4: 作业管理功能
- M5: 错题本与学情分析

## 🚀 如何启动项目

### 步骤 1: 配置 Supabase

> **重要**：项目依?Supabase 数据库，必须先完成配置才能正常运?
1. 访问 [https://supabase.com](https://supabase.com) 注册账号
2. 创建新项目（选择离你最近的区域，如 Singapore?3. 进入项目 Dashboard ?Settings ?API
4. 复制以下信息?   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbGci...`

### 步骤 2: 创建环境变量文件

在项目根目录创建 `.env.local` 文件?
```env
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
```

### 步骤 3: 执行数据库脚?
1. ?Supabase 控制台，点击左侧 **SQL Editor**
2. 点击 **New Query**
3. 打开项目中的 `db/schema.sql` 文件
4. 复制全部内容并粘贴到 SQL Editor
5. 点击 **Run** 执行

执行成功后，?**Table Editor** 应该能看?6 个表?
### 步骤 4: 安装依赖并启?
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3002](http://localhost:3002)

## 📝 测试流程

### 1. 注册教师账号

1. 访问 http://localhost:3002
2. 点击"免费注册"
3. 填写信息?   - 姓名：张老师
   - 邮箱：teacher@test.com
   - 密码?23456
   - 角色?*教师**
4. 点击注册

### 2. 登录

1. 使用刚注册的邮箱和密码登?2. 登录成功后会跳转到教师工作台

### 3. 创建第一道题?
1. 点击"题库管理" ?"+ 新建题目"
2. 填写题目信息?   - 题型：选择?   - 题干：`1 + 1 = ?`
   - 选项?     - A. 1
     - B. 2
     - C. 3
     - D. 4
   - 答案：B
   - 知识点：有理数加?   - 难度：简?3. 点击"保存题目"

### 4. 查看题目列表

1. 返回题库管理页面
2. 能看到刚创建的题?3. 尝试编辑或删?
### 5. 测试筛选功?
1. 创建多道题目（不同题型和难度?2. 使用页面顶部的筛选器
3. 测试按题型、难度筛?
## 🎨 界面预览

### 未登录状?- 显示欢迎页，引导用户登录/注册

### 教师端首?- 6 个功能卡片：
  - 题库管理 ?  - 智能组卷 🔄
  - 作业管理 🔄
  - 班级管理 🔄
  - 直播课堂 ?  - 学情分析 🔄

### 题库管理
- 题目列表：表格形式展示，支持分页
- 新建题目：完整表单，支持3种题?- 编辑题目：加载现有数据，支持修改
- 删除题目：确认弹窗，防止误删

## 🐛 常见问题

### Q: 启动项目后页面报?"Missing Supabase environment variables"

**A**: 请检查：
1. 是否创建?`.env.local` 文件
2. 文件中的环境变量名是否正确（必须?`NEXT_PUBLIC_` 开头）
3. 重启开发服务器（Ctrl+C 后重?`npm run dev`?
### Q: 注册后无法登?
**A**: 请检查：
1. Supabase 数据库表是否正确创建
2. ?Supabase 控制??Authentication 查看是否有新用户
3. ?Table Editor ?profiles 查看是否有对应记?
### Q: 创建题目后看不到

**A**: 请检查：
1. 浏览器控制台是否有错?2. Supabase ?Table Editor ?questions 是否有新记录
3. 检?RLS (Row Level Security) 策略是否正确执行

### Q: TypeScript 报错

**A**: 运行以下命令安装类型定义?```bash
npm install --save-dev @types/react @types/react-dom
```

## 📂 核心文件说明

| 文件路径 | 说明 |
|---------|------|
| `src/lib/supabase.ts` | Supabase 客户端配置和类型定义 |
| `src/lib/auth.ts` | 认证相关函数（注册、登录、登出） |
| `src/components/Navbar.tsx` | 导航栏组?|
| `src/app/login/page.tsx` | 登录页面 |
| `src/app/register/page.tsx` | 注册页面 |
| `src/app/questions/page.tsx` | 题目列表页面 |
| `src/app/questions/create/page.tsx` | 新建题目页面 |
| `src/app/questions/edit/[id]/page.tsx` | 编辑题目页面 |
| `db/schema.sql` | 数据库表结构?RLS 策略 |

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [项目执行方案](../archive/legacy-plans/日新教学平台MVP执行方案v2.2-关键修正.md)

## 💡 开发提?
1. **环境变量**: 所有敏感信息都应放?`.env.local` 中，不要提交?Git
2. **数据库迁?*: 修改数据库结构后，记得更?`db/schema.sql`
3. **类型安全**: 充分利用 TypeScript，定义清晰的接口
4. **组件复用**: 相似的UI可以抽取为公共组件放?`src/components/`
5. **错误处理**: 所有异步操作都应有 try-catch 和用户友好的错误提示

## 🎯 下一步建?
根据执行方案 v2.4，接下来应该开发：

1. **M3: 智能组卷** (Week 5-6)
   - 组卷配置界面
   - 随机组卷算法
   - 试卷预览和导?
2. **M4: 作业管理** (Week 7-8)
   - 发布作业
   - 学生作答
   - 自动批改

有任何问题，请参考项目中的文档或查看代码注释?
