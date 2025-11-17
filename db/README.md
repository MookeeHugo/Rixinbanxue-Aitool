# 数据库设置指南

## 步骤 1: 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - Name: rixindemo (或其他名称)
   - Database Password: 设置一个强密码（请记住）
   - Region: 选择离你最近的区域（如 Singapore）

## 步骤 2: 获取 API 密钥

1. 在项目页面，点击左侧 "Settings" → "API"
2. 复制以下信息：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 步骤 3: 配置环境变量

1. 在项目根目录创建 `.env.local` 文件
2. 粘贴以下内容（替换为你的实际值）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 步骤 4: 执行数据库脚本

1. 在 Supabase 控制台，点击左侧 "SQL Editor"
2. 点击 "New Query"
3. 复制 `db/schema.sql` 的完整内容
4. 粘贴到编辑器中
5. 点击 "Run" 执行

## 验证

执行成功后，在左侧 "Table Editor" 中应该能看到以下 6 个表：

- ✅ profiles (用户表)
- ✅ classes (班级表)
- ✅ questions (题目表)
- ✅ papers (试卷表)
- ✅ assignments (作业表)
- ✅ submissions (学生提交表)

## 步骤 5: 导入测试数据（可选）

为了快速体验完整功能，可以导入测试数据：

### 5.1 注册测试账号

访问 http://localhost:3002/register 注册以下账号：

**教师账号**:
- 邮箱: `teacher@test.com`
- 密码: `123456`
- 姓名: `李老师`
- 角色: `教师`

**学生账号**:
- 邮箱: `student@test.com`
- 密码: `123456`
- 姓名: `张三`
- 角色: `学生`

### 5.2 获取用户UUID

在 Supabase SQL Editor 中执行 `db/get-user-ids.sql`，复制显示的 UUID。

### 5.3 导入数据

1. 打开 `db/seed-test-data.sql`
2. 替换文件开头的两个 UUID 为实际值
3. 在 Supabase SQL Editor 中执行整个脚本

### 5.4 测试数据内容

- ✅ 30 道题目（选择题、填空题、解答题）
- ✅ 2 个班级
- ✅ 2 个试卷
- ✅ 2 个作业
- ✅ 2 份学生提交（包含错题）

详细说明请查看：[SEED_DATA_GUIDE.md](SEED_DATA_GUIDE.md)

## 下一步

配置完成后，运行开发服务器：

```bash
npm run dev
```

访问 [http://localhost:3002](http://localhost:3002) 查看项目。

## 脚本说明

### 必需脚本
- **schema.sql**: 数据库表结构和 RLS 策略（必须执行）
- **reset.sql**: 清空所有表数据

### 辅助脚本
- **seed-test-data.sql**: 导入测试数据（30道题+班级+作业+提交）
- **get-user-ids.sql**: 查询用户 UUID
- **fix-rls.sql**: 修复 RLS 权限问题
- **cleanup-auth.sql**: 清理认证数据

### 使用建议

1. **首次安装**: 只需执行 `schema.sql`
2. **快速测试**: 注册账号后执行 `seed-test-data.sql`
3. **重置数据**: 执行 `reset.sql` 然后重新执行 `schema.sql`
4. **权限问题**: 如果遇到权限错误，执行 `fix-rls.sql`
