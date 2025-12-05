# Supabase 本地开发环境 - 快速入门

本文档提供快速设置和使用本地 Supabase 容器的步骤。

---

## ✅ 已完成的配置

### 1. 项目结构

```
✓ supabase/
  ✓ config.toml              # Supabase 配置
  ✓ seed.sql                 # 测试数据种子
  ✓ migrations/              # 数据库迁移
    ✓ 20241114000001_initial_schema.sql
    ✓ 20241114000002_add_knowledge_points.sql
    ✓ 20241114000003_add_live_sessions.sql
✓ .env.local.development     # 本地环境变量模板
✓ .env.production.backup     # 线上环境备份
✓ .gitignore                 # Git 忽略规则（已添加敏感文件）
✓ package.json               # 已添加 db:* 脚本
```

### 2. 可用命令

| 命令 | 功能 |
|------|------|
| `npm run db:start` | 启动本地 Supabase（Docker） |
| `npm run db:stop` | 停止本地 Supabase |
| `npm run db:status` | 查看服务状态 |
| `npm run db:reset` | 重置数据库（应用迁移+种子） |
| `npm run db:push` | 推送迁移到数据库 |
| `npm run db:migration <name>` | 创建新迁移 |
| `npm run db:studio` | 打开 Web 管理界面 |
| `npm run db:types` | 生成 TypeScript 类型 |

---

## 🚀 首次使用（5 分钟设置）

### Step 1: 确保 Docker 运行

打开 **Docker Desktop** 并等待启动完成。

验证 Docker 是否运行：

```bash
docker --version
docker ps
```

### Step 2: 启动本地 Supabase

```bash
npm run db:start
```

**首次启动**会下载 Docker 镜像（约 1-2 分钟），输出类似：

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
```

**记住这些端口**：
- **54321**: API（对应前端请求）
- **54322**: PostgreSQL 数据库
- **54323**: Supabase Studio（Web 管理界面）

### Step 3: 配置环境变量

**Option A: 本地开发**（推荐）

```bash
cp .env.local.development .env.local
```

**Option B: 使用线上 Supabase**

```bash
cp .env.production.backup .env.local
```

### Step 4: 初始化数据库

```bash
npm run db:reset
```

此命令会：
1. 创建所有表（profiles, questions, papers, assignments, submissions...）
2. 插入测试数据（15 道题目、1 个班级、1 个试卷）

### Step 5: 启动应用

```bash
npm run dev
```

访问：[http://localhost:3002](http://localhost:3002)

---

## 📖 日常开发流程

### 场景 1：开始一天的工作

```bash
# 1. 启动 Supabase
npm run db:start

# 2. 启动应用
npm run dev
```

### 场景 2：需要修改数据库结构

**方式 A：在 Studio 中直接修改（推荐）**

```bash
# 1. 打开 Supabase Studio
npm run db:studio
# 访问 http://127.0.0.1:54323

# 2. 在 Table Editor 或 SQL Editor 中修改表结构

# 3. 生成迁移文件
npm run db:diff add_new_column

# 4. 查看并确认生成的迁移文件
# supabase/migrations/YYYYMMDDHHMMSS_add_new_column.sql
```

**方式 B：手动编写迁移**

```bash
# 1. 创建迁移文件
npm run db:migration add_avatar_column

# 2. 编辑文件 supabase/migrations/xxx_add_avatar_column.sql
# ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

# 3. 应用迁移
npm run db:push
```

### 场景 3：需要刷新测试数据

```bash
# 完全重置数据库（删除所有数据，重新应用迁移和种子）
npm run db:reset
```

### 场景 4：结束一天的工作

```bash
# 停止 Supabase 容器（释放资源）
npm run db:stop
```

**注意**：停止后数据不会丢失，下次启动会恢复。

---

## 🎯 常见任务示例

### 添加新表

1. 创建迁移：

```bash
npm run db:migration add_courses_table
```

2. 编辑 `supabase/migrations/xxx_add_courses_table.sql`：

```sql
-- 课程表
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Teachers can manage own courses"
  ON courses FOR ALL
  USING (teacher_id = auth.uid());
