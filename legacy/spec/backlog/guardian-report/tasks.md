# 家长汇报模式 - Tasks

| 编号 | 描述 | Owner | 状态 | 验证 | 备注 |
| --- | --- | --- | --- | --- | --- |
| T1 | `reports` 表 + RLS 策略（含 share_token/expires） | Dev | todo | Supabase migration + `db/schema.sql` | 需参考宪法中安全策略 |
| T2 | `POST /api/reports/guardian` + 数据快照逻辑 | Dev | todo | `npm run build` + 单元测试 mock | WIP 前置 T1 |
| T3 | `ReportBuilder` UI + 表单校验 | Frontend | todo | 手动走通“选择模板→生成链接” | 依赖 `analytics` 查询 |
| T4 | 分享页 SSR & 访问日志 | Dev | todo | E2E：未登录家长访问→看到报告 | 注意 token 过期提示 |
| T5 | PDF/短链能力（可放 Vercel Function） | DevOps | todo | 下载 PDF + 打开短链 | 允许异步生成 |
| T6 | 文案 & 帮助中心更新 | PM | todo | `docs` 中新增使用指南 | 需含常见 FAQ |

> Definition of Done：老师可挑选班级/学生生成报告、复制链接给家长，访问记录可在 UI 查看，`npm run build` / lint / tests 全绿。
