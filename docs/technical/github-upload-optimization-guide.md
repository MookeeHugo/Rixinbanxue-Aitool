# GitHub 上传优化指南

**更新日期**: 2025-12-11
**项目**: RixinMath AI 题库系统

---

## 📊 当前状态分析

### 项目大小概览

| 组成部分 | 大小 | 是否上传 GitHub | 状态 |
|---------|------|-----------------|------|
| **Git 仓库** | **96 MB** | ✅ 是 | ✅ **安全** |
| node_modules | 423 MB | ❌ 否（.gitignore） | ✅ 已忽略 |
| logs | 214 MB | ❌ 否（.gitignore） | ✅ 已忽略 |
| .next | 62 MB | ❌ 否（.gitignore） | ✅ 已忽略 |
| test-reports | 16 MB | ❌ 否（已更新） | ✅ 已忽略 |
| **项目总大小** | 3.2 GB | N/A | - |

### ✅ 结论：**完全适合上传 GitHub**

- GitHub 单仓库限制：< 1 GB（您的 96 MB 远低于此）
- 单文件限制：< 100 MB
- 推送大小限制：< 2 GB

---

## 🔧 优化步骤

### 步骤 1: 更新 .gitignore（已完成）✅

已添加以下忽略规则：
```gitignore
# Logs & local artifacts
logs/
tmp/
tests/output/
*.log
test-reports/          # ← 新增
inngest-*.log          # ← 新增
next-dev.log           # ← 新增
```

### 步骤 2: 从当前工作区移除已忽略文件

```bash
# 从 Git 索引中移除（但保留本地文件）
git rm --cached -r test-reports/
git rm --cached next-dev.log inngest-*.log

# 提交移除
git commit -m "chore: 从仓库中移除测试报告和日志文件"
```

### 步骤 3: 清理 Git 历史（可选，推荐）

**⚠️ 警告**: 这会重写 Git 历史，适合首次上传或私有仓库

#### 方法 A: 使用 PowerShell 脚本（推荐）

```powershell
# Windows 用户
.\scripts\cleanup-git-large-files.ps1
```

#### 方法 B: 使用 Bash 脚本

```bash
# Mac/Linux 用户
bash scripts/cleanup-git-large-files.sh
```

#### 方法 C: 手动清理

```bash
# 1. 安装 git-filter-repo（推荐）
pip install git-filter-repo

# 2. 移除大文件
git filter-repo --path test-reports/ --invert-paths --force
git filter-repo --path next-dev.log --invert-paths --force
git filter-repo --path inngest-dev.log --invert-paths --force

# 3. 清理和压缩
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**预期效果**: Git 仓库从 96 MB 降至 **50-60 MB**

---

## 📤 上传到 GitHub

### 首次上传

```bash
# 1. 在 GitHub 创建新仓库（不要初始化 README）

# 2. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 3. 推送代码
git push -u origin feature/nature-color-migration

# 或推送到 main 分支
git checkout -b main
git push -u origin main
```

### 如果清理了 Git 历史

```bash
# 强制推送（仅在清理历史后）
git push origin --force --all
git push origin --force --tags
```

---

## 🗂️ 大文件管理策略

### 当前已提交的大文件（保留）

以下文件虽然较大，但属于**必要的测试数据**，建议保留：

```
tests/dataset/03_handwritten/HAND-03-margin-notes.jpg (6 MB)
tests/dataset/03_handwritten/HAND-01-red-pen-marks.jpg (5.7 MB)
tests/dataset/04_bad_quality/BAD-04-folded-paper.jpg (4.8 MB)
tests/dataset/03_handwritten/HAND-05-pencil-sketches.jpg (4.9 MB)
```

**原因**:
- 这些是测试数据集，用于验证 AI 解析能力
- 团队成员需要这些文件来运行测试
- 无法用 npm/pip 安装

### 替代方案（可选）

#### 选项 1: Git LFS（Large File Storage）

适合管理大型二进制文件：

```bash
# 1. 安装 Git LFS
git lfs install

# 2. 跟踪大文件类型
git lfs track "tests/dataset/**/*.jpg"
git lfs track "tests/dataset/**/*.png"

# 3. 提交 .gitattributes
git add .gitattributes
git commit -m "chore: 启用 Git LFS 管理测试图片"

# 4. 迁移现有文件到 LFS
git lfs migrate import --include="tests/dataset/**/*.jpg"
```

**优点**:
- 仓库体积大幅减小
- 克隆速度更快
- GitHub 免费提供 1 GB LFS 存储

**缺点**:
- 需要额外配置
- 超过免费额度需付费

#### 选项 2: 外部存储 + 下载脚本

将大文件存储在云端，提供下载脚本：

```bash
# scripts/download-test-data.sh
#!/bin/bash
# 从云存储下载测试数据集

