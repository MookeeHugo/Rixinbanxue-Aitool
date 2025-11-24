# rixin 题库实现规划（MVP 版）

## 1. 项目背景与目标
- **业务痛点**：教师录题缓慢、题库结构化程度不足、缺少统一的 AI 解析能力，导致题库难以复用、推荐/组卷效率低。
- **现状**：question-entry-tool 只有前端 Demo；日新教育平台有完整教学/题库/导出能力但缺少自动解析。
- **愿景**：打造一个“上传即解析、可审可控、可扩展”的 AI 题库平台，使教师 30 秒即可完成一道题录入，支持多租户与 SaaS 化。

## 2. 产品定位与 KPI
| 指标 | 目标值（R1.1） |
| --- | --- |
| 人工录题时间 | ≤ 30 秒/题 |
| OCR/解析准确率 | ≥ 95%（经人工确认） |
| 解析成功率 | ≥ 99% |
| 平均响应时长 | ≤ 5 分钟/整卷 |
| 系统可用性 | ≥ 99% |

## 3. 角色与场景
| 角色 | 需求 |
| --- | --- |
| 录题教师 | 上传试卷、查看解析结果、编辑题干/答案/标签、批量入库 |
| 学科负责人 | 审核题库、监控成本、查看统计报表 |
| 系统管理员 | 管理供应商、限额、监控、告警 |
| 第三方平台 | 通过 API 获取题库/解析结果 |

## 4. 业务流程
1. **登录/鉴权**：教师使用日新平台账号登录，BFF 注入 Supabase token、tenant 信息。
2. **上传**：拖拽/选择 PDF → BFF → 解析服务，上传至 R2，创建 `upload_tasks` 记录。
3. **解析**：Worker 调用 Qwen（OCR+VLM+LLM）提取文本、题号、选项、答案草稿、图片；结果写入 `parsed_questions`。
4. **人工校验**：QuestionEditor 拉取解析结果，教师修改/确认、补充标签、处理图片。
5. **批量入库**：选择题目 → 调用 `/api/ingest/batch` → 写入 `questions/question_tags/question_images`。
6. **题库使用**：主平台 Library/组卷/作业模块读取最新题目，支持筛选/统计。
7. **监控/追踪**：`provider_usage_logs`、`tenant_quotas`、钉钉告警记录全流程。

## 5. 技术架构
```
浏览器（Next14 SPA）
   ↓ BFF（/api/ingest/*，Next Route Handler）
解析服务（Next14 API + Worker + Redis）
   ↓
Supabase (Postgres + RLS) / Cloudflare R2 / Redis / 钉钉告警
```
- **解析服务**：负责上传、任务管理、Qwen 解析、批量入库接口。
- **Worker**：BullMQ 或 Inngest，异步拉取任务 → 下载 R2 文件 → 调用 Qwen → 切题 → 保存。
- **模型策略**：MVP 统一使用 Qwen-VL-Max（OCR/VLM）+ Qwen LLM（标签、答案建议）；DeepSeek-OCR 作为后续可选，通过云托管部署接入。
- **数据层**：共享 Supabase，表包括 `upload_tasks/parsed_questions/question_images/question_tags/provider_usage_logs/tenant_quotas/questions` 等。

## 6. MVP 范围
| 版本 | 范围 |
| --- | --- |
| MVP（当前） | 单租户、仅支持 PDF、仅 Qwen 模型、手工审批后批量入库，Admin 仅提供配额/供应商基本配置 |
| 迭代1 | 引入多租户、配额/套餐、成本报表、任务恢复、钉钉告警 |
| 迭代2 | 供应商策略实验、DeepSeek-OCR 云部署、自动化推荐/作业联动 |

## 7. 分阶段实施路线
### 阶段 1：基础设施（Week1-2）
- Supabase migration：创建所有新表、RLS、索引、触发器。
- 文件存储：复用 `src/lib/storage.ts`，统一 R2 Bucket 命名。
- BFF 骨架：`/api/ingest/upload/tasks/questions` 返回 mock 数据，打通前端状态管理。
- 交付物：数据库结构、README、.env、CLI 脚本。

### 阶段 2：解析 API + Worker（Week3-4）
- 上传 API 写入 R2 + `upload_tasks`，校验文件大小/格式/配额。
- Worker：BullMQ + Redis，执行“下载 → Qwen OCR/VLM → 切题 → Qwen 标签/答案 → 写 `parsed_questions` → 更新进度”。
- Provider Logs：记录 taskId、provider_id、stage、duration、tokens、cost、confidence、success。
- Deliverable：真实解析结果在 QuestionEditor 中可见。

### 阶段 3：人工校对与批量入库（Week5-6）
- QuestionEditor：读取 `parsed_questions`，高亮置信度，支持文本/图片编辑、拖拽排序、批量选择。
- `/api/ingest/batch`：幂等接口，支持事务写 `questions/question_tags/question_images`，更新 `parsed_questions.is_submitted=true`。
- Library：查询最新题目，按知识点/难度筛选，展示图片。
- Deliverable：单卷上传→解析→编辑→批量入库→库中可见，全链路演示通过。

