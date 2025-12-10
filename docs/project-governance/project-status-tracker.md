# 项目状态追踪(更新于 2025-12-06)

## 1. 版本与环境

| 项目 | 当前状态 | 备注 |
| --- | --- | --- |
| Next.js 构建 | ✅ `npm run build` 2025-12-06 通过 | 12 月全量 lint/build/encoding 均 0 报错（含 `gemini-vision-client.ts`） |
| Dev Server | ✅ `http://localhost:3002` 运行中 | 2025-12-06 Puppeteer 登录成功，截图见 `docs/project-governance/screenshots/2025-12-phaseD-*.png` |
| PaddleOCR 服务 | ✅ `/health` 200 (ocr_loaded=true) | 2025-12-06 `curl http://localhost:8000/health` 200；模型已加载（缓存于 `C:\\Users\\PC\\.paddleocr\\whl\\det/ch_PP-OCRv4_det_infer` 等） |
| Supabase 本地栈 | ✅ `npx supabase start` 在线 | 2025-12-06 已随 DevServer 启动，CLI 迁移沿用 `202511280001_*.sql` |

## 2. ???? / TODO

| ??? | ?? | Owner | ?? |
| --- | --- | --- | --- |
| 🟢 | 图像题巡检（`sample-upload.jpg` 完整链路） | Pipeline | CLI：`ingest-test.ts` 2025-12-06 运行无报错；UI 已用 Puppeteer 上传并识别 1 题（2025-12-05 15:51），截图见 `docs/project-governance/screenshots/2025-12-06-ingest-upload.png`，Gemini 返回正常 |
| ✅ | Legacy 题库工作台组件（QuestionEditor/TagSelector/StickyBar） | 架构 | 已迁入 `src/components/*`，仅需在 Question flows 中引用，无需再访问 legacy |
| ✅ | Legacy Admin 控制台组件 | 架构 | `src/components/admin/*` 已接收完整拷贝，后续从 src 直接复用并维护 stories |
| ✅ | Legacy UI primitives (`archived-components/ui/*`) | 架构 | Shadcn 组件全集搬迁至 `src/components/ui/*`，满足 Question/Admin 模块依赖 |
| ✅ | 日志/临时目录策略 | DevOps | README + tracker 已写明 log-maintenance 触发与 `tmp/archive/2025-12-04` 留痕，`rg -n "tmp/archive/2025-12-04"` 校验为凭证 |
| ✅ | Phase B 批次跟踪 (Batch1~Batch4) | PM/DevOps/前端 | 全部批次已按计划迁移并归档，等待阶段回顾 |
| ✅ | README 补充 Phase4 | PM | README 已新增 Phase4/RealTime 预告，待 Phase4 立项补充细节 |

