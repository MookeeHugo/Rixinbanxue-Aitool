# 数据库本地环境搭建指南

> 适用范围：使用 Supabase 作为开发环境的同学，用于创建/配置新项目以及同步 `.env`。

## 1. 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并登录。
2. 点击 **New Project**，填写：
   - Name：`rixindemo`（或自定义）。
   - Database Password：设置 32+ 位强密码（后续 `config.toml`/CI 会使用）。
   - Region：就近区域（推荐 Singapore）。
3. 等待容器初始化完成。

## 2. 获取 API 密钥

项目面板 → **Settings > API**，复制：
- **Project URL**：`https://xxx.supabase.co`
- **anon/public key**：供前端/客户端使用
- **service_role key**：仅限服务器端脚本

## 3. 配置环境变量

在仓库根目录创建/更新 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

开发者首次拉取项目时，可执行：

```bash
cp .env.local.example .env.local
```

再替换为自己的密钥。

## 4. 执行数据库脚本

1. 在 Supabase Dashboard 打开 **SQL Editor**。
2. 新建 Query，将 `db/schema.sql` 全部复制进去。
3. 点击 **Run** 执行。成功后应能在 **Table Editor** 中看到 `profiles`、`classes`、`questions`、`papers`、`assignments`、`submissions` 等表。

## 5. 本地 CLI 工作流

项目已经内置 Supabase CLI 命令：

```bash
npm run db:start   # 启动本地容器
npm run db:stop    # 停止本地容器
npm run db:reset   # 重置数据库（运行 supabase/seed.sql）
npm run db:types   # 生成 TypeScript 类型
npm run db:diff    # 创建迁移草稿
npm run db:push    # 将本地迁移推送到 Supabase
```

如需手动编辑 `supabase/config.toml`，请记得把变更写入 PR 描述。

## 6. 常见问题

| 问题 | 处理建议 |
| --- | --- |
| `supabase start` 卡住 | 检查 Docker Desktop 是否运行，或执行 `docker system prune` 后重试。 |
| `.env.local` 泄露 | 立即在 Supabase 控制台重置 anon/service key，提交 PR 前确保 `.env.local` 已忽略。 |
| RLS 生效异常 | 查看 `db/migrations/*` 中的策略是否同步，必要时重新执行 `db:reset`。 |

> 如需导入测试数据，请参阅同目录下的 `seed-data-guide.md`。