```

3. 应用迁移：

```bash
npm run db:push
```

4. 生成 TypeScript 类型：

```bash
npm run db:types
```

### 修改现有表

1. 创建迁移：

```bash
npm run db:migration add_profile_avatar
```

2. 编辑迁移文件：

```sql
-- 添加头像字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON profiles(avatar_url);
```

3. 应用迁移：

```bash
npm run db:push
```

### 查看当前数据库状态

```bash
# 查看服务状态
npm run db:status

# 或打开 Supabase Studio
npm run db:studio
```

---

## 🔄 本地 ↔ 线上同步

### 从线上拉取 Schema（首次团队协作）

如果其他人已经在线上创建了表结构：

```bash
# 1. 链接到线上项目（仅需一次）
npx supabase link --project-ref YOUR_PROJECT_REF

# 2. 拉取线上 schema
npm run db:pull

# 3. 查看生成的迁移文件
# supabase/migrations/YYYYMMDDHHMMSS_remote_schema.sql

# 4. 应用到本地
npm run db:reset
```

### 推送到线上（部署）

**方式 1：通过 Dashboard（简单）**

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. SQL Editor → 粘贴迁移文件内容 → Run

**方式 2：通过 CLI（批量）**

```bash
# 1. 切换到线上环境变量
cp .env.production.backup .env.local

# 2. 链接项目
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. 推送迁移
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

---

## 🐛 故障排查

### 问题：`npm run db:start` 失败

**可能原因 1：Docker 未启动**

解决：打开 Docker Desktop，等待启动完成

**可能原因 2：端口被占用**

```bash
# 停止所有 Supabase 容器
npm run db:stop

# 或手动停止
docker stop $(docker ps -q --filter name=supabase)
```

### 问题：数据库连接失败

检查 `.env.local` 是否正确：

```env
# 本地开发应该是：
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321

# 而不是：
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

### 问题：迁移应用失败

```bash
# 查看详细错误
npx supabase db push --debug

# 完全重置（会删除所有数据！）
npm run db:reset
```

### 问题：种子数据重复插入

编辑 `supabase/seed.sql`，在 INSERT 语句中添加：

```sql
INSERT INTO profiles (id, email, name, role) VALUES (...)
ON CONFLICT (id) DO NOTHING;  -- 避免重复
```

---

## 📚 相关文档

- **详细指南**: [DATABASE_MANAGEMENT.md](./DATABASE_MANAGEMENT.md)
- **Supabase 官方文档**: https://supabase.com/docs/guides/cli/local-development
- **项目 README**: [README.md](./README.md)

---

## ✅ 验证清单

设置完成后，确认以下各项：

- [ ] `npm run db:start` 成功启动容器
- [ ] 访问 http://127.0.0.1:54323 可以打开 Supabase Studio
- [ ] `.env.local` 配置正确（本地使用 127.0.0.1:54321）
- [ ] `npm run db:reset` 成功初始化数据库
- [ ] `npm run dev` 启动应用，可以正常访问
- [ ] 注册测试账号可以成功（teacher@test.com / student@test.com）
- [ ] 数据库中可以看到测试题目和班级

---

## 🎉 快速测试流程

```bash
# 1. 启动服务
npm run db:start
npm run dev

# 2. 浏览器访问
# http://localhost:3002

# 3. 注册测试账号
# 教师: teacher@test.com / password
# 学生: student@test.com / password

# 4. 查看数据库
npm run db:studio
# http://127.0.0.1:54323

# 5. 结束开发
npm run db:stop
```

---

**设置完成！** 🎊

现在你拥有一个完整的本地 Supabase 开发环境，所有数据操作都在本地容器中进行，不会影响线上数据。

**遇到问题？** 查看 [DATABASE_MANAGEMENT.md](./DATABASE_MANAGEMENT.md) 获取详细故障排查指南。
