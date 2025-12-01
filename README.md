# 日新教学平台 MVP

> 智能组卷 · 自动批改 · 学情分析

## 🎯 项目概述

日新教学平台是一款专为中小型教培机构设计的智能教学工具，帮助教师：
- ✅ 10分钟完成组卷（节省80%时间）
- ✅ 客观题自动批改（节省50%时间）
- ✅ 自动生成错题本和学情分析

## 🛠️ 技术栈 (v5 升级版)

### 核心框架
- **Next.js 14.2.7** - App Router + React Server Components
- **TypeScript 5** - 类型安全开发
- **React 18** - UI 构建

### UI & 设计系统
- **shadcn/ui** - 基础 UI 组件库 (New York 风格)

- **Tailwind CSS 3** - 原子化 CSS + SuperDesign 主题
- **Lucide Icons** - 图标库

### 状态管理 & 数据
- **Zustand** - 轻量级状态管理 + 持久化
- **Supabase** - PostgreSQL 数据库 + Auth + Realtime
- **Cloudflare R2** - 对象存储 (S3 兼容)

### 开发工具
- **ESLint** - 代码检查
- **TypeScript** - 类型检查

## 📦 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

- 复制 `.env.local.example → .env.local`；
- 或直接运行 `node ./scripts/start-local-dev.mjs`，脚本会自动同步本地 Supabase URL/Anon Key；
- 详细配置请参考 [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) 与 [docs/LOCAL_DEV_SETUP.md](./docs/LOCAL_DEV_SETUP.md)。

### 3. 创建数据库表

