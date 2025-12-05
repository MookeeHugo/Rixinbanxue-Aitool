# 重置脚本操作指南（scripts/reset-and-restart）

> 本文为 Batch2 迁移后的统一版本，替代 `scripts/README.md` 中的说明。所有命令/示例均使用 UTF-8 编码，提交前请执行 `npm run lint:encoding` 确认无乱码。

## 脚本目的

当进行较大规模更新或本地环境失效时，可使用 `reset-and-restart` 自动完成：

1. 停止 Next.js / Supabase 服务。
2. 清理 `.next` 缓存与 Docker 资源。
3. 重置本地 Supabase（重新执行迁移、导入种子数据）。
4. 引导开发者手动启动 `npm run dev`。

## 使用方式

### Windows CMD
```bash
scripts\reset-and-restart.bat
```

### Git Bash / WSL / macOS
```bash
bash scripts/reset-and-restart.sh
```

## 脚本做了什么

1. **停止服务**
   - 结束所有 `node` 进程（Next.js dev server）。
   - `npx supabase stop` 停止本地数据库。
2. **清理缓存**
   - 删除 `.next` 目录。
   - 执行 `docker system prune -f` 清理镜像与缓存。
3. **重置数据库**
   - `npx supabase start` & `npx supabase db reset`。
   - 自动导入 `supabase/seed.sql`。
4. **提示启动**
   - 输出“请手动执行 `npm run dev`”的指引。

## 适用场景

- 页面/接口异常且无法定位缓存原因。
- 切换分支后需要重新同步数据库。
- 本地 Docker 资源占用过多，需重置。
- CI/脚本更新后，需要统一的本地状态。

## 注意事项

- **数据清空**：本地 Supabase 数据库会被重置，请事先备份需要保留的数据。
- **不会影响**：源代码、`node_modules`、Git 历史、线上数据库。
- **权限**：Windows 下若出现权限问题，请以管理员身份运行 CMD；Git Bash 需 `chmod +x scripts/reset-and-restart.sh`。

## 常见问题

| 场景 | 处理建议 |
| --- | --- |
| Docker 未运行 | 手动启动 Docker Desktop 再执行脚本。 |
| 端口仍被占用 | `netstat -ano | findstr :3002` → `taskkill /PID <pid> /F`。 |
| Supabase CLI 报错 | 升级 CLI：`npm install supabase --save-dev` 或重新运行 `npm run db:start`。 |
| 仍需人工操作 | 可参照脚本内输出的命令逐条执行，确保每一步成功。 |

## 手动恢复示例

```bash
taskkill /F /IM node.exe
npx supabase stop
rm -rf .next
docker system prune -f
npx supabase start
npx supabase db reset
npm run dev
```

## 关联脚本

- `scripts/start-local-dev.mjs`：一键启动 Supabase + Next.js。
- `scripts/dev-reset.mjs`：清理依赖并重新安装。

> 若有新的运行脚本，请在此文档补充条目，并更新 `docs/operations/README.md` 索引。