## 3. 重大变更
- 2025-12-06: DevServer + Supabase 已恢复，`npm run lint && npm run build && npm run lint:encoding` 全绿；`rg -n "legacy/" src` 与 `rg -n "\\uFFFD"` 结果均为 0；Puppeteer 使用 `teacher@test.com` 登录补拍 Dashboard、`/tools/ingest`、`/questions`、`/papers`、`/assignments`、`/classes`、`/teacher-analytics`，截图存于 `docs/project-governance/screenshots/2025-12-phaseD-*.png`。
- 2025-12-06: `node scripts/log-maintenance.mjs --dry-run` -> `failuresArchived=0, metricsRotated=0`；`rg -n "legacy/" src`、`rg -n "\\uFFFD"` 结果为 0；`curl http://localhost:8000/health` 返回 200，`ocr_loaded=true`，模型缓存于 `C:\\Users\\PC\\.paddleocr\\whl\\det/ch_PP-OCRv4_det_infer` 等。
- 2025-12-06: `node -r ts-node/register -r tsconfig-paths/register scripts/ingest-test.ts` 使用 `tmp/sample-upload.jpg` 跑通 CLI 流程；Puppeteer 完成 UI 上传（识别 1 题，见截图 `docs/project-governance/screenshots/2025-12-06-ingest-upload.png`），Gemini 返回正常；README 已加入 Phase4/RealTime 预告。
- 2025-12-06: 图像链路 CLI+UI 均验证通过，Phase A–D 任务收口。
- 2025-12-06: 新增 `npm run ci:health`（lint/build/encoding + log-maintenance dry-run + rg 巡检 + `/health`）与 `npm run db:backup:rls`（`tmp/archive/supabase-backups/*` 备份 + RLS 导出）；README 增补健康检查/备份/Puppeteer 回归规范与截图目录命名。
- 2025-12-06: 明确日志/轮转/保留策略：CI 每日 dry-run，周更/发布前执行轮转；`logs/*` 保留 30 天，`tmp/archive/*` 保留 90 天（`tmp/archive/2025-12-04` 长期留痕）；`rg -n "tmp/archive/2025-12-04"` 将在下一 PR 附校验；metrics/black-box 统一存放 `logs/metrics/`，可选挂接轻量可视化。
- 2025-12-06: README 补充 Phase E 运维例行与 Phase4 前置依赖；组件/样式治理尾项：legacy `<img>` 将按“画布模式”提案（`docs/technical/canvas-image-component-proposal.md`）评估替换路径；数据/模型侧将整理 PaddleOCR 500 复现用例并准备参数/模型压测脚本（含 strip_ratio/anchor 样本库）。
- 2025-12-05: `legacy/AI题库前端最新版/components` 未迁内容归档至 `legacy/AI题库前端最新版/archived-components`，需复用 Question 组件已迁入 `src/components/questions/*` 并记录 `file-archive-log.md`。
- 2025-12-05: 搭设题库工作台关键组件（QuestionEditor/StickyTagBar/ProgressVisualization/Submissions）与 admin 系列、Shadcn UI 全集到 `src/components`，新增 `src/lib/store.ts` 与 `src/types/tasks.ts` 支撑 Zustand 状态持久。
- 2025-12-03:完成文档治理初始阶段,创建 `docs/project-governance/*` 系列文件并归档 5 份旧计划。
- 2025-12-03:`next.config.mjs` watch 忽略系统路径,解决 404/Watchpack 报错。
- 2025-12-03:`gemini-vision-client.ts` 增加 region alias 兼容,防止"缺少配图标注"。
- 2025-12-03:从 `legacy/AI题库前端最新版` 复制 `tabs`/`popover`/`scroll-area` Shadcn 组件到 `src/components/ui/`,`npm run build` 恢复通过。
- 2025-12-04: Legacy README 与用户指南完成 UTF-8 修复,`rg "\\uFFFD" -n` / `rg "替换字符(U+FFFD)" -n` 在非 node_modules 路径中结果均为 0。
- 2025-12-04: `docs/reports/codex` 补充术语映射,新增 `.githooks/pre-commit` + `scripts/check-encoding.mjs`,`npm run lint:encoding` 与 pre-commit 自动运行 `rg` 巡检。
- 2025-12-04: 《阶段 B 文档迁移规划》发布(`docs/project-governance/phase-b-migration-plan.md`),定义 Batch1~Batch4 迁移范围与验证脚本。
- 2025-12-04: Batch2/Batch3 已将 `scripts/README.md`、`tests/dataset/README.md`、`src/styles/design-system.md`、`src/lib/ai-question-bank/README.md` 迁入 docs/，并完成 lint/build/encoding 验证。
- 2025-12-04: Batch4 将 `PULL_REQUEST.md` 模板迁入 `docs/project-governance/pull-request-template.md`，根 README 与贡献指引同步 RealTime 主题、PR 流程。

