# 项目目录与文档治理方案

## 1. 目标

1. 用最少的顶层目录表达“代码 / 数据 / 文档”三大领域。
2. 所有文档集中在 `docs/`，根目录只保留 README 与关键脚本。
3. 任何归档内容必须进入 `docs/archive`，并记录迁移日志。
4. 建立面向团队的文档分类、命名与版本化规范。

## 2. 推荐目录结构

```text
repo-root/
├─ src/                        # Next.js App Router 主代码
├─ components/                 # 共享 UI 库（计划逐步合并至 src/components）
├─ scripts/                    # Node/TS 运维脚本
├─ paddleocr-service/          # FastAPI + PaddleOCR 服务
├─ supabase/                   # 本地数据库栈与迁移
├─ docs/
│  ├─ project-governance/      # 本治理方案、状态追踪、规范
│  ├─ technical/               # 工程设计、接口说明
│  ├─ standards/               # UI/配色/体验规范
│  ├─ reports/                 # 阶段性测试/验收报告
│  ├─ archive/
│  │  ├─ legacy-plans/         # 旧路线图/计划书
│  │  └─ research/             # 参考资料、POC
│  └─ user-guide/              # 面向运营/教学的手册
├─ legacy/
│  ├─ SuperClaude_Framework/    # 多智能体实验仓库
│  ├─ claude-code-workflows/    # Claude 工作流示例
│  ├─ superdesign/              # VS Code 插件官方仓库副本
│  ├─ rixinworksuperdesign/     # superdesign 本地化迭代副本
│  ├─ AI题库前端最新版/         # Legacy UI（QA Baseline）备份
│  ├─ design-system/            # 旧版 UI token
│  ├─ spec/                     # 旧需求模板
│  ├─ shijuanceshi/             # 离线试卷数据集
│  └─ db_archive/               # SQL 备份
├─ tmp/                        # 短期输出（规定保留周期）
├─ logs/                       # 标准化日志（配合 logrotate）
└─ README.md / package.json / ...
```

> `legacy/` 目录已创建，用于集中存放仍需保留但不再维护的代码副本；迁入前一律先通过 `rg '目录名' -n` 确认无运行时代码引用。

## 3. 文档分类与命名规范

| 分类 | 目录 | 命名规则 | 示例 |
| --- | --- | --- | --- |
| 架构/治理 | `docs/project-governance/` | `*.md`，驼峰或中划线，后缀用日期 | `project-status-2025-12.md` |
| 技术方案 | `docs/technical/` | `topic-name-vX.md` | `gemini-pipeline-design-v2.md` |
| 阶段报告 | `docs/reports/` | `phaseN-<type>-report.md` | `phase3-e2e-test-report.md` |
| 归档资料 | `docs/archive/legacy-plans/` | 保留原名称，添加 README 说明来源/失效原因 | `AI题库-数据库设计与Migration方案.md` |
| 运营手册 | `docs/user-guide/` | `audience-scope.md` | `teacher-upload-guide.md` |

统一要求：

- 全部使用 UTF-8，无 BOM。
- 中文命名允许，但必须在索引文档中提供英文别名，方便搜索。
- 每份文档开头需要“最后更新日期 + 适用范围”。

## 4. 变更追踪机制

1. **文件迁移日志**：`docs/project-governance/file-archive-log.md` 记录每次移动/删除。
2. **项目状态追踪**：`docs/project-governance/project-status-tracker.md` 按周更新（版本、运行状态、阻塞项）。
3. **文档更新流程**：
   - 新文档 → 添加到 `documentation-handbook.md` 的索引表；
   - 任何归档 → 在 PR 模板中引用 `file-archive-log.md` 对应记录；
   - 重大计划变更 → 在 README 项目简介中同步摘要，并在 `project-status-tracker.md` 的“重大变更”段落留痕。

## 5. 迁移策略

| 阶段 | 工作 | 责任人 | 说明 |
| --- | --- | --- | --- |
| Phase A | 建立治理文档、归档旧计划 | 架构组 | 本次 PR 已完成示例。 |
| Phase B | 合并 legacy 组件/代码 | 前端组 | 将 `legacy/AI题库前端最新版` 中仍需的组件逐步迁回 `src/components`。 |
| Phase C | 清理临时文件/日志 | DevOps | 统一 `tmp/`、`logs/` 目录，制定保留策略。 |
| Phase D | 例行巡检 | PM/架构 | 每月审计一次 `docs/` 与根目录，确保不存在“流浪文档”。 |

## 6. 质量守则

- 任何新增目录必须在 `project-structure-plan.md` 中登记，避免重复。
- PR 如涉及文档新增/迁移需附带 `rg "\\uFFFD"` 结果，确认未写入乱码。
- 默认不在根目录新增 Markdown 文档，特殊情况需在状态追踪文档中说明。
