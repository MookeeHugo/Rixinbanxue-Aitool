# Legacy 说明（db_archive）

> 最后更新：2025-12-03

此目录保存 2024 年版本的 SQL 脚本（schema.sql、seed-test-data.sql 等），用于备份旧的 Supabase 结构。当前项目的真实迁移脚本位于 `supabase/migrations/`，并通过 `npx supabase db push` 管理。

使用建议：

1. 不要直接运行这些脚本以免与现有 schema 冲突，如需参考，请手动打开查阅；
2. 若需要重新导入历史数据，请先在独立数据库环境中验证；
3. 如果未来不再需要，可将整个目录迁移到 `legacy/` 或压缩存档，操作前务必在 `docs/project-governance/file-archive-log.md` 中登记。
