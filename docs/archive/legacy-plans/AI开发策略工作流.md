# AI 开发策略与工作流指南

> 汇总自《AI题库系统-终极综合优化方案v3.0》及 Day0/Day1 执行日志，帮助在日新题库 MVP 中复用一致的策略、拆解流程、定位问题。

---

## 1. 决策与规划策略

### 1.1 双路线评估
- **路线 A（Claude 原案）**：Redis + BullMQ、6 张数据表、8~10 周 / 楼38-42 元/题。适合有足够人力和预算的企业级场景。
- **路线 B（极简 MVP）**：Inngest（Serverless）+ Qwen-VL + 2 张表，3 周/楼12-18 元/题，月运维约楼100。推荐给单人/小型团队先验证价值。

### 1.2 核心取舍原则
1. **Speed over Perfection**：先跑通 MVP（上传 → AI → 入库），后续迭代再扩展功能。
2. **Simplicity over Enterprise**：用 Server Actions、两张表、单模型，少即是多。
3. **Serverless First**：Inngest 免除 Redis 运维，按需扩展；若后续吞吐 > 1000 题，再替换 BullMQ。
4. **Progressive Enhancement**：2 表起步 → V1.1 加 usage_log → V2.0 加 question_images / tenant_quotas。

---

## 2. 模块化交付结构

| 阶段 | 交付物 | 说明 |
|------|--------|------|
| Day0 | 环境清单 + 测试脚本 | .env 配置、Supabase migration、DashScope key、Inngest CLI 等 |
| Day1 | `/tools/ingest` UI | 页面路由 + 文件上传组件 + 任务列表组件 |
| Day2 | Inngest Worker + AI 解析 | 触发 upload 事件，调用 Qwen-VL，落表 parsed_questions |
| Day3 | QuestionEditor + 批量入库 | `/tools/ingest/[id]/review`、人工编辑、批量提交 |

辅助文档在 `AI题库MVP-交付清单.md` 中维护，所有示例代码路径按模块整理，便于快速定位。

---

## 3. 执行工作流

### 3.1 Day0 – 环境准备
1. **申请 API**：DashScope (Qwen-VL)，Inngest Free Plan。
2. **配置 `.env.local`**：QWEN_API_KEY、Supabase keys、R2 信息等全部写入 UTF-8 文本。
3. **安装依赖**：`npm install inngest dotenv`（项目已有 React/Tailwind/Supabase）。
4. **数据库初始化**：执行 `npx supabase db reset`，确保 upload_tasks / parsed_questions 及 RLS 生效。
5. **准备测试文件**：`tests/fixtures/` 下存放清晰 / 模糊 / 复杂题型的 JPG/PNG/PDF。

### 3.2 Day1 – UI 与前端逻辑
1. **路由 `/tools/ingest`**：SSR 验证教师身份（调用 `/api/profile`），非教师重定向。
2. **FileUploadSection**：
   - 支持拖拽、点击选取；校验扩展名、MIME、体积（≤20MB）。
   - 调用 `uploadQuestionFile()` Server Action；上传成功触发 toast、刷新任务列表。
3. **TaskListSection**：
   - 初次加载最近 10 条记录。
   - 进度轮询：对 pending/processing 任务每 2 秒刷新 Supabase 数据。
   - 状态展示（🕐 pending；⚙ processing；✅ completed；❌ failed），附错误信息、题目数量。
4. **缺失依赖处理**：若引入 `useToast`、`Progress` 等自定义组件，需在 `src/hooks/`、`src/components/ui/` 下自建最小实现，统一使用 UTF-8。

### 3.3 Day2 – AI 解析 & Inngest Worker
1. **Server Actions → Inngest**：`uploadQuestionFile` 在上传完成后通过 Inngest 事件触发 `processPdfUpload`。
2. **Worker 步骤**：
   1. 从 R2 下载文件；
   2. 调用 `lib/ai-question-bank/qwen-flash.ts`（统一 Prompt、封装 JSON 输出）；
   3. 将结果写入 `parsed_questions` 表；
   4. 更新 `upload_tasks` 状态、progress、total_questions。
3. **调试建议**：
   - 本地启用 `npx inngest-cli dev`（8288 端口）；
   - 通过 Dashboard 查看事件流、函数日志；
   - 如果报 “模块找不到” 或 “未导出函数”，检查路径别名，仅 `@/` 指向 `src/`，项目根目录需使用相对路径。

### 3.4 Day3 – 审核与入库
1. **Review 页面**：`/tools/ingest/[id]/review` 展示解析结果、低置信度高亮、支持编辑。
2. **批量提交**：调用 Supabase RPC `batch_submit_questions`，将勾选题目写入主 questions 表。
3. **权限控制**：只允许任务所属教师查看/操作；提交后 `parsed_questions` 标记 `is_submitted=true`。

---

## 4. 常见问题与处理套路

| 问题 | 处理方法 |
|------|----------|
| `Module not found: '@/inngest/client'` | `@/` 仅覆盖 `src/`，根目录的 `inngest/` 需使用相对路径；修改后清理 `.next` 缓存、重启 dev server。 |
| `createClient`、`getFile` 未导出 | 逐个检查 `src/lib/xxx.ts` 中是否真实导出；若使用 server 端工具需从 `src/lib/server/` 引入。 |
| 上传后任务一直 pending | 确认 Inngest Dev Server 是否运行；访问 `http://localhost:8288` 查看函数是否订阅成功。 |
| AI 解析准确率低 | 强调 Week2 Prompt 工程：提供多样示例、设定 JSON schema、对低置信度题目要求人工确认。 |
| 端口冲突 / 页面不可访问 | 使用 `npx next dev -p 3002` 启动；如出现 `EADDRINUSE`，杀掉旧进程再清 cache。 |
| UTF-8 乱码 | 所有 md、ts、tsx、.env 文件统一保存为 UTF-8；`chcp 65001` 后再运行命令。 |

---

## 5. 测试与验收清单

### 5.1 功能验证
- [ ] 教师账号登录后可访问 `/tools/ingest`，非教师被拦截。
- [ ] 上传多种格式（JPG/PNG/PDF）；超限或类型错误给出 toast。
- [ ] 任务列表展示状态、进度、错误信息；解析成功后更新题目数量。
- [ ] Inngest Worker 能读取 R2 文件、调用 Qwen、写入 parsed_questions。
- [ ] Supabase 中 upload_tasks / parsed_questions 数据正确，RLS 生效。
- [ ] 结果页面可编辑题目、批量提交入库。

### 5.2 性能与成本
- [ ] 单文件解析控制在 2~5 分钟内（含 AI 调用）。
- [ ] Qwen token 统计符合预期（~楼0.002/题）；若激增，分析 Prompt 或重复调用。
- [ ] Supabase + R2 + Inngest 月成本 < 楼100（在 2,500 题/月内）。

---

## 6. 文档与协作

1. **策略文档**：`AI题库系统-终极综合优化方案v3.0.md` 记录路线比对、成本模型。
2. **交付清单**：`AI题库MVP-交付清单.md` 列出每个模块的文件、接口、示例路径。
3. **执行日报**：Day0/Day1/Day2 报告用于同步进度、记录坑点。
4. **运行指南**：`AI题库MVP-系统运行指南.md` 说明如何启动服务、测试上传流程。

建议每次迭代都更新以上文档，保持策略、代码、环境一致，减少新人上手成本。

---

**最后更新**：2025-11-24  
