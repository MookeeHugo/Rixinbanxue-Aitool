# 智能节奏助手 - Tasks

| 编号 | 描述 | Owner | 状态 | 验证 | 备注 |
| --- | --- | --- | --- | --- | --- |
| P1 | 设计 `tasks` 表+RLS+seed | Dev | todo | `db/schema.sql` 更新 + Supabase 控制台验证 | RLS 区分 teacher/assistant |
| P2 | Edge Function / Cron 同步逻辑（班级/作业/直播） | DevOps | todo | 手动触发 Cron 后 `tasks` 表生成记录 | Upsert by `source_id+type` |
| P3 | REST API (`GET/PATCH/notify`) + 审批钩子 | Dev | todo | `npm run build` + 单元测试 | 依赖 P1 |
| P4 | Dashboard 组件 UI/UX + Snooze | Frontend | todo | 录屏：新增→完成→Snooze→提醒 | 
| P5 | 通知模板 & 审计日志 | DevOps | todo | 发送测试邮件/站内信成功 | 记录 rate limit |
| P6 | 操作文档/帮助中心 | PM | todo | README/FAQ 更新 | 引导老师设置提醒策略 |

> DoD：老师刷新 Dashboard 即可看到任务，Snooze/提醒/指派全部可验证，Cron 没有重复任务，日志可查。
