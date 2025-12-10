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
- **shadcn/ui** - 统一 UI 组件库 (New York 风格)
- **Radix UI** - 无障碍基础组件
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

**重要**: 本项目使用 pnpm 作为包管理器（已在 package.json 中指定 `packageManager: "pnpm@10.14.0"`）

```bash
# 如果未安装 pnpm，先安装 pnpm
npm install -g pnpm

# 安装项目依赖
pnpm install
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

> 维护提示：执行 `npm run dev:clean` 时会自动运行 `node scripts/log-maintenance.mjs`，将 `logs/failures` / `logs/metrics` 做轮转、并同步 `tmp/archive/2025-12-04/*` 的留痕。无须启动服务也可单独执行该脚本核对 `failuresArchived`、`metricsRotated` 摘要。

## 项目状态（2025-12-07）

### 最新更新：首页加载挂死问题修复 (2025-12-07 晚)
**问题**: 首页卡在"加载中..."，文件上传后不稳定、崩溃

**根本原因**:
1. Middleware 阻塞所有请求，无超时保护 → 整个应用挂死
2. getCurrentProfile() 三层异步调用链无超时 → Promise 永不 resolve
3. 错误处理静默失败 → 用户看不到错误信息

**修复内容**:
- ✅ **middleware.ts** - 添加 5 秒超时保护，移除冗余 refreshSession()
- ✅ **src/lib/utils/timeout.ts** - 新建超时工具函数
- ✅ **src/lib/auth.ts** - getCurrentUser 和 getCurrentProfile 添加 10 秒超时
- ✅ **src/app/page.tsx** - 添加错误状态显示和 15 秒加载超时警告
- ✅ **src/lib/utils/supabase-health.ts** - 新建 Supabase 健康检查工具
- ✅ **src/components/ClientErrorMonitor.tsx** - 新建浏览器端错误监控组件
- ✅ **src/app/layout.tsx** - 集成错误监控组件

**影响**:
- 防止首页永久挂死，10 秒超时后显示错误
- 用户可以看到明确的错误信息和重试按钮
- Supabase 服务未启动时，显示明确提示："请运行 npx supabase start"
- 所有未处理的 Promise 拒绝会被记录到控制台

**验证**: `npm run lint && npm run build` 通过

### 更新：Ant Design 移除 & shadcn/ui 统一 (2025-12-07 早)
- ✅ 完全移除 `antd` 和 `@ant-design/nextjs-registry` 依赖
- ✅ 新增 `FileUpload` 组件替代 Ant Design Upload (支持 R2 存储、拖拽上传、图片预览)
- ✅ 表单系统迁移至 react-hook-form + Zod + shadcn/ui
- ✅ Toast 通知迁移至 Sonner
- ✅ TypeScript 类型安全增强 (Zod schema inference)
- ✅ Build 验证通过 (`npm run lint && npm run build`)
- ⚠️ CSP 要求：未来必须使用严格 CSP，需改用不依赖 eval 的打包模式（如 Turbopack）；禁用或替换 eval 型 source map，确保开发/生产均符合严格 CSP。

## 项目状态（2025-12-06）
- Phase A–D 已完成：DevServer/Supabase 在线，`npm run lint && npm run build && npm run lint:encoding` 全绿，`rg -n "legacy/" src` 与 `rg -n "\\uFFFD"` 均为 0。
- 运行脚本：健康检查 `npm run ci:health`；日志轮转 `node scripts/log-maintenance.mjs`（dry-run/执行两模式）；Supabase 备份+RLS `npm run db:backup:rls`；OCR 压测 `npm run ocr:benchmark`（需 `http://localhost:8000/health` 为 200）。
- 截图/留痕：Puppeteer 巡检截图存放 `docs/project-governance/screenshots/2025-12-*`，图像题链路截图 `docs/project-governance/screenshots/2025-12-06-ingest-upload.png`。
- Phase E 运维例行：日志 30 天、tmp/archive 90 天（`tmp/archive/2025-12-04` 长期留痕），回归失败需保存 screenshot + console + network HAR。

## 日志与 tmp 目录策略

- 启动前推荐执行 `npm run dev:clean`（内置 `node scripts/log-maintenance.mjs`），保持 `logs/failures`、`logs/metrics` 轮换，并同步 `tmp/archive/2025-12-04/*` 留痕。
- 例行巡检可单独运行 `node scripts/log-maintenance.mjs --dry-run` 查看 `failuresArchived`、`metricsRotated` 摘要，必要时记录到 tracker。
- 临时文件仅保留 `tmp/sample-upload.jpg` 作为上传样例，其他调试文件放入 `tmp/archive/2025-12-04/`，新增 tmp 目录需同步更新 `docs/project-governance/file-archive-log.md`。

### 健康检查 / 备份 / 回归
- `npm run ci:health`：串行 lint/build/encoding → `log-maintenance --dry-run` → `rg` 巡检 → `/health`，适用于 CI/定时任务。
- `npm run db:backup:rls`：导出 Supabase 本地库到 `tmp/archive/supabase-backups/YYYYMMDD-HH.sql`，并用 psql 导出当前 RLS 策略到 `rls-audit-*.txt`（可通过 `SUPABASE_DB_URL`、`PG_BIN` 覆盖）。
- Puppeteer 回归：主要业务流（questions/papers/assignments/classes/teacher-analytics/tools/ingest）月度截屏，失败时保存 screenshot + console + network HAR，命名放在 `docs/project-governance/screenshots/YYYY-MM-*` 并在 tracker 记录。

### 日志/轮转/保留策略
- logrotate 频率：CI 每日 `npm run ci:health` 内置 `log-maintenance --dry-run`，周更或发布前执行 `node scripts/log-maintenance.mjs`（非 dry-run）做实际轮转；异常阈值为脚本报错或 `failuresArchived`/`metricsRotated` 不为数字时直接失败。
- tmp/archive 清理：`logs/*`、`logs/metrics/*` 轮转后保留 30 天；`tmp/archive/*` 默认保留 90 天，`tmp/archive/2025-12-04` 作为长期留痕。新增或清理前需更新 `docs/project-governance/file-archive-log.md`，人工例外须在 tracker 备注。
- `rg -n "tmp/archive/2025-12-04"`：下一次 PR 附上校验输出，确认长期留痕目录仍在管控范围。
- metrics/black-box：采集输出统一落在 `logs/metrics/`，轮转后同步至 `tmp/archive/supabase-backups/` 旁的时间戳目录并保留 90 天；如需可视化，可挂接轻量 dashboard（仅读 logs/metrics 压缩包即可）。

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
│   ├── layout.tsx             # 根布局 (shadcn/ui + Sonner Toast)
│   ├── page.tsx               # 首页
│   └── globals.css            # 全局样式 (SuperDesign)
├── components/
│   ├── ui/                    # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── file-upload.tsx    # R2 文件上传组件 (NEW)
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
- [x] 安装 Zustand 状态管理 + 持久化
- [x] 创建 Cloudflare R2 存储服务
- [x] 创建组件测试页面 (`/test-components`)
- [x] 编写开发文档 (组件指南、代码规范、开发指南)
- [x] 调整为浅色主题并验证所有组件
- [x] **移除 Ant Design，统一使用 shadcn/ui** (2025-12-07)

### Sprint 3-4: 核心功能开发 📋 (Week 5-8 计划中)
- [x] 题库管理页面重构 (使用 shadcn/ui)
- [ ] 智能组卷功能优化
- [ ] 作业管理流程完善
- [x] 文件上传集成 R2 存储 (FileUpload 组件)

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

### Phase 4：RealTime 方向（预告）
- 目标：补齐实时协作/直播增强（LiveKit/ZEGO 选型）、作业批改实时反馈、题库实时检索。
- 准备：补充 README Phase4 章节、整理 `docs/technical` 下实时方案文档索引。
- 启动条件：A-D 验收完成后在 tracker 立项，并追加专项质量门槛（lint/build/encoding + DevServer/Puppeteer 留痕）。
- 前置依赖：`ts-node`、`tsconfig-paths` 已安装；确保 `.env.local` 中实时通道、鉴权、模型参数齐全（参考 `docs/technical/*` 方案索引）。

### Phase E：运维例行（当前）
- 健康检查：`npm run ci:health`（lint/build/encoding → `log-maintenance --dry-run` → `rg` → `/health`），CI/定时运行，异常即失败。
- 备份/RLS 审计：`npm run db:backup:rls` 输出至 `tmp/archive/supabase-backups/*`，包含 SQL dump + RLS 列表。
- 日志/轮转：`log-maintenance` dry-run 每日，周更/发布前执行实转；`logs/*` 30 天，`tmp/archive/*` 90 天（`tmp/archive/2025-12-04` 长期留痕），新增/清理需更新 `docs/project-governance/file-archive-log.md`。
- 截图回归：主要业务流（questions/papers/assignments/classes/teacher-analytics/tools/ingest）月度截屏，失败保存 screenshot + console + network HAR，命名 `docs/project-governance/screenshots/YYYY-MM-*` 并记录 tracker。

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

> 📘 设计规范与 RealTime 主题请查阅 [`docs/standards/GAUTHMATH_DESIGN_SYSTEM.md`](./docs/standards/GAUTHMATH_DESIGN_SYSTEM.md)。Tailwind CSS 的 Token 需要直接引用该文档（含附录）的变量。

### 组件库策略
- **shadcn/ui**: 统一 UI 组件库（按钮、输入框、卡片、对话框、表单等）
- **Radix UI**: 无障碍基础组件（下拉菜单、模态框、Tooltip 等）
- **自定义组件**: FileUpload (R2 存储集成)、QuestionForm 等业务组件

### 测试页面
访问 `/test-components` 查看所有组件实际效果

## 📚 文档

- [组件使用指南](./docs/COMPONENT_GUIDE.md) - shadcn/ui 组件使用示例
- [代码规范](./docs/CODING_STANDARDS.md) - TypeScript、React、Git 提交规范
- [开发指南](./docs/DEVELOPMENT_GUIDE.md) - 环境配置、项目结构、常见问题
- [AI 题库技术手册](./docs/ai-question-bank/technical-guide.md) - Gemini/Qwen 解析流程、示例与常见错误

## 🙌 贡献 / PR 模板

- 提交前请阅读 [`docs/project-governance/pull-request-template.md`](./docs/project-governance/pull-request-template.md) 并按照模板填写摘要、变更清单、自测结果与回滚方案。
- 根目录 [`PULL_REQUEST.md`](./PULL_REQUEST.md) 仅保留快速结构，完整说明以文档版本为准。

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

基于 [日新教学平台MVP执行方案v2.4](./docs/archive/legacy-plans/日新教学平台MVP执行方案v2.2-关键修正.md) 开发

### 回归与调试提示
1. 回归前可先运行 `npm run test:std01`，并确认 `.env.local` 中 `GEMINI_MODEL=gemini-2.5-flash`，用 STD-01 样本验证模型链路。
2. 需要跑整套 `npm run test:regression` 时，建议把 `REGRESSION_CONCURRENCY` 临时设为 1，便于定位单张图的异常输出。
3. 当 FAIL/WARN 集中在 `EDGE-04-huge-single-fig`、`BAD-04-folded-paper`、`CPLX-02-dense-small-figures` 等样本时，优先比对黑匣子 `raw_response`，必要时用 `jsonrepair` 还原 JSON，并核对 `actualCount` 与 metadata 的期望值。
4. 如果出现 `model_not_found` 或超时，检查 `.env.local` 中的 `GEMINI_API_KEY`、`GEMINI_BASE_URL`、`GEMINI_MODEL` 是否一致，同时确认代理/官方 Endpoint 的 ID 是否正确。

