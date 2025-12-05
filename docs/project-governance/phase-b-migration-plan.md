# 阶段 B 文档迁移规划（分批执行）

## 目标与原则

1. **范围**：清理仍散落在 `docs/` 与 `legacy/` 以外的 Markdown（含 `scripts/`、`db/`、`src/`、`paddleocr-service/` 等）。  
2. **动作**：将可复用的内容迁入 `docs/technical`、`docs/operations`、`docs/archive` 等正式目录；重复或过期内容并入既有文档，再在 `file-archive-log.md`登记。  
3. **验证**：每一批迁移都执行 `rg '文件名' -n` 校验引用，随后运行 `npm run lint`、`npm run build` 与 `npm run lint:encoding`，最后手动预览新位置的文档确认 UTF-8 正常。

## 现存候选清单（2025-12-04）

| 分类 | 现位置 | 建议归档位置 | 备注 |
| --- | --- | --- | --- |
| PR 模板 | `PULL_REQUEST.md` | 与 `docs/pull-request-template.md` 对齐，最终保留 `docs/project-governance/pull-request-template.md` 单一入口 | 迁移前需比对新版模板差异，更新 `.github/PULL_REQUEST_TEMPLATE` 链接。 |
| 项目概览 | `README.md` | 保留根目录版本，同时在 `docs/README.md` 同步章节；阶段 B 只需补充“文档索引”跳转，避免重复维护 | 无需移动，但需在迁移计划中记录其与 docs 版本的同步关系。 |
| 服务说明 | `paddleocr-service/README.md` | `docs/technical/paddleocr-service.md`（新建） | 包含部署/调试步骤，迁移后更新 `docs/technical/README.md` 索引。 |
| 数据库文档 | `db/README.md`、`db/SEED_DATA_GUIDE.md` | 整合入 `docs/technical/DATABASE_MANAGEMENT.md` 或子目录 `docs/technical/database/` | 同步 Supabase CLI 命令、Seed 指南并删除原文件。 |
| 运行脚本 | `scripts/README.md` | `docs/operations/scripts-runbook.md`（新建） | 内容描述 reset 脚本，迁移后同时修复文档中乱码。 |
| 测试数据 | `tests/dataset/README.md` | `docs/operations/data-assets.md`（新建）或并入 `docs/operations/README.md` | 说明数据集结构、同步策略。 |
| 设计系统 | `src/styles/design-system.md` | 并入 `docs/standards/GAUTHMATH_DESIGN_SYSTEM.md` 或在 `docs/standards/design-system-notes.md` 统一维护 | 现文档位于源码目录，迁移后更新引用。 |
| 题库模块 | `src/lib/ai-question-bank/README.md` | `docs/ai-question-bank/README.md` 附录 | 携带 API/流程说明，迁移时注意更新 package 引用。 |

> 注：`legacy/*` 下的 README 已在阶段 A 处理，此处仅跟踪非 `docs/` 与非 `legacy/` 的 Markdown。

## 批次划分与责任

| 批次 | 内容 | 负责人 | 预计输出 |
| --- | --- | --- | --- |
| Batch 1（数据库 & 服务） | `paddleocr-service/README.md`、`db/README.md`、`db/SEED_DATA_GUIDE.md` | DevOps（截止 2025-12-05 AM） | 新建 `docs/technical/paddleocr-service.md`；更新 `docs/technical/DATABASE_MANAGEMENT.md`；`file-archive-log.md` 记录迁移 |
| Batch 2（脚本 & 数据资产） | `scripts/README.md`、`tests/dataset/README.md` | QA/测试（截止 2025-12-05 PM） | `docs/operations/scripts-runbook.md` 与 `docs/operations/data-assets.md`；脚本文档修复 UTF-8 乱码 |
| Batch 3（模块文档） | `src/styles/design-system.md`、`src/lib/ai-question-bank/README.md` | 前端（截止 2025-12-06） | 将内容拆分到 `docs/standards/` 与 `docs/ai-question-bank/`；同步目录索引 |
| Batch 4（模板类） | `PULL_REQUEST.md` + 根 README 索引 | PM/架构（截止 2025-12-07） | 保留根 README 并在 `docs/README.md` 添?如何贡献?章节；集中 PR 模板至 `docs/project-governance/pull-request-template.md` 并更新 GitHub 配置 |

## 单批执行步骤

1. `rg '文件名' -n` & `rg '原标题' -n`：确认引用位置，列出需要更新的超链接或脚本路径。  
2. 复制到目标目录 → 修订 Frontmatter/标题 → 更新引用（包含 `README.md`、`docs/README.md`、脚本注释等）。  
3. 删除原文件（若需保留别名，则在 README 中添加“原路径已迁移至…”说明）。  
4. 更新 `docs/project-governance/file-archive-log.md` 记录本次移动，注明原因与新路径。  
5. 运行 `npm run lint && npm run build && npm run lint:encoding`，确保：
   - ESLint/TypeScript 无误；
   - 构建不受路径变更影响；
   - 文档 UTF-8 通过自动化巡检。  
6. 手动预览新文档（VSCode/浏览器）确认无 `U+FFFD` 替换字符、排版正常，并在 PR 描述中附带“UTF-8 巡检零结果”说明。

## 风险与缓解

- **引用遗漏**：部分 README 以相对路径互相链接，迁移前必须以 `rg '文件名' -n` 配合 IDE 全局搜索，必要时添加重定向章节。  
- **重复内容**：数据库、PR 模板等主题在 `docs/` 中已有文件，需采用“合并差异 + 删除旧文件”的策略，避免多处维护。  
- **乱码遗留**：老文件多为 GBK→UTF-8 转码残留，迁移时顺带修复，并用 `npm run lint:encoding` 佐证。

## 里程碑

1. **2025-12-05 AM**：完成 Batch 1，更新技术文档索引并通过 lint/build。  
2. **2025-12-05 PM**：完成 Batch 2，脚本/数据集文档统一进入 `docs/operations/`。  
3. **2025-12-06**：完成 Batch 3（配合前端目录），并在 `docs/standards` / `docs/ai-question-bank` 写清引用。  
4. **2025-12-07**：完成 Batch 4，GitHub PR 模板与 README 索引统一；发布阶段 B 总结。

> 所有批次完成后，再次在 `project-status-tracker.md` 的“重大变更”或“基线与监控”中记录“阶段 B 完成 + UTF-8 巡检零结果”。