1. 登录 [Supabase控制台](https://supabase.com)
2. 进入 SQL Editor
3. 复制 `db/schema.sql` 的内容并执行

> 如果使用 `npx supabase start`，CLI 将在启动过程中自动执行全部迁移。

### 4. 启动开发服务器

```bash
# 一键启动 Supabase + Next.js（推荐）
node ./scripts/start-local-dev.mjs

# 或者手动分步运行
npx supabase start
npm run dev
```

访问 [http://localhost:3002](http://localhost:3002)

## 📁 项目结构

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                # 认证路由组
│   │   ├── login/
│   │   └── register/
│   ├── questions/             # 题库管理
│   ├── papers/                # 智能组卷
│   ├── classes/               # 班级管理
│   ├── assignments/           # 作业管理
│   ├── live/                  # 直播教学
│   ├── analytics/             # 数据分析
│   ├── test-components/       # 组件测试页面
│   ├── layout.tsx             # 根布局 (Ant Design + shadcn/ui)
│   ├── page.tsx               # 首页
│   └── globals.css            # 全局样式 (SuperDesign)
├── components/
│   ├── ui/                    # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── Navbar.tsx             # 导航栏
├── lib/
│   ├── utils.ts               # 工具函数
│   ├── supabase.ts            # Supabase 客户端
│   └── storage.ts             # Cloudflare R2 存储
├── stores/
│   ├── userStore.ts           # 用户状态 (Zustand)
│   └── questionBasketStore.ts # 题篮状态
└── types/
    └── database.ts            # 数据库类型定义

docs/
├── COMPONENT_GUIDE.md         # 组件使用指南
├── CODING_STANDARDS.md        # 代码规范
└── DEVELOPMENT_GUIDE.md       # 开发指南

components.json                 # shadcn/ui 配置
tailwind.config.ts             # Tailwind + SuperDesign 配置
.env.local.example             # 环境变量模板
```

## ✅ 开发进度 (v5 升级计划)

### Sprint 1-2: 环境搭建与设计系统 ✅ (Week 1-4 已完成)
- [x] 安装 shadcn/ui 组件库 (9个组件)
- [x] 配置 Tailwind CSS + SuperDesign 主题系统
- [x] 安装 Ant Design 并配置主题映射
- [x] 安装 Zustand 状态管理 + 持久化
- [x] 创建 Cloudflare R2 存储服务
- [x] 创建组件测试页面 (`/test-components`)
- [x] 编写开发文档 (组件指南、代码规范、开发指南)
- [x] 调整为浅色主题并验证所有组件

### Sprint 3-4: 核心功能开发 📋 (Week 5-8 计划中)
- [ ] 题库管理页面重构 (使用 shadcn/ui + Ant Design)
- [ ] 智能组卷功能优化
- [ ] 作业管理流程完善
- [ ] 文件上传集成 R2 存储

### Sprint 5-6: 高级功能 📋 (Week 9-12 计划中)
- [ ] 直播教学模块 (ZEGO/LiveKit)
- [ ] 错题本与学情分析
- [ ] 数据导出 (PDF/Excel)
- [ ] 性能优化

### Sprint 7-8: 测试与部署 📋 (Week 13-16 计划中)
- [ ] E2E 测试
- [ ] 性能测试
- [ ] 安全审计
- [ ] 生产环境部署

## 🔑 主要功能

### 教师端
- 题库管理：支持选择题、填空题、解答题
- 智能组卷：根据知识点、难度自动生成试卷
- 作业管理：发布、批改、统计
- 班级管理：管理学生和班级
- 学情分析：查看学生学习数据

### 学生端
- 在线作答：支持多种题型
- 错题本：自动收集错题
- 学习报告：查看知识点掌握情况

## 🔒 数据安全

- 使用 Supabase Row Level Security (RLS) 保护数据
- 教师只能访问自己创建的数据
- 学生只能访问自己班级的数据
- 密码使用bcrypt加密存储

## 🎨 设计系统 (SuperDesign)

### 主题色
- **Primary (主色)**: #8b5cf6 (紫色)
- **Success (成功)**: #10b981 (绿色)
- **Warning (警告)**: #f59e0b (橙色)
- **Error (错误)**: #ef4444 (红色)

### 组件库策略
- **shadcn/ui**: 基础 UI 组件（按钮、输入框、卡片、对话框等）
- **Ant Design**: 复杂业务组件（表格、表单、日期选择器等）

### 测试页面
访问 `/test-components` 查看所有组件实际效果

## 📚 文档

- [组件使用指南](./docs/COMPONENT_GUIDE.md) - shadcn/ui + Ant Design 使用示例
- [代码规范](./docs/CODING_STANDARDS.md) - TypeScript、React、Git 提交规范
- [开发指南](./docs/DEVELOPMENT_GUIDE.md) - 环境配置、项目结构、常见问题
- [Gemini Vision V3](./src/lib/ai-question-bank/README.md) - AI 题库流式解析、调试脚本与常见错误

## 📝 开发规范

- 使用 TypeScript 严格类型检查
- 客户端组件使用 `"use client"` 标记
- 优先使用 Tailwind CSS 类名
- 使用 SuperDesign 语义化 CSS 变量 (`bg-primary`, `text-muted-foreground`)
- API 路由放在 `app/api/` 目录
- 组件命名使用 PascalCase，文件使用 camelCase

## 🚀 部署

```bash
npm run build
npm start
```

推荐使用 Vercel 部署，环境变量配置与本地相同。

## 📄 许可证


## 🤖 Gemini Vision 调试

- 题库解析默认使用 Google Gemini 2.5 Flash Streaming，可通过 `GEMINI_API_KEY`、`GEMINI_BASE_URL`（当前默认 https://api.ikuncode.cc，如需官方 Endpoint 可自行替换）、`GEMINI_MODEL`、`GEMINI_REQUEST_TIMEOUT` 调整。
- 运行 `node scripts/test-gemini-stream.ts 测试试卷7.png` 可在本地触发流式解析，输出题号、配图校验与 base64 预览。
- 常见错误：
  1. **模型不可用 / 403**：检查 `GEMINI_MODEL` 是否生效、Base URL 是否匹配实际服务。
  2. **JSON 截断**：流式响应可能夹带提示语，可降低温度或重试，并参考脚本输出的截断片段。
  3. **空内容 / 坐标越界**：确保上传原图，系统已默认附加 20px / 2% padding 并执行 `.trim()` 去除底色。

MIT License

---

基于 [日新教学平台MVP执行方案v2.4](./日新教学平台MVP执行方案v2.2-关键修正.md) 开发

### 回归与调试提示
1. 回归前可先运行 `npm run test:std01`，并确认 `.env.local` 中 `GEMINI_MODEL=gemini-2.5-flash`，用 STD-01 样本验证模型链路。
2. 需要跑整套 `npm run test:regression` 时，建议把 `REGRESSION_CONCURRENCY` 临时设为 1，便于定位单张图的异常输出。
3. 当 FAIL/WARN 集中在 `EDGE-04-huge-single-fig`、`BAD-04-folded-paper`、`CPLX-02-dense-small-figures` 等样本时，优先比对黑匣子 `raw_response`，必要时用 `jsonrepair` 还原 JSON，并核对 `actualCount` 与 metadata 的期望值。
4. 如果出现 `model_not_found` 或超时，检查 `.env.local` 中的 `GEMINI_API_KEY`、`GEMINI_BASE_URL`、`GEMINI_MODEL` 是否一致，同时确认代理/官方 Endpoint 的 ID 是否正确。

