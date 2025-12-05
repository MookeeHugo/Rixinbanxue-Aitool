# Legacy 说明（shijuanceshi）

> 最后更新：2025-12-03

`shijuanceshi/` 存放的是 2024 年中考数学试卷图像及 `metadata.json`，用于早期解析/锚点算法的离线测试。现有流水线（`scripts/run-image-baseline.mjs` + Supabase 数据库）已经包含更新的数据集，**该目录不再参与生产或开发流程**。

使用须知：

1. 若需要这些图片进行离线实验，请复制到临时目录后再操作，避免误删原始样本；
2. 若计划清理或迁移，请在 `docs/project-governance/file-archive-log.md` 中登记，并确认没有脚本引用此路径；
3. 正式的基线样本请参阅 `tests/image-samples.json` 及 `tmp/baseline/`。