- 2025-12-04: Phase C 课堂域批次完成“rg → 回迁 → lint/build/encoding”首轮, `rg -n "legacy/AI题库前端最新版" src/app/live src/app/classes src/components/live` 返回 0 结果, 课堂域暂无需回迁, 可转入试卷域与视觉增强域。
- 2025-12-04: Phase C 试卷域依样执行 `rg -n "legacy/AI题库前端最新版" src/app/papers src/app/questions src/components/questions`, 结果同样为 0, 说明题库/试卷界面已全部使用新组件。
- 2025-12-04: 视觉增强域 `<img>` 扫描 (`rg -n "<img" src`) 显示仅 `MarkdownRenderer` 与 `ManualImageCropper` 出于 Markdown 渲染与指针坐标原因保留原生 `<img>`, 均已带规则豁免注释, 其余组件已使用 `next/image`。
- 2025-12-04: 题库导出/视觉增强流水线 (`src/app/tools/ingest/**/*`,`src/components/image-*`,`src/components/questions/*`) 通过 `rg -n "legacy/AI题库前端最新版/components" src/app/tools src/components` 复核, 未发现 legacy 引用；下一批将把确需复用的题库卡片组件直接迁入 `src/components/questions/`。
- 2025-12-04: Phase C「开始录题」页(`/tools/ingest`) 完成单页流程：`rg -n "legacy/" src/app/tools/ingest src/components/questions` 返回 0，无需回迁；`npm run lint && npm run build && npm run lint:encoding` 全部通过；借助 `@modelcontextprotocol/server-puppeteer` 在 DevServer(`npm run dev -p 3002`) 上访问 `http://localhost:3002/tools/ingest`，登录凭据 `teacher@test.com / test123456` 因本地 Supabase(`http://127.0.0.1:54321`) 未启动而滞留登录页，已记录截图，待数据库栈启动后补充交互验收。
- 2025-12-04: 新增 `scripts/ingest-test.ts` 并手动引入 `tsconfig-paths`，补建 `ai-question-bank`/`question-images` bucket，使用 CLI + /tools/ingest UI 双轨实测 `sample-upload.jpg`；首轮识别 1 道题目且截图留痕，后续偶发 Gemini 空响应已在脚本日志中记录。
- 2025-12-04: Phase C「智能组卷」页(`/papers`、`/papers/create`) 执行 `rg -n "legacy/" src/app/papers src/components/papers` 返回 0，确认无 legacy 依赖；`npm run lint && npm run build && npm run lint:encoding` 复跑通过；借助 `server-puppeteer` 登录 DevServer，记录 `/papers` 列表与 `/papers/create` 配置页截图，功能正常。
- 2025-12-04: Phase C「作业管理」链路(`/assignments` 列表、`/assignments/create` 发布页) 同步完成：`rg -n "legacy/" src/app/assignments` 返回 0；复跑 `npm run lint && npm run build && npm run lint:encoding`；使用 `server-puppeteer` 登录 DevServer，验证列表筛选、发布作业表单交互并截图归档。
- 2025-12-04: Phase C「班级管理」+「教学分析」链路(`/classes`、`/classes/[id]`、`/teacher-analytics`) 执行 `rg -n "legacy/" src/app/classes src/app/teacher-analytics` 均为 0，复跑质量三件套后以 `server-puppeteer` 登录拍摄列表/详情/分析页，确认样式与交互稳定。扩展“发布作业”流程时发现 API 返回 `操作失败`（未知错误），已截屏并待后续排查。
- 2025-12-04: 为“发布作业”错误建立调试任务（`docs/issues/assignment-publish-debug.md`）：通过 Node 脚本验证 Supabase RLS 正常，定位为 `datetime-local` 输入格式异常导致 `RangeError`；已在 `src/app/assignments/create/page.tsx` 增加截止时间格式校验并给出更清晰的用户提示，同时巡检 `/analytics`、`/my-assignments`、`/classes/create`，截图归档。
- 2025-12-04: Phase C 最后一批导航（`/my-mistakes`、`/recordings`）完成“rg → lint/build/encoding → DevServer”流程：两个目录 `rg -n "legacy/" src/app/my-mistakes src/app/recordings` 均为 0；复跑质量三件套后通过 `server-puppeteer` 登录录制空状态界面（错误本、课堂录制提示登录），截图入库，至此导航项全部有验证留痕。
- 2025-12-04: 针对仍保留 `<img>` 的 `MarkdownRenderer`、`ManualImageCropper`, 计划在下一轮视觉设计评审评估是否抽象“画布模式”基础组件, 以便统一懒加载策略并收敛 eslint overrides。
- 2025-12-04: 从 `legacy/AI题库前端最新版/components` 回迁 QuestionCard/QuestionLibraryCard/LibraryFilters/LibraryStats 至 `src/components/questions/`，Questions 模块可直接引用 `src` 版本卡片。
- 2025-12-04: 新增《docs/technical/canvas-image-component-proposal.md》，定义“画布模式”组件的 API、懒加载策略及 `<img>` 保留场景，为后续替换 MarkdownRenderer/ManualImageCropper 做准备。
- 2025-12-04: DevServer 以 Puppeteer 驱动 `teacher@test.com / test123456` 登录 `http://localhost:3002/questions` ，确认 LibraryStats/LibraryFilters 随多选筛选与全文搜索实时联动；输入“计算”后统计缩减为 6 条且分页归 1/1，题篮抽屉支持勾选、排序与批量导出。`POST /api/export-tasks/create` 与轮询 `/api/export-tasks/status?taskId=98d0aa6c-13e1-4936-a2b7-ed418017c3a7` 均返回 200，任务目前保持 PENDING（等待 worker 生成 download_url），结果已记录在本 tracker 便于后续跟进。

## 4. ?????

| ??? | ??/?? | ?? | ?? |
| --- | --- | --- | --- |
| Gemini ?? | `scripts/run-image-baseline.mjs` + `tmp/baseline/*.json` | ?? | ???? `tmp/baseline/baseline-*.json` ????? |
| Pipeline ?? | `scripts/check-pipeline-health.mjs` / `/health` | ?? | ???? `/health` ?? |
| ?? | `rg "\uFFFD" -n` / `rg "&#xFFFD;&#xFFFD;&#xFFFD;" -n` | ?? PR + pre-commit | `.githooks/pre-commit` & `npm run lint:encoding` ?? 0 ?? |
| ?? / tmp ?? | `node scripts/log-maintenance.mjs` + `tmp/archive/2025-12-04/*` | DevOps ?? `npm run dev:clean` + ???? | DevOps ?? `failuresArchived`/`metricsRotated`?`rg -n "tmp/archive/2025-12-04"` ?????? |
| ts-node / tsconfig-paths | `npm install -D ts-node tsconfig-paths` | DevOps | ?? `scripts/ingest-test.ts` ??????? CLI ???? |

## 5. 待定决策

1. ✅ `legacy/` 目录已创建,`SuperClaude_Framework`、`claude-code-workflows`、`superdesign`、`AI题库前端最新版` 等均已迁入;下一阶段需要评估哪些组件要迁回 `src/` 并删除剩余副本。
2. Supabase 迁移命名修正规划(`202511280001` → `20251128000001`)。
3. Watchpack/日志策略是否写入 `docs/technical/` 供 DevOps 执行。
