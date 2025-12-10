# Git 大文件清理脚本（Windows PowerShell 版本）
# 警告：这会重写 Git 历史，执行前请确保备份

Write-Host "🔍 开始清理 Git 仓库中的大文件..." -ForegroundColor Cyan
Write-Host ""

# 需要移除的文件和目录
$FilesToRemove = @(
    "next-dev.log",
    "inngest-dev.log",
    "inngest-dev-run.log",
    "test-reports/",
    "tmp/ocr-debug/"
)

# 显示清理前的仓库大小
Write-Host "📊 清理前仓库大小:" -ForegroundColor Yellow
git count-objects -vH

Write-Host ""
Write-Host "⚠️  警告：即将重写 Git 历史！" -ForegroundColor Red
Write-Host "以下文件将被永久删除："
$FilesToRemove | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

$confirmation = Read-Host "确认继续？(y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ 已取消" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🧹 开始清理..." -ForegroundColor Green

# 方法1：使用 git filter-repo（推荐，需要先安装）
if (Get-Command git-filter-repo -ErrorAction SilentlyContinue) {
    Write-Host "✅ 使用 git-filter-repo 清理..." -ForegroundColor Green

    foreach ($file in $FilesToRemove) {
        Write-Host "  移除: $file"
        git filter-repo --path $file --invert-paths --force
    }
}
# 方法2：使用 BFG Repo-Cleaner
elseif (Get-Command bfg -ErrorAction SilentlyContinue) {
    Write-Host "✅ 使用 BFG Repo-Cleaner 清理..." -ForegroundColor Green

    # 删除大于 10MB 的文件
    bfg --strip-blobs-bigger-than 10M
}
# 方法3：使用传统 git filter-branch
else {
    Write-Host "⚠️  未找到 git-filter-repo 或 BFG，使用传统方法（较慢）" -ForegroundColor Yellow
    Write-Host "提示：安装 git-filter-repo 可提升速度" -ForegroundColor Cyan
    Write-Host "  安装方法: pip install git-filter-repo" -ForegroundColor Cyan
    Write-Host ""

    foreach ($file in $FilesToRemove) {
        Write-Host "  移除: $file"
        git filter-branch --force --index-filter `
            "git rm -rf --cached --ignore-unmatch $file" `
            --prune-empty --tag-name-filter cat -- --all
    }

    # 清理 filter-branch 备份
    if (Test-Path .git/refs/original) {
        Remove-Item -Recurse -Force .git/refs/original
    }
}

# 清理和压缩
Write-Host ""
Write-Host "🗑️  清理引用和回收空间..." -ForegroundColor Cyan
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "📊 清理后仓库大小:" -ForegroundColor Yellow
git count-objects -vH

Write-Host ""
Write-Host "✅ 清理完成！" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  重要提示：" -ForegroundColor Yellow
Write-Host "1. 如果已经推送到远程，需要强制推送："
Write-Host "   git push origin --force --all"
Write-Host "2. 团队成员需要重新克隆仓库"
Write-Host "3. 建议先在新分支测试"
