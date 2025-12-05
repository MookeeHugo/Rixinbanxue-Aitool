# AI 决策透明面板 - Plan

## 摘要
将 AI 决策过程落地为日志 + UI 面板，提供可解释性与回退机制。

## 实现策略
1. 新表 `decision_log`: `id, feature, entity_id, inputs, outputs, alternatives, confidence, user_id, created_at, status, feedback`。
2. AI worker/服务在完成组卷/批改时写 `decision_log`。
3. Web：
   - Hook `useDecisionLog(feature, entityId)` 获取日志
   - 组件 `DecisionInspector` 在 `papers`、`assignments` 详情页渲染
   - 支持“回退上一版本”（更新 `papers`/`submissions` 并记录 `feedback`）。
4. 监控：统计修订率、置信度低于阈值时警告。

## 架构 / 数据流
- 生成题目/评分后 → `decision_log`
- 页面 `GET /api/decision-log?feature=...` 取得数据
- 用户反馈/回退 -> `PATCH /api/decision-log/:id`

## 验证与回滚
- 自动化：`npm run build` + `pnpm lint` + 新增 `tests/decision-log.spec.ts`。
- 回滚：删除 UI 入口 + 清空 `decision_log` 表即可。

## 风险与对策
| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 日志过大 | 占用存储 | 仅保存最近 N 次，旧数据归档到 S3 |
| 信息泄露 | 暴露题目答案 | 输入/输出 anonymize，RLS 限制 owner |
| 回退与实际版本不一致 | 数据错乱 | 回退 API 强制校验版本号 |

## 里程碑
- M1：Schema + 写日志接口
- M2：前端面板 + 回退操作
- Beta：监控/统计面板
