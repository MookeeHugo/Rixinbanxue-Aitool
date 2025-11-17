# Spec Kit 指南

通过 Spec Kit，可以用统一的 `/speckit.*` 指令把需求、方案与开发任务结构化，并与《Vibecoding 工作流标准》保持一致。本目录提供了在本项目中落地 Spec Kit 的全部材料。

## 文件映射

| Slash 指令 | 对应文件 | 作用 |
| --- | --- | --- |
| `/speckit.constitution` | `spec/constitution.md` | 项目“宪法”，声明安全、编码、测试等强制要求 |
| `/speckit.specify` | `spec/templates/specify.md` | PM 填写需求动机与上下文的模板 |
| `/speckit.plan` | `spec/templates/plan.md` | AI/技术负责人在开发前给出的方案模板 |
| `/speckit.tasks` | `spec/templates/tasks.md` | 将方案拆解为可执行任务的模板 |

> Continue/Cursor 中可把上表配置成 snippets，之后直接输入 `/speckit.*` 就能快速拉起对应文档。

## 使用流程

1. **阅读宪法**：每次开启 Session 先 `/speckit.constitution`，确保 AI/人类都在相同约束下行动。
2. **Specify**：PM 根据模板补充背景、目标、动机、Success Metrics，并保存为 `spec/backlog/<slug>/specify.md`。
3. **Plan**：AI 在同一目录创建 `plan.md`，描述实现策略、数据流、API 以及风险对策。
4. **Tasks**：AI 把 plan 拆成 checklist（任务 owner、验证方式），推动执行；完成后可在此更新状态。

## Backlog 约定

- `spec/backlog/<slug>`：`slug` 由日期 + 简述组成，例如 `guardian-report`。
- 目录至少包含 `specify.md`、`plan.md`、`tasks.md` 三个文件，可额外加入设计稿、API schema 等附件。
- 状态字段约定：`todo` / `designing` / `ready` / `doing` / `review` / `done`。PM 评审通过后再切换到 `ready` 或 `done`。

## 当前条目

| Slug | 主题 | 说明 |
| --- | --- | --- |
| `guardian-report` | 家长汇报模式 | 满足“成果证明”痛点，导出可分享的汇报链接 |
| `pace-assistant` | 智能节奏助手 | 把教学/运营待办自动拆为“今日节奏” |
| `ai-transparency-panel` | AI 决策透明面板 | 提升智能组卷/批改的可解释与信任 |
| `emotion-insights` | 学习情绪追踪 | 结合数据 + 访谈，生成动力标签与共情建议 |

当新增需求时，复制模板创建新的 `slug` 目录，并在 README 的“当前条目”补充索引即可。
