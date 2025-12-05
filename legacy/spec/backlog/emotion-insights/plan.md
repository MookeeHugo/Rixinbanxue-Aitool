# 学习情绪追踪 - Plan

## 摘要
将作业/访谈数据输入 GPT-5.1 模板，产出情绪趋势 + 动机/痛点证据，并保存为老师可引用的建议。

## 实现策略
1. 表设计：`emotion_insights` + `interview_notes`（可选）。
2. 数据管道：
   - Teacher 在 UI 粘贴访谈逐字稿。
   - 后端汇总作业/错题统计，调用 GPT-5.1 模板（已在 [ai-prompt-templates.md](../../docs/operations/ai-prompt-templates.md) 中定义）。
   - 模型输出 JSON（情绪节点/动机/痛点/建议），写入 `emotion_insights`。
3. 前端：
   - `EmotionTrend` 图表（折线 + 标签）
   - 详情抽屉展示证据引用 + 话术
   - “引用到通知”按钮
4. 权限：只有对应老师/班主任可查看；导出/复制时附带时间戳。

## 架构 / 数据流
- `analytics` already fetch submissions → add aggregator for time-series
- API：`POST /api/emotion-insights/generate`, `GET /api/emotion-insights?classId=`
- Notification integration reuse existing messaging service

## 验证与回滚
- Add `tests/emotion-insights.spec.ts` covering prompt builder + parser
- Run `npm run build` + `pnpm lint`
- Rollback by disabling API + dropping table after backup

## 风险与对策
| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 模型幻觉 | 给出错误标签 | 强制引用 evidence，教师可手动编辑后再保存 |
| 数据缺失 | 无法生成趋势 | 允许 fallback（仅访谈、仅作业），界面展示“数据不足” |
| 隐私问题 | 访谈包含敏感内容 | 加密存储 / 标记敏感字段，访问需 audit |

## 里程碑
- M1：Schema + Prompt builder + API
- M2：前端可视化 + 引用功能
- Beta：权限/审计 + 批量导出
