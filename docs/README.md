# 文档导航（更新于 2025-12-03）

> 所有文档统一使用 UTF-8 编码；新增/修改后请执行 `rg "\\uFFFD" -n docs` 确认无乱码。

## 目录总览

| 目录 | 用途 | 代表文件 |
| --- | --- | --- |
| `project-governance/` | 项目治理、目录规范、状态追踪 | `project-status-tracker.md`, `project-structure-plan.md` |
| `technical/` | 架构/环境/部署方案 | `rixinmath-coarse-to-fine-interface.md`, `environment-variables.md`（待补充） |
| `operations/` | 日常运营/测试 SOP 与 Prompt 模板 | `ai-prompt-templates.md`, `beta-feedback.md`, `hugo-action-checklist.md`, `data-driven-decisions.md`, `测试启动检查清单.md` |
| `reports/` | 各阶段的测试/进度/验收报告 | `2025-11/INTEGRATION_VERIFICATION_REPORT.md`, `phase3-*` |
| `standards/` | UI、开发、测试规范 | `TESTING.md`, `CODING_STANDARDS.md`, `GAUTHMATH_DESIGN_SYSTEM.md` |
| `archive/` | 历史计划/研究资料/阶段记录 | `legacy-plans/*`, `research/*`, `2025-11/*` |
| `legacy/` | 迁出的 Legacy 代码仓库与备份 | `SuperClaude_Framework/`, `AI题库前端最新版/`, `superdesign/`, `spec/`, `db_archive/` |

## 常用入口

- **快速上手**：`technical/rixinmath-coarse-to-fine-interface.md`
- **部署/数据库**：`technical/DEPLOYMENT.md`、`technical/DATABASE_MANAGEMENT.md`
- **Prompt 与运营 SOP**：`operations/ai-prompt-templates.md`、`operations/hugo-action-checklist.md`
- **测试指南**：`standards/TESTING.md`、`operations/测试启动检查清单.md`
- **治理/现状**：`project-governance/project-status-tracker.md`

## 归档说明

- 根目录的所有 Markdown 正在逐步迁入上述目录；如需查看旧文档，请先在 `docs/archive/legacy-plans/` 或 `docs/archive/research/` 寻找。
- 若发现文档仍在根目录，请参考 `project-structure-plan.md` 中的分类规则，并在迁移后更新 `docs/project-governance/file-archive-log.md`。

## 贡献指引

1. 新增文档 → 根据用途选择子目录，并在此 README 的表格中补充说明。
2. 迁移/删除文档 → 先 `rg '文件名'` 确认引用，再更新对应链接，最后记录到 `file-archive-log.md`。
3. 更新完文档需运行 `npm run build`（确保引用路径无误）并执行乱码巡检。