echo "📥 下载测试数据集..."

# 示例：从 Google Drive/OneDrive/S3 下载
curl -L "https://your-storage-url/test-dataset.zip" -o tests/dataset.zip
unzip tests/dataset.zip -d tests/
rm tests/dataset.zip

echo "✅ 测试数据集已就绪"
```

---

## 📋 上传前检查清单

### 必需检查 ✅

- [x] `.gitignore` 已更新
- [x] `node_modules` 未被跟踪
- [x] `.env` 文件未被跟踪
- [x] 日志文件未被跟踪
- [x] Git 仓库 < 100 MB

### 推荐检查 ✅

- [ ] 移除测试报告（test-reports）
- [ ] 移除日志文件（*.log）
- [ ] 清理 Git 历史
- [ ] 考虑使用 Git LFS

### 安全检查 ✅

```bash
# 检查是否泄露敏感信息
git log --all --full-history -- "*password*" "*secret*" "*token*" "*.env"

# 检查大文件
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort -k2 -nr | \
  head -20
```

---

## 🚀 快速开始（推荐流程）

### 最小优化（5 分钟）

```bash
# 1. 从索引移除不需要的文件
git rm --cached -r test-reports/
git rm --cached next-dev.log inngest-*.log 2>/dev/null

# 2. 提交
git commit -m "chore: 移除测试报告和日志文件"

# 3. 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

**结果**: 仓库 ~96 MB，适合上传

### 完整优化（15 分钟）

```bash
# 1. 执行清理脚本
.\scripts\cleanup-git-large-files.ps1

# 2. 验证大小
git count-objects -vH

# 3. 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main --force
```

**结果**: 仓库 ~50-60 MB，高度优化

---

## 📊 性能对比

| 场景 | 仓库大小 | 克隆时间（估算） | 推荐度 |
|------|---------|------------------|--------|
| **当前状态** | 96 MB | ~30 秒 | ⭐⭐⭐ |
| 最小优化 | 85 MB | ~25 秒 | ⭐⭐⭐⭐ |
| 完整优化 | 50 MB | ~15 秒 | ⭐⭐⭐⭐⭐ |
| + Git LFS | 20 MB | ~10 秒 | ⭐⭐⭐⭐⭐ |

---

## 💡 最佳实践

### 开发中避免提交大文件

#### 1. 使用 pre-commit hook

已配置 `scripts/check-encoding.mjs`，可扩展：

```javascript
// scripts/check-large-files.mjs
import { execSync } from 'child_process';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean);

for (const file of staged) {
  const size = execSync(`git cat-file -s :${file}`, { encoding: 'utf-8' });
  if (parseInt(size) > MAX_SIZE) {
    console.error(`❌ 文件过大: ${file} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    process.exit(1);
  }
}
```

#### 2. 定期检查仓库健康

```bash
# 添加到 package.json
{
  "scripts": {
    "repo:check": "git count-objects -vH",
    "repo:cleanup": "git gc --aggressive --prune=now",
    "repo:size": "du -sh .git"
  }
}
```

---

## 🆘 常见问题

### Q1: 推送时提示文件过大？

```
error: GH001: Large files detected. You may want to try Git Large File Storage
```

**解决**:
```bash
# 查找大文件
git rev-list --objects --all | \
  git cat-file --batch-check='%(objectsize) %(rest)' | \
  awk '$1 > 50000000 {print $1/1024/1024 " MB", $2}' | \
  sort -rn

# 从历史中移除
git filter-repo --path PATH_TO_LARGE_FILE --invert-paths --force
```

### Q2: 误提交了 .env 文件？

```bash
# 立即从历史中移除
git filter-repo --path .env --invert-paths --force
git filter-repo --path .env.local --invert-paths --force

# 如果已推送，需要强制推送
git push origin --force --all

# 重置敏感信息（API keys 等）
```

### Q3: 团队成员如何同步清理后的仓库？

```bash
# 方法 1: 重新克隆（推荐）
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 方法 2: 强制拉取（谨慎）
git fetch origin
git reset --hard origin/main
git clean -fdx
```

---

## 📚 相关资源

- [GitHub 仓库大小限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- [Git LFS 文档](https://git-lfs.github.com/)
- [git-filter-repo 文档](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**最后更新**: 2025-12-11
**维护者**: Claude Code
