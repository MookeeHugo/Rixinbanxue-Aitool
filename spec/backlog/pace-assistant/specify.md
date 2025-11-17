# 智能节奏助手 - Specify

## Meta
- **Slug**: pace-assistant
- **Owner**: Hugo / PM
- **Status**: designing
- **Last Update**: 2025-11-14

## 背景
- 在老师=PM 的模式下，需要同时跟进班级、作业、直播、家长沟通，多数提醒靠手写便签。
- 之前的“痛点→功能”分析指出“角色切换导致忘记发布作业/提醒家长”，需要可执行的日程助手。

## 用户痛点 / 动机
- 缺乏“今日必须完成/可顺延”的列表，导致漏掉关键节点。
- 无法将任务转给助教或发送提醒，需重复操作。

## 目标 & 成功标准
- 自动生成“今日节奏”任务列表，覆盖班级/作业/直播/家长通知。
- 支持一键发送通知或指派助教，提醒命中率 ≥90%。
- 允许 Snooze / 完成 / 升级（将任务升级到提醒层）。

## 需求描述
- Dashboard 新增“今日节奏”侧边组件，分为 Must / Should / Automations。
- 定时作业：Supabase Cron/Edge Function 将 assignments/直播/家长提交状态转为 `tasks`。
- 用户可设置提醒渠道（站内、微信、邮件），并查看历史操作。

## 约束与非目标
- 首版不做复杂 AI 排程，仅基于规则+ Cron。
- 不触达学生，只面向老师/助教。

## 依赖
- assignments、classes、live 模块的状态 API。
- 通知渠道（现有 Supabase functions / Vercel）

## 附件
- 参考：`日新教学平台MVP执行方案v2.2-关键修正.md` 痛点章节。
