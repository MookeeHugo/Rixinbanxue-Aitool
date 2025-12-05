# Spec Kit 宪法（/speckit.constitution）

## 愿景与范围
- 项目：日新教学平台 MVP（Next.js 14 + TypeScript + Tailwind + Supabase + LiveKit/ZEGO）。
- 用户：中小型教培机构老师/学生，核心 KPI = 10 分钟组卷、批改提效 ≥50%、Beta 满意度 ≥4/5。
- AI/开发者在讨论任何需求前必须确认：是否符合上述用户价值和 KPI，若偏离需与 PM 讨论再行动。

## 安全原则
1. **禁止破坏性命令**：不可在生产数据库/存储执行 `rm -rf`, `drop table`, `truncate` 等操作；对 Supabase 仅通过迁移脚本执行 DDL。
2. **权限最小化**：本地 `.env.local` 仅存放 `NEXT_PUBLIC_SUPABASE_*` 与直播服务密钥，占位符需标记 `<TODO>`。
3. **日志与隐私**：不得在文档/代码中硬编码用户真实数据；调试输出必须移除或落到受控 logger。
4. **Webhook/Token**：与第三方的签名验证（LiveKit/ZEGO）属于强制项，任何无鉴权的 API 会被视为阻塞缺陷。

## 代码与架构规范
- 使用 TypeScript + App Router，组件遵循 `src/components` 下的 UI primitives；禁止向 `app` 目录写入无命名空间的 util。
- Supabase schema 改动需同步 `db/schema.sql`，并通过 `db/README.md` 指明迁移顺序。
- 直播模块默认通过 `lib/live/router.ts` 选择 provider，不允许在页面级直接访问 provider SDK。
- UI 文案统一 UTF-8 中文；所有文档（含 speckit）需保存为 UTF-8 无 BOM。

## 测试与质量门槛
1. `npm run build` 必须通过（包含 TS + ESLint 检查）。
2. 涉及业务流程的改动需要：
   - 至少一条单元/集成测试或 Playwright 流程；
   - Mock/fixtures 更新，确保演示数据可复现。
3. 当 Spec Kit 任务状态切换为 `review` 时，必须附带：
   - 构建输出（或截图/日志）
   - 关键回归清单（例：创建班级→发布作业→查看提交）。

## 交付流程与守门
- `/speckit.specify`、`/speckit.plan`、`/speckit.tasks` 必须串联执行；任何跳过计划直接编码的情况需在 `tasks.md` 记录例外理由。
- 每个任务包含 `Owner`、`Definition of Done`、`Verification`、`Links` 四段，未勾选前禁止合并。
- Git 采用“小步提交 + 描述性信息”策略，提交前通过 `npm run build` + `pnpm lint`；必要时附上 [codex测试分析报告.md](../docs/reports/codex/codex测试分析报告.md) 更新。

## 工具约束
- 首选 VS Code/Cursor + Continue；AI 调用脚本前需说明命令意图；执行失败时必须复述错误并提供替代方案。
- 直播相关操作必须通过 `useApiParam` 显式切换数据源，避免误导老师；相关 UI 需提示当前模式。
- 文档入口：
  - `/speckit.constitution` → 本文件
  - `/speckit.sop` → `spec/README.md`
  - `/speckit.checklist` → [`测试启动检查清单.md`](../docs/operations/测试启动检查清单.md)

遵守以上宪法是提交代码与调用 AI 协作工具的前提，若需例外，必须在对应 `tasks.md` 中记录并由 PM 签名确认。
