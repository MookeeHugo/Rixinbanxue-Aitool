# 家长汇报模式 - Plan

## 摘要
生成可分享的家长汇报，复用学情分析数据，落地为可配置的报告（链接 + PDF）。

## 实现策略
1. 新建 `reports` 表：`id, student_id, assignment_range, audience, sections[], share_token, expires_at, created_by, created_at`。
2. API：
   - `POST /api/reports/guardian`：根据所选班级/时间段生成报告，写入 Supabase。
   - `GET /share/reports/[token]`：SSR 渲染只读页面。
3. 前端：在 `analytics/page.tsx` 添加 `ReportBuilder` 组件（选择模板、Logo、备注）。
4. 导出：使用 `@react-pdf/renderer` 或 Vercel function 将报告转成 PDF；短链可用 Supabase Edge Functions。
5. 权限：通过 `audience` + `share_token` 控制；老师可撤销 token。

## 架构 / 数据流
- `analytics` 现有查询 → 聚合数据 → `ReportBuilder` 选择 sections → 调用 API 生成 `reports` 行。
- SSR 分享页读取 `share_token`，校验 `expires_at`，展示静态数据（不再命中实时接口）。

## 验证与回滚
- 命令：`npm run build`、`pnpm lint`、`npm run test:reports`（新增）。
- 回滚：删除 `reports` 新增字段/行即可；短链通过 `share_token` 控制。

## 风险与对策
| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 无鉴权导致越权访问 | 泄露学生数据 | token + expires + 访问日志；老师可撤销 |
| 报告生成慢 | 影响体验 | 预生成 JSON + 后台渲染 PDF，先返回分享链接再异步 PDF |
| 数据不一致 | 家长质疑 | 报告存储快照，不实时引用 mutable 数据 |

## 里程碑
- M1：Schema + API ready
- M2：ReportBuilder UI + 分享页
- Beta：PDF 导出 + 访问日志
