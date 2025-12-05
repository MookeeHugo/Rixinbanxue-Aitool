# 本地开发启动指南

为了稳定调试题目管理与导出功能，推荐按照以下流程启动本地环境（Next.js + Supabase）。

## 前置要求

1. 已安装 **Node.js 18+** 与 npm。
2. 已安装 [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) 且本机 Docker 可用。
3. 运行 `npm install` 安装依赖。

## 快速启动

项目内置脚本会自动：

- 同步 `.env.local`，确保 `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` 指向本地 CLI 默认实例。
- 执行 `npx supabase start` 启动数据库与存储。
- 执行 `npm run dev` 启动 Next.js。

```bash
npm install
node ./scripts/start-local-dev.mjs
```

> 若只需手动执行，可先运行 `npx supabase start`，看到 “Started supabase local development setup.” 后，再执行 `npm run dev`。

## 常用指令

| 命令 | 说明 |
| --- | --- |
| `npm run db:start` | 快速启动/恢复 Supabase |
| `npm run db:status` | 检查本地容器状态 |
| `npm run db:reset` | 重新应用迁移与种子数据（开发环境谨慎使用） |
| `npm run dev` | 仅启动 Next.js（假设 Supabase 已运行） |

## 环境变量说明

- `.env.local.development` 提供了 CLI 默认的本地 Supabase URL 与 anon key。
- `scripts/start-local-dev.mjs` 会在 `.env.local` 不存在时复制模板，并在存在时强制覆盖 `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`。
- 若需要连接远程实例，可手动编辑 `.env.local` 并跳过该脚本。

## 故障排查

1. `npx supabase start` 卡住：检查 Docker 是否运行，或执行 `npx supabase stop && npx supabase start` 重启。
2. Next.js 无法连接数据库：确认 `.env.local` 中 URL/Key 是否仍是 `http://127.0.0.1:54321` 与本地 anon key。
3. 端口占用：将 `NEXT_PUBLIC_SUPABASE_URL`、`supabase/config.toml` 端口与 `npm run dev -- -p` 保持一致。

按照以上步骤即可实现 “supabase + next dev” 的一键本地体验，减少 E2E 依赖云端服务的概率。祝开发顺利！
