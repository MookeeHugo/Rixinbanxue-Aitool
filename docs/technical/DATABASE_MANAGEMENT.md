# 数据库管理指南

本文档说明如何使用本地 Supabase 容器作为开发/预发环境，管理数据库迁移和部署。

---

## 📋 目录

1. [环境配置](#环境配置)
2. [本地开发流程](#本地开发流程)
3. [数据库迁移管理](#数据库迁移管理)
4. [线上部署流程](#线上部署流程)
5. [常用命令参考](#常用命令参考)
6. [故障排查](#故障排查)

---

## 环境配置

### 前置要求

- **Node.js**: v18+ 或 v20+
- **Docker Desktop**: 用于运行本地 Supabase 容器
- **npx**: 用于运行 Supabase CLI（已包含在 npm 中）

### 目录结构

```
项目根目录/
├── supabase/
│   ├── config.toml           # Supabase 配置文件
│   ├── seed.sql              # 种子数据（用于 db:reset）
│   └── migrations/           # 数据库迁移文件
│       ├── 20241114000001_initial_schema.sql
│       ├── 20241114000002_add_knowledge_points.sql
│       └── 20241114000003_add_live_sessions.sql
├── .env.local.development    # 本地开发环境变量
├── .env.local                # 当前使用的环境变量
└── .env.production.backup    # 线上环境备份
```

### 环境变量配置

#### 本地开发环境

复制本地开发配置：

```bash
cp .env.local.development .env.local
```

**.env.local** 内容（本地开发）：

```env
# 本地 Supabase（Docker 容器）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NODE_ENV=development
```

#### 线上生产环境

使用线上 Supabase 时，恢复生产环境配置：

```bash
cp .env.production.backup .env.local
```

---

## 本地开发流程

### 1. 启动本地 Supabase

首次启动（会自动拉取 Docker 镜像并初始化）：

```bash
npm run db:start
```

**输出示例**：
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要端口**：
- **54321**: API Server（对应 NEXT_PUBLIC_SUPABASE_URL）
- **54322**: PostgreSQL Database
- **54323**: Supabase Studio（Web 管理界面）
- **54324**: Inbucket（邮件测试服务器）

### 2. 检查运行状态

```bash
npm run db:status
```

### 3. 打开 Supabase Studio

在浏览器访问：[http://127.0.0.1:54323](http://127.0.0.1:54323)

可以在这里：
- 查看数据库表结构
- 执行 SQL 查询
- 查看实时日志
- 管理 RLS 策略

### 4. 启动 Next.js 应用

```bash
npm run dev
```

现在应用会连接到本地 Supabase 容器，所有数据读写都在本地进行，不会影响线上环境。

### 5. 停止本地 Supabase

```bash
npm run db:stop
```

---

## 数据库迁移管理

### 迁移文件命名规范

格式：`<timestamp>_<description>.sql`

示例：
- `20241114000001_initial_schema.sql`
- `20241114000002_add_knowledge_points.sql`
- `20241114120530_add_user_avatar_column.sql`

### 创建新迁移

#### 方法 1：自动生成（推荐）

在 Supabase Studio 中直接修改数据库，然后生成迁移文件：

```bash
npm run db:diff add_new_feature
```

Supabase 会自动对比本地数据库和迁移文件，生成差异 SQL。

#### 方法 2：手动创建

创建新迁移文件：

```bash
npm run db:migration add_new_feature
```

这会在 `supabase/migrations/` 目录创建一个新文件，手动编写 SQL：

```sql
-- 新功能：添加用户头像字段
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON profiles(avatar_url);
```

### 应用迁移到本地数据库

```bash
npm run db:push
```

此命令会：
1. 读取 `supabase/migrations/` 目录中的所有迁移文件
2. 按时间顺序应用到本地 PostgreSQL
3. 记录已应用的迁移（防止重复执行）

### 重置本地数据库

如果需要完全重置数据库（清空所有数据并重新应用迁移 + 种子数据）：

```bash
npm run db:reset
```

**警告**：此操作会删除本地所有数据！

执行流程：
1. 删除所有表
2. 按顺序应用 `migrations/*.sql`
3. 应用种子数据 `seed.sql`

---

## 线上部署流程

### 部署前检查清单

- [ ] 所有迁移文件已在本地测试通过
- [ ] 已执行 `npm run build` 确保应用可以构建
- [ ] 已备份线上数据库（Supabase Dashboard → Database → Backups）
- [ ] 已更新 `.env.local` 为线上配置

### 切换到线上环境

```bash
# 备份当前本地配置
cp .env.local .env.local.backup

# 恢复线上配置
cp .env.production.backup .env.local
```

### 方式 1：通过 Supabase Dashboard（推荐用于小规模迁移）

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 → **SQL Editor**
3. 复制迁移文件内容并执行

### 方式 2：通过 CLI 推送（推荐用于批量迁移）

**前提**：需要先链接到线上项目

```bash
# 链接到线上 Supabase 项目（仅需执行一次）
npx supabase link --project-ref YOUR_PROJECT_REF

# 推送本地迁移到线上
npx supabase db push --db-url YOUR_PROD_DB_URL
```

**获取 DB URL**：

Supabase Dashboard → Project Settings → Database → Connection string

格式：
```
postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres
```

### 方式 3：通过 CI/CD（推荐用于生产环境）

在 GitHub Actions 或其他 CI 中添加部署步骤：

```yaml
- name: Deploy Database Migrations
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
  run: |
    npx supabase link --project-ref $PROJECT_ID
    npx supabase db push
```

### 验证部署结果

部署后验证：

1. 检查表结构是否正确
2. 检查索引是否创建成功
3. 检查 RLS 策略是否生效
4. 运行应用并测试关键功能

---

## 常用命令参考

### 数据库管理

| 命令 | 说明 |
|------|------|
| `npm run db:start` | 启动本地 Supabase 容器 |
| `npm run db:stop` | 停止本地 Supabase 容器 |
| `npm run db:status` | 查看容器状态和访问地址 |
| `npm run db:reset` | 重置数据库（应用所有迁移 + 种子数据） |
| `npm run db:push` | 将迁移推送到本地/远程数据库 |
| `npm run db:pull` | 从远程数据库拉取 schema |
| `npm run db:diff` | 生成数据库差异迁移文件 |
| `npm run db:migration` | 创建新迁移文件 |
| `npm run db:studio` | 打开 Supabase Studio（Web UI） |
| `npm run db:types` | 生成 TypeScript 类型定义 |

### 应用开发

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Next.js 开发服务器（端口 3002） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |

### 完整开发流程示例

```bash
# 1. 启动本地 Supabase
npm run db:start

# 2. 重置数据库（初次使用或需要刷新测试数据）
npm run db:reset

# 3. 启动开发服务器
npm run dev

# 4. 开发完成后，创建新迁移
npm run db:migration add_new_feature

# 5. 编辑迁移文件，然后应用
npm run db:push

# 6. 完成开发，停止 Supabase
npm run db:stop
```

---

## 故障排查

### 问题 1：端口被占用

**错误**：`Error: Port 54321 is already in use`

**解决方案**：
```bash
# 停止所有 Supabase 容器
npm run db:stop

# 如果还不行，手动停止 Docker 容器
docker stop $(docker ps -q --filter name=supabase)

# 重新启动
npm run db:start
```

### 问题 2：Docker 未启动

**错误**：`Cannot connect to the Docker daemon`

**解决方案**：
1. 打开 Docker Desktop
2. 等待 Docker 完全启动
3. 重新运行 `npm run db:start`

### 问题 3：迁移失败

**错误**：`Migration 20241114000001_initial_schema.sql failed`

**解决方案**：
```bash
# 查看详细错误日志
npx supabase db push --debug

# 检查 SQL 语法是否正确
# 修复迁移文件后，重置数据库
npm run db:reset
```

### 问题 4：种子数据插入失败

**错误**：`duplicate key value violates unique constraint`

**解决方案**：

编辑 `supabase/seed.sql`，在 INSERT 语句中使用：

```sql
INSERT INTO profiles (id, email, name, role) VALUES
  (...)
ON CONFLICT (id) DO NOTHING;  -- 防止重复插入
```

或在 `npm run db:reset` 前，确保已完全清空旧数据。

### 问题 5：本地和线上数据不一致

**解决方案**：

从线上拉取最新 schema：

```bash
# 链接到线上项目
npx supabase link --project-ref YOUR_PROJECT_REF

# 拉取线上 schema
npm run db:pull

# 这会更新 supabase/migrations/ 目录
```

### 问题 6：无法访问 Supabase Studio

**解决方案**：

确认端口 54323 未被占用：

```bash
# Windows
netstat -ano | findstr :54323

# Mac/Linux
lsof -i :54323

# 如果被占用，在 supabase/config.toml 中修改端口
[studio]
port = 54325  # 使用其他端口
```

---

## 最佳实践

### 1. 迁移文件规范

- ✅ 每个迁移文件只做一件事（如添加表、修改列、创建索引）
- ✅ 使用 `IF NOT EXISTS` 防止重复执行错误
- ✅ 添加清晰的注释说明迁移目的
- ❌ 不要在迁移中插入业务数据（应放在 seed.sql）
- ❌ 不要在迁移中使用 `DROP TABLE`（除非确认不需要该表）

### 2. 环境隔离

- ✅ 本地开发使用 `.env.local.development`
- ✅ 线上部署使用 `.env.production.backup`
- ✅ 将敏感信息加入 `.gitignore`
- ❌ 不要将真实的 Supabase 密钥提交到 Git

### 3. 数据备份

- ✅ 每次线上迁移前，先在 Supabase Dashboard 创建备份
- ✅ 定期导出重要数据（Supabase Dashboard → Database → Export）
- ✅ 将迁移文件纳入版本控制（Git）

### 4. 团队协作

- ✅ 所有成员使用相同的迁移文件
- ✅ Pull 代码后立即执行 `npm run db:push`
- ✅ 创建新迁移后及时推送到 Git
- ❌ 不要直接在 Supabase Studio 修改生产数据库结构

---

## 进阶功能

### 生成 TypeScript 类型

从数据库 schema 自动生成 TypeScript 类型定义：

```bash
npm run db:types
```

这会生成 `src/lib/database.types.ts` 文件，可以在代码中使用：

```typescript
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
```

### 数据库分支管理

Supabase 支持类似 Git 的分支功能：

```bash
# 创建新分支用于功能开发
npx supabase branches create feature-branch

# 切换分支
npx supabase branches switch feature-branch

# 合并分支
npx supabase branches merge feature-branch main
```

---

## 相关资源

- [Supabase CLI 官方文档](https://supabase.com/docs/guides/cli)
- [Supabase Migrations 指南](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [项目 README](./README.md)
- [快速开始指南](./QUICK_START.md)

---

**最后更新**: 2024-11-14
**维护者**: Claude Code + 开发团队