### 阶段 4：配额、监控与商业化准备（Week7-8）
- `tenant_quotas`：记录 page/token/cost 三类资源，提供 `checkQuota/reserveQuota/rollbackQuota` RPC。
- Admin：展示配额、使用曲线、超限告警，管理 Qwen/DeepSeek 供应商。
- 成本报表：聚合 `provider_usage_logs`，按供应商/策略/租户统计。
- 告警：任务失败/超时/成本异常推送钉钉。

## 8. 大模型策略（Qwen 优先）
1. **OCR/VLM**：全部使用 Qwen-VL-Max，覆盖 PDF 文字、数学、图像、手写。
2. **LLM 标签/答案**：使用 Qwen2-72B 或 Qwen2.5-32k，根据 token 量控制成本。
3. **DeepSeek-OCR 预案**：当 Qwen 成本或 SLA 不满足时，再开启云托管 DeepSeek-OCR；Provider Factory 预留 `deepseek-ocr-cloud` 配置，支持按任务类型切换。
4. **策略示例**：
```
Standard：Qwen-VL-Max OCR + Qwen2 LLM（默认）
MathHeavy：Qwen-VL-Max OCR + Qwen2 LLM，增加 LaTeX 保真步骤
CostSaving：Qwen-VL-Lite OCR + Qwen-Turbo LLM（低成本）
```

## 9. 数据库设计
- `upload_tasks`：记录用户、tenant、文件信息、status/progress/stage、traceId、错误信息。
- `parsed_questions`：暂存解析结果，含类型、题干、选项、答案草稿、tags JSON、difficulty、confidence、图片、页码、`is_selected/is_submitted`。
- `question_images`、`question_tags`：多图、多标签支持。
- `provider_usage_logs`：记录供应商调用日志，便于成本/实验分析。
- `tenant_quotas`：配额与费用控制。
- 所有表启用 RLS：按 `user_id/tenant_id` 隔离；Worker 使用 Service Role 写入。

## 10. 配额与成本控制
- `checkQuota`：在上传前校验剩余页数；解析完成后记录 token 和 estimated cost。
- `overage_policy`：`block/queue/billable`，默认阻断，支持为 VIP 租户开启队列或计费模式。
- Admin Dashboard：展示配额使用率、token 消耗曲线、成本柱状图，支持导出 CSV。

## 11. 日志与监控
- **TraceId**：上传 API 生成 `traceId`，贯穿 BFF、Worker、Provider 调用、DB 记录、告警。
- **结构化日志**：BFF/Worker 通过 `logger.info/error` 输出 JSON（traceId、taskId、provider、耗时、用户/tenant）。
- **告警**：钉钉/企微 Webhook。触发条件包括解析失败率 >5%、任务平均耗时 >10 分钟、配额使用率 >95%。
- **审计**：`audit_logs` 记录题目增删、供应商更改、配额调整。

## 12. 工程与运维
- 仓库：question-entry-tool 与主平台共用 pnpm/Node20，统一 ESLint/Prettier。
- 脚本：`pnpm dev`（带解析服务）、`pnpm ingest:dev`、`pnpm ingest:worker`、`pnpm supabase:reset`、`pnpm test:e2e`。
- CI：Lint + Unit Test + Supabase Migration + Playwright；解析 Worker 允许在 CI 中运行 mock。
- 本地调试：`scripts/start-local-dev.mjs` 扩展为“Supabase -> Redis -> 解析服务 -> BFF -> 前端”。

## 13. 风险与对策
| 风险 | 描述 | 对策 |
| --- | --- | --- |
| 模型单点 | 全部依赖 Qwen，若额度不足会阻塞解析 | 提前申请配额、实现重试+熔断、预留 DeepSeek 云部署开关 |
| 数据不一致 | 解析端与题库同步失败导致错题入库 | 统一写 Supabase，一次事务完成题目+标签+图片更新 |
| 成本失控 | 大批量解析导致费用飙升 | `tenant_quotas` + 配额告警 + 成本报表 + Admin 扣费策略 |
| 性能瓶颈 | 长文档/超大 PDF 导致超时 | 客户端预处理（拆页、压缩）、Worker 并发 + 分页解析、长任务告警 |
| 安全问题 | Service Role 泄露或越权写库 | 仅在服务器持有 Service Key，所有操作写审计日志，并限制解析 API 白名单 |

## 14. 下一步
1. 完成 migration + `.env` + CLI 说明。
2. 交付上传/任务 API，加上 mock Worker，跑通端到端。
3. 接入 Qwen 真正解析示例，实现第一条真实链路。
4. 完成 QuestionEditor 批量入库，与主平台 Library 联调。
5. 实现配额、告警与成本报表，准备试运行汇报。

完成上述步骤后，即可进入小规模试点与深度优化阶段，同时为后续引入 DeepSeek-OCR 或多租户 SaaS 做好铺垫。
