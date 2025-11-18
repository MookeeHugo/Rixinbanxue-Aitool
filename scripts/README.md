# 脚本说明 / Scripts Documentation

## 一键恢复脚本 / Reset and Restart Script

当项目进行大更新后，可能需要清理缓存并重启所有服务。这个脚本会自动完成所有必要的步骤。

### 使用方法 / Usage

#### Windows CMD
```bash
scripts\reset-and-restart.bat
```

#### Git Bash / WSL
```bash
bash scripts/reset-and-restart.sh
```

### 脚本功能 / What it does

1. **停止所有服务** - Stop all services
   - 停止 Next.js 开发服务器 (Node.js processes)
   - 停止 Supabase 本地数据库

2. **清理缓存** - Clear caches
   - 删除 `.next` 目录 (Next.js build cache)
   - 清理 Docker 资源

3. **重置数据库** - Reset database
   - 重新启动 Supabase
   - 执行 `db reset` 应用所有迁移
   - 加载种子数据

4. **重启服务** - Restart services
   - 提示手动启动 Next.js 开发服务器

### 何时使用 / When to use

- ✅ 页面无法正常显示
- ✅ 数据库迁移后需要重置
- ✅ 切换分支后需要同步数据库
- ✅ 清理所有缓存和临时文件
- ✅ 大版本更新后

### 注意事项 / Notes

⚠️ **警告**: 此脚本会：
- 删除 `.next` 缓存目录
- 重置本地 Supabase 数据库（会丢失本地数据）
- 重新应用所有数据库迁移
- 加载种子测试数据

⚠️ **不会影响**：
- 源代码文件
- `node_modules` 目录
- Git 历史记录
- 云端 Supabase 数据库（仅影响本地）

### 恢复后的测试账号 / Test Accounts After Reset

```
教师账号: teacher@test.com / test123456
学生账号: student@test.com / test123456

Playwright 测试账号:
  教师: playwright-teacher@test.com / Playwright123!
  学生: playwright-student@test.com / Playwright123!
```

### 访问地址 / URLs

- 应用: http://localhost:3002
- Supabase Studio: http://127.0.0.1:54323

### 故障排除 / Troubleshooting

如果脚本执行失败，请尝试：

1. **Docker 未运行**
   - 确保 Docker Desktop 已启动
   - Windows: 打开 Docker Desktop 应用

2. **端口被占用**
   - 检查 3002 端口是否被占用：`netstat -ano | findstr :3002`
   - 手动停止占用端口的进程

3. **权限问题**
   - Windows: 以管理员身份运行 CMD
   - Git Bash: 确保脚本有执行权限 `chmod +x scripts/reset-and-restart.sh`

4. **手动执行步骤**
   ```bash
   # 1. 停止服务
   taskkill /F /IM node.exe
   npx supabase stop

   # 2. 清理缓存
   rm -rf .next  # 或 Windows: rmdir /s /q .next
   docker system prune -f

   # 3. 重启数据库
   npx supabase start
   npx supabase db reset

   # 4. 启动开发服务器
   npm run dev
   ```

## 其他脚本 / Other Scripts

### start-local-dev.mjs
本地开发启动脚本，会自动启动 Supabase 和 Next.js 开发服务器。

```bash
npm run dev:local
```
