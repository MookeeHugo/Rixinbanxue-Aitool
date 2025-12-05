# Legacy 目录说明

> 更新于 2025-12-03。本目录存放已确认**不会在当前 Next.js / Supabase 运行链路中引用**的历史仓库或备份代码，统一迁出根目录，避免误用。后续若需要查阅，请直接在 `legacy/<目录名>` 下打开，严禁直接参与构建。

## 收录内容

| 子目录 | 现路径 | 用途 | 备注 |
| --- | --- | --- | --- |
| `SuperClaude_Framework/` | `legacy/SuperClaude_Framework` | 多智能体 / SuperClaude Framework 完整仓库 | 仅供研究或对照，迁移后保留所有文档与 `.git` 历史。 |
| `claude-code-workflows/` | `legacy/claude-code-workflows` | Claude Code 评审/安全/设计工作流示例 | 静态模板集合，未接入主站。 |
| `superdesign/` | `legacy/superdesign` | 官方 Superdesign VS Code 插件源码副本 | 包含独立 `.git`，请在独立沙箱中运行。 |
| `rixinworksuperdesign/` | `legacy/rixinworksuperdesign` | Superdesign 插件本地化迭代备份 | 与 `superdesign/` 结构一致，仅作归档。 |
| `AI题库前端最新版/` | `legacy/AI题库前端最新版` | 旧版题库前端 UI / QA Baseline 组件（`archived-components/` 为封存版本） | 需要组件时请复制到 `src/` 再按规范改造，如无引用则保持在 `_archived-components`。 |
| `design-system/` | `legacy/design-system` | 旧版 UI token/组件示例 | 若需引用，请手动复制到 `src/components` 并通过评审。 |
| `spec/` | `legacy/spec` | 需求模板与 backlog 备份 | 作为 PM/AI 参考，现网规划见 `docs/project-governance/`。 |
| `db_archive/` | `legacy/db_archive` | 2024-2025 的 SQL 快照 | 历史迁移备份，现网迁移由 `supabase/migrations` 维护。 |
| `shijuanceshi/` | `legacy/shijuanceshi` | 261 张离线试卷图像及 metadata | 脚本已更新为新路径，默认通过 `legacy/shijuanceshi` 加载。 |

## 使用守则

1. **只读为主**：不要在 `legacy/` 目录下直接开发或运行脚本，如需实验请复制到临时工作区。
2. **引用前确认**：若确实需要复用其中的脚本/组件，需通过评审后迁回 `src/` 或 `scripts/`，并更新 `docs/project-governance/file-archive-log.md`。
3. **检测配置**：TypeScript、Jest、ESLint 已排除 `legacy/**`，若新增工具链需同步忽略规则，避免无谓的 lint/编译失败。
4. **后续扩展**：其余 Legacy 目录（如 `AI题库前端最新版/`、`spec/` 等）在完成依赖梳理后，也将迁入此处；迁移前会先通过 `rg '目录名' -n` 找出引用并同步更新。

如在使用过程中发现仍有构建脚本或文档引用旧路径，请及时在 `docs/project-governance/project-structure-plan.md` 与 `file-archive-log.md` 中登记并修正。
