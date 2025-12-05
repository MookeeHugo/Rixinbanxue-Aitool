# 项目现状分析(2025-12-03)

## 1. 仓库结构概览

| 区域 | 主要内容 | 问题/风险 |
| --- | --- | --- |
| `src/`, `components/`, `legacy/AI题库前端最新版/archived-components/` | Next.js 14 主应用、旧版 UI 组件封存、副本 | Legacy UI 现已集中到 `_archived-components`，按需挑选组件迁回 `src/`，避免双份维护。 |
| `docs/` 及根目录 Markdown | 既有 Phase3 文档、配色方案、旧计划书(大量放在仓库根部) | 顶层超过 40 份规划/方案文档,命名混乱(含空格/中文/阶段号),缺乏索引,难以判断是否仍然适用。 |
| `paddleocr-service/`, `scripts/`, `tmp/`, `logs/` | 后端流水线、运维脚本与调试日志 | 没有统一的运行手册,日志与基线结果散落 `tmp/`、`logs/metrics`、`logs/failures`,追踪失败任务需手动 grep。 |
| `supabase/`, `db/`, `legacy/db_archive/` | 迁移脚本与历史导出 | `legacy/db_archive` 已标注为备份,但仍需在 README 中解释与现有迁移的区别。 |
| `legacy/`(`SuperClaude_Framework/`, `claude-code-workflows/`, `superdesign/`, `rixinworksuperdesign/`, `AI题库前端最新版/`, `design-system/`, `spec/`, `shijuanceshi/`) | 早期调研与 PoC、离线数据集 | 位置已统一,但仍需在文档/脚本中逐步替换旧路径,并计划哪些内容可彻底删除。 |

## 2. 文档 vs 实际开发进度差异

- **QA Baseline 系统**:根目录多份"AI题库*"方案描述一个庞大 QA 控制台,但当前确认**不计划接入**;相关新建文件已被隔离在 `legacy/AI题库前端最新版/archived-components/admin/qa-baseline*`,仍在仓库中但未挂载路由。
- **Phase3 文档**:`docs/phase3-*` 记录的上线目标多已完成(部署、配色、LiveKit),但 README 未同步最新发布状态,导致新人误判为"仍在 Phase3"。
- **运行手册**:`docs/rixinmath-coarse-to-fine-interface.md` 包含最新流水线说明,此前散落在根目录的 `SUPABASE_SETUP_COMPLETE.md`、`LIVEKIT_SETUP.md` 等旧教程已迁入 `docs/technical/`,可作为 Legacy 资料查阅。
- **架构命名**:`日新平台_*` 系列文档描述的是上一版本(Monorepo + Legacy UI),与现在的 Next13/14 App Router 不一致,没有明确区分。

## 3. 发现的冗余/风险文件

| 文件/目录 | 问题 | 建议 |
| --- | --- | --- |
| 根目录下 10+ 份 `AI题库-*.md`、`日新平台_*.md` | 内容已在 11 月底被新的 Phase3 方案取代 | 归档到 `docs/archive/legacy-plans/`,保留查阅但不干扰主目录。 |
| `legacy/AI题库前端最新版/archived-components/` | 复制自旧仓库的 UI,部分文件与 `src/` 同名 | 2025-12-05 起整体移入 `_archived-components`，确认零引用后再按批删除或重构。 |
| `tmp/`、`logs/` | 包含大量一次性工具/日志(e.g. `tmp-requests-filatex-cn-*.json`) | 需分类:调试产物和自动化基线输出保留到 `tmp/baseline/`,其余归档或清理。 |
| `paddleocr-service/logs` & `uvicorn.log` | 没有 logrotate,体积持续增大 | 纳入运维计划,记录清理频率。 |

## 4. 目录合理性评估

1. **顶层空间**:当前有 40+ Markdown + 20+ 目录在根目录,阅读成本极高。`legacy/` 已承载 SuperClaude、superdesign、AI 旧前端、shijuanceshi 等备份,根目录结构得到简化,后续重点在于继续合并 Legacy 组件。
2. **文档分类**:`docs/` 下已有 `archive/`、`reports/`、`technical/` 等,但大量历史 PDF/Markdown 不在 `docs/`,需要统一移动。
3. **命名规范**:存在 `tailwind.config.cjs.backup`, `d?rixinworkRixindemo...` 等奇怪文件名,应在清理阶段处理。
4. **版本追踪**:缺乏面向 PM/AI 团队的状态页;流水线健康、基线快照仅散见于 CLI 输出。

## 5. 后续治理重点

1. **文档治理**:将所有计划书/报告迁入 `docs/`,并编写索引文件,区分"现行""归档"。
2. **目录收敛**:对 Legacy 代码/设计目录添加 README + `ARCHIVED` 标识,避免误用。
3. **运维追踪**:建立统一的项目状态追踪文档(版本、流水线健康、开放问题)。
4. **编码/乱码检查**:继续使用 `rg "\\uFFFD"` + `rg "????(U+FFFD)"` 例行巡检,并在文档中记录。

> 本分析将作为后续目录优化、文件迁移和文档规范的依据。
