# 报告索引（docs/reports）

> 更新于 2025-12-03。此目录收录各阶段的测试、进度、运营报告。各子目录说明如下：

| 子目录 | 内容 | 适用读者 |
| --- | --- | --- |
| `2025-11/` | Phase3 期间的每日简报、阶段验收、回归报告 | 核心研发、PM |
| `codex/` | CODEX 专项（问题分析、修复总结、测试数据） | 架构/治理、QA |
| `hotfix/` | 紧急修复说明，如 `BUGFIX_knowledge_points.md`、`SECURITY_FIX_P0.md` | DevOps、后端 |
| `ai/` | AI 题库分析、可行性报告等 | 决策层、PM |

### `2025-11/` 样例

- `INTEGRATION_VERIFICATION_REPORT.md`：联调阶段的端到端验收结果，是 Phase3 的验收基线。
- `PROJECT_ANALYSIS.md`、`plan-a-execution-report.md`、`plan-b-execution-report.md`：阶段策略执行与差异对比。
- `PERFORMANCE_OPTIMIZATION_2025-11-18.md`、`UPLOAD_PARSE_FIX_REPORT_20251125.md`：性能、解析缺陷的专项治理方案。
- `SPRINT_1-2_SUMMARY.md` / `SPRINT_3-4_SUMMARY.md`：冲刺目标、完成度、风险提示。
- 目录内另含数据库、CSP、显示等专项报告，可按标题关键词检索。

### `codex/` 样例

- `CODEX_ISSUES_RESOLUTION.md`、`FIX_SUMMARY.md`：列出阻塞项与对应修复策略。
- `CODEX_FIX_COMPLETE.md`：记录 CODEX 里程碑完成与验收情况。
- `codex体验分析报告.md`、`codex测试分析报告.md`、`QUICK_TEST_DATA.md`：体验、测试样本与关键数据。

### `hotfix/` 样例

- `BUGFIX_knowledge_points.md`：知识点同步 P0 故障的回滚、补丁与监控方案。
- `SECURITY_FIX_P0.md`：安全事件快速处置记录，含日志抓取与补丁核验流程。

> 新增 Hotfix 报告请采用 `YYYYMMDD_issue-summary.md` 命名，并在文末说明回归方式与告警策略。

### `ai/` 样例

- `README-AI题库分析报告.md`：AI 题库的策略复盘、体验评测与数据分析。

> AI 子目录主要面向 PM/管理层输出，如有长期维护的运行手册，可迁往 `operations/` 并同步更新此索引。

如需新增报告：
1. 根据类型选择子目录（或新建），命名遵循 `snake_case` 或 `kebab-case`。
2. 在文档头部标注日期、作者、适用范围。
3. 更新此 README 中的表格和示例，确保团队能快速定位。
4. 若是历史报告迁移，请同步 `docs/project-governance/file-archive-log.md`。
