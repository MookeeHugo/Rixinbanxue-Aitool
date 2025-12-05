# 智能节奏助手 - Plan

## 摘要
整合班级、作业、直播等信号，生成“今日节奏”任务并可发送提醒。

## 实现策略
1. 新建 `tasks` 表：`id, type, source_id, owner_id, assignee_id, due_at, priority, status, snooze_until, channel_config, metadata`。
2. Edge Function（或 Supabase Cron）每 30 分钟扫描 assignments、live sessions、reports，写入/更新任务。
3. Dashboard 组件 `PaceAssistantPanel`：
   - 按优先级分栏
   - 操作：完成、Snooze、推送提醒、指派助教
4. 通知服务：复用现有消息通道（站内 + Email），落日志。

## 架构 / 数据流
- Cron → `tasks` 表
- API `GET /api/tasks/today` `PATCH /api/tasks/:id` `POST /api/tasks/:id/notify`
- 前端 `useTasks` hook 轮询 + 乐观更新。

## 验证与回滚
- 新增 `pnpm test:tasks` 单元测试（Cron 逻辑 + API）。
- 回滚：停用 Cron + 清理 `tasks` 表即可。

## 风险与对策
| 风险 | 影响 | 对策 |
| --- | --- | --- |
| Cron 误写重复任务 | 列表爆炸 | 使用 `ON CONFLICT (source_id,type)` upsert |
| 通知 spam | 用户反感 | 默认手动触发，记录速率，附带撤销 |
| 权限越权 | 助教看到不该看的任务 | `tasks` 表添加 `visibility` 字段并跑 RLS |

## 里程碑
- M1：Schema + Cron 脚本 + API
- M2：Dashboard UI + 通知按钮
- Beta：Snooze/指派 & 日志界面
