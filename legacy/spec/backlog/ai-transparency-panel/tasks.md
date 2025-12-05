# AI 决策透明面板 - Tasks

| 编号 | 描述 | Owner | 状态 | 验证 | 备注 |
| --- | --- | --- | --- | --- | --- |
| A1 | `decision_log` 表 + RLS + Supabase SDK types | Dev | todo | `db/schema.sql` 更新 + Supabase 控制台验证 | 需记录 feature/entity_id |
| A2 | AI worker 写日志（组卷/批改） | AI/Backend | todo | 运行一次组卷→log 行存在 | 需解决构建错误 Issue #1 |
| A3 | API `GET/PATCH /api/decision-log` | Dev | todo | `npm run build` + 单元测试 | 依赖 A1 |
| A4 | `DecisionInspector` 组件 + UI 注入 | Frontend | todo | 录屏 + 截图 | 需要 `useDecisionLog` hook |
| A5 | 回退流程（更新 entity + 写 feedback） | Dev | todo | 手动复现“回退→恢复” | Version check |
| A6 | 监控/报表（Grafana/Logflare） | DevOps | todo | dashboard screenshot | 

> DoD：在组卷/批改页面可查看透明面板、看到候选/置信度，能回退并记录反馈。
