# Operations / Prompt Index

> 最后更新：2025-12-03。此目录存放日常运营、测试、Prompt/SOP 相关文档，面向 PM、QA、运营及支持团队。所有文件使用 UTF-8 编码，提交前请运行 `rg "\\uFFFD" -n docs/operations`。

## 文档清单

| 文件 | 角色 | 用途 |
| --- | --- | --- |
| `ai-prompt-templates.md` | PM / AI | 汇总常用 Prompt 模板（M1-M3 阶段、通用模版等），供 Hugo/自动化脚本复用。 |
| `beta-feedback.md` | PM / QA | Beta 回访记录模板，附带标签和决策路径。 |
| `hugo-action-checklist.md` | PM / Ops | Hugo 模式执行清单（M1-M7），指向相关 Prompt 与数据看板。 |
| `data-driven-decisions.md` | PM / 运营 | 数据驱动决策表，列出触发条件与负责人。 |
| `TESTING-full.md` | QA / 开发 | 完整测试指南（7 个阶段），配合 `standards/TESTING.md` 使用。 |
| `测试启动检查清单.md` | QA / 开发 | 5 分钟启动验证，覆盖环境准备与 Smoke 流程。 |
| `scripts-runbook.md` | DevOps / QA | `scripts/reset-and-restart.*` 的自动化说明、注意事项与排障记录。 |
| `dataset-guide.md` | QA / 测试 | `tests/dataset` 命名规范、metadata 要求与回归基线，含外部数据集引用。 |

> 未来若新增运营类 SOP，请在此表补充条目，并确保互相引用使用相对路径（例如 `./ai-prompt-templates.md`）。

## 使用建议

1. 运营/QA 在执行 SOP 之前，先打开对应文档确认最新更新时间。
2. 若 SOP 涉及脚本或工具，请在文档中加上命令示例，保持与 `docs/technical/` 的部署手册一致。
3. 如果文档迁移到其他目录（如归档），请更新本 README 并在 `docs/project-governance/file-archive-log.md` 记录。
