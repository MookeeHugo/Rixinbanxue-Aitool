#!/bin/bash
#################################################################
# 一键恢复脚本 - Reset and Restart All Services
# 用途：在大更新后快速重启所有服务并清理缓存
# 适用于 Git Bash / WSL 环境
#################################################################

set -e  # 遇到错误立即退出

echo "======================================"
echo "🔄 开始恢复系统..."
echo "======================================"

# 1. 停止所有服务
echo ""
echo "📌 步骤 1/5: 停止所有运行中的服务..."
echo "--------------------------------------"

# 停止 Next.js 开发服务器（Windows）
echo "停止 Next.js 服务器..."
taskkill //F //IM node.exe 2>/dev/null || echo "没有运行中的 Node.js 进程"

# 停止 Supabase 服务
echo "停止 Supabase 服务..."
npx supabase stop || echo "Supabase 未运行"

echo "✅ 服务已停止"

# 2. 清理 Next.js 缓存
echo ""
echo "📌 步骤 2/5: 清理 Next.js 缓存..."
echo "--------------------------------------"
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ .next 目录已删除"
else
  echo "ℹ️  .next 目录不存在，跳过"
fi

# 3. 清理 Docker 资源
echo ""
echo "📌 步骤 3/5: 清理 Docker 资源..."
echo "--------------------------------------"
docker system prune -f || echo "⚠️  Docker 清理失败（可能未安装 Docker）"
echo "✅ Docker 资源已清理"

# 4. 重置并重启数据库
echo ""
echo "📌 步骤 4/5: 重置数据库并应用迁移..."
echo "--------------------------------------"
npx supabase start
sleep 3
npx supabase db reset
echo "✅ 数据库已重置并启动"

# 5. 启动 Next.js 开发服务器
echo ""
echo "📌 步骤 5/5: 启动 Next.js 开发服务器..."
echo "--------------------------------------"
echo "正在后台启动 Next.js 服务器..."
echo "请在新终端窗口中运行: npm run dev"
echo "或者运行: npm run dev:legacy"

echo ""
echo "======================================"
echo "✅ 恢复完成！"
echo "======================================"
echo ""
echo "📝 后续步骤："
echo "1. 在新终端运行: npm run dev"
echo "2. 访问: http://localhost:3002"
echo "3. Supabase Studio: http://127.0.0.1:54323"
echo ""
echo "🔐 测试账号："
echo "   教师: teacher@test.com / test123456"
echo "   学生: student@test.com / test123456"
echo "   Playwright 教师: playwright-teacher@test.com / Playwright123!"
echo "   Playwright 学生: playwright-student@test.com / Playwright123!"
echo ""
echo "======================================"
