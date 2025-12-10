#!/bin/bash
# Git 大文件清理脚本
# 警告：这会重写 Git 历史，执行前请确保备份

echo "🔍 开始清理 Git 仓库中的大文件..."
echo ""

# 需要移除的文件和目录
FILES_TO_REMOVE=(
  "next-dev.log"
  "inngest-dev.log"
  "inngest-dev-run.log"
  "test-reports/"
  "tmp/ocr-debug/"
)

# 显示清理前的仓库大小
echo "📊 清理前仓库大小:"
du -sh .git

echo ""
echo "⚠️  警告：即将重写 Git 历史！"
echo "以下文件将被永久删除："
printf '%s\n' "${FILES_TO_REMOVE[@]}"
echo ""
read -p "确认继续？(y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 已取消"
  exit 1
fi

# 使用 git filter-repo 清理（推荐）
if command -v git-filter-repo &> /dev/null; then
  echo "✅ 使用 git-filter-repo 清理..."

  for file in "${FILES_TO_REMOVE[@]}"; do
    echo "  移除: $file"
    git filter-repo --path "$file" --invert-paths --force
  done

# 使用 BFG Repo-Cleaner（备选）
elif command -v bfg &> /dev/null; then
  echo "✅ 使用 BFG Repo-Cleaner 清理..."

  # 删除大于 10MB 的文件
  bfg --strip-blobs-bigger-than 10M

  # 删除指定文件
  for file in "${FILES_TO_REMOVE[@]}"; do
    echo "  移除: $file"
    bfg --delete-files "$file"
  done

# 使用传统 git filter-branch（最慢，但总是可用）
else
  echo "⚠️  使用 git filter-branch（较慢）..."
  echo "提示：安装 git-filter-repo 可提升速度"
  echo "  安装方法: pip install git-filter-repo"
  echo ""

  for file in "${FILES_TO_REMOVE[@]}"; do
    echo "  移除: $file"
    git filter-branch --force --index-filter \
      "git rm -rf --cached --ignore-unmatch $file" \
      --prune-empty --tag-name-filter cat -- --all
  done
fi

# 清理和压缩
echo ""
echo "🗑️  清理引用和回收空间..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "📊 清理后仓库大小:"
du -sh .git

echo ""
echo "✅ 清理完成！"
echo ""
echo "⚠️  重要提示："
echo "1. 如果已经推送到远程，需要强制推送："
echo "   git push origin --force --all"
echo "2. 团队成员需要重新克隆仓库"
echo "3. 建议先在新分支测试"
