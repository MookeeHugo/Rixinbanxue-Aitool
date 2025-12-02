# 森系配色迁移 - 合并说明

## 📋 当前状态

### 分支信息
- **当前分支**: `feature/nature-color-migration`
- **目标分支**: `master`
- **提交数量**: 3 commits
- **文件变更**: 26 files (+2626 / -1239)

### 最新提交
```
fe3d388 - 业务组件：森系配色全面迁移
24ff723 - UI组件：森系配色迁移
0d36431 - 配置：森系配色系统
```

---

## ⚠️ 合并前必做检查

### 1. 浏览器测试 (必需)

开发服务器已启动在: **http://localhost:3002**

**测试步骤**:
1. 打开浏览器访问 http://localhost:3002
2. 参考 `docs/forest-color-testing-guide.md` 完成测试
3. 填写测试报告

**关键测试���面**:
- [ ] 首页 - 检查导航栏青葱绿背景和注册按钮
- [ ] /tools/ingest - 检查题目卡片、徽章、按钮
- [ ] /questions - 检查题库列表和各种状态
- [ ] /papers - 检查组卷页面

### 2. 对比度检查 (必需)

**使用 Chrome DevTools**:
1. 按 F12 打开开发者工具
2. 选中元素（如主按钮）
3. 在 Styles 面板点击颜色色块
4. 查看底部对比度信息

**最低标准**:
- 主按钮: ≥ 3:1 (AA 大字体)
- 链接文字: ≥ 4.5:1 (AA 正常)
- 次要按钮: ≥ 3:1 (如不足需调整)

### 3. 视觉一致性检查 (推荐)

**多页面验证**:
- [ ] 所有主按钮都是青葱绿
- [ ] 所有次要按钮都是石青绿浅色背景
- [ ] 焦点环清晰可见（Tab 键测试）
- [ ] Success 状态使用青葱绿
- [ ] Warning 保持橙色，Error 保持红色

---

## 🚀 合并方式选择

### 方式 1: 本地合并（推荐用于本地仓库）

适用于没有配置远程仓库的项目。

#### 步骤 1: 切换到主分支
```bash
git checkout master
```

#### 步骤 2: 确认主分支状态
```bash
git status
git log --oneline -5
```

#### 步骤 3: 合并 feature 分支
```bash
# 使用 --no-ff 保留分支历史
git merge --no-ff feature/nature-color-migration -m "Merge: 森系配色体系全面迁移

完成从深空蓝+光子橙到青葱绿+石青绿的配色系统迁移
- 配置文件: tailwind.config.ts, globals.css
- 核心 UI: Button, Badge, Navbar
- 业务组件: 20+ 个组件的蓝色替换
- 提交数量: 3 commits
- 文件变更: 26 files

详细信息见: docs/pull-request-template.md
"
```

#### 步骤 4: 验证合并结果
```bash
# 查看合并后的历史
git log --oneline --graph -10

# 确认文件变更
git diff HEAD~1 --stat
```

#### 步骤 5: 删除 feature 分支（可选）
```bash
# 删除本地分支
git branch -d feature/nature-color-migration
```

---

### 方式 2: 配置远程仓库后 PR（推荐用于团队协作）

适用于需要团队协作审核的项目。

#### 步骤 1: 配置远程仓库
```bash
# 添加远程仓库（替换为实际仓库地址）
git remote add origin <repository-url>

# 验证配置
git remote -v
```

#### 步骤 2: 推送分支
```bash
# 推送主分支
git push -u origin master

# 推送 feature 分支
git push -u origin feature/nature-color-migration
```

#### 步骤 3: 创建 Pull Request

**使用 GitHub CLI**:
```bash
# 安装 gh（如未安装）
# Windows: winget install GitHub.cli
# macOS: brew install gh

# 登录 GitHub
gh auth login

# 创建 PR
gh pr create \
  --title "森系配色体系全面迁移" \
  --body-file docs/pull-request-template.md \
  --base master \
  --head feature/nature-color-migration
```

**或通过 Web 界面**:
1. 访问 GitHub/GitLab 仓库页面
2. 点击 "Pull Requests" → "New Pull Request"
3. 选择 base: `master`, compare: `feature/nature-color-migration`
4. 复制 `docs/pull-request-template.md` 内容到 PR 描述
5. 点击 "Create Pull Request"

#### 步骤 4: 等待审核和合并
- 邀请团队成员 Review
- 解决所有 Review 意见
- 通过所有 CI/CD 检查
- 点击 "Merge" 按钮合并

---

### 方式 3: Squash 合并（简化历史）

如果希望将 3 个 commits 压缩为 1 个。

```bash
git checkout master
git merge --squash feature/nature-color-migration
git commit -m "feat: 森系配色体系全面迁移

完成从深空蓝+光子橙到青葱绿+石青绿的配色系统全面迁移

核心变更:
- 配置: tailwind.config.ts, globals.css 新增森系配色定义
- 核心UI: Button, Badge, Navbar 使用青葱绿/石青绿
- 业务组件: 20+组件完成蓝色→森系配色替换

统计:
- 修改文件: 26 个
- 代码变更: +2626 / -1239
- 蓝色替换: 40+ 处

详见: docs/pull-request-template.md
"
```

---

## 🐛 合并冲突解决

### 可能的冲突点
1. **tailwind.config.ts** - 如果主分支有新增颜色定义
2. **globals.css** - 如果主分支有新增全局样式
3. **组件文件** - 如果主分支有修改相同组件

### 解决步骤
```bash
# 如果合并时出现冲突
git status  # 查看冲突文件

# 手动编辑冲突文件，解决冲突
# 查找 <<<<<<<, =======, >>>>>>> 标记

# 解决后标记为已解决
git add <冲突文件>

# 完成合并
git commit
```

### 冲突示例
```diff
<<<<<<< HEAD
primary: {
  DEFAULT: '#0052D4',  // 主分支的旧蓝色
=======
primary: {
  DEFAULT: '#0AA344',  // feature 分支的新绿色
>>>>>>> feature/nature-color-migration
```

**解决**: 保留 `#0AA344`（新配色），删除标记行。

---

## ✅ 合并后验证

### 1. 功能验证
```bash
# 重新启动开发服务器（如已关闭）
npm run dev

# 访问关键页面，确认一切正常
```

### 2. 构建验证
```bash
# 执行生产构建
npm run build

# 检查构建输出，确保无错误
```

### 3. 代码质量
```bash
# TypeScript 类型检查
npx tsc --noEmit

# ESLint 检查
npm run lint
```

---

## 🔄 回滚方案

如果合并后发现严重问题，可以回滚：

### 方法 1: 使用 revert（推荐，保留历史）
```bash
# 找到合并的 commit hash
git log --oneline -5

# 撤销合并（假设合并 commit 是 abc1234）
git revert -m 1 abc1234
```

### 方法 2: 使用 reset（危险，会丢失历史）
```bash
# 仅在本地且未推送时使用
git reset --hard HEAD~1
```

### 方法 3: 恢复到合并前的 commit
```bash
# 查找合并前的 commit
git reflog

# 恢复到指定 commit（假设是 def5678）
git reset --hard def5678
```

---

## 📊 合并后任务

### 1. 文档更新
- [ ] 更新 README.md，说明新配色系统
- [ ] 添加设计规范文档
- [ ] 更新组件库文档

### 2. 团队通知
- [ ] 通知设计团队配色已更新
- [ ] 通知前端团队新的颜色变量
- [ ] 分享测试指南给 QA 团队

### 3. 后续优化
- [ ] 收集用户反馈
- [ ] 根据无障碍性测试结果调整对比度
- [ ] 考虑添加暗色模式支持（如需要）

---

## 🎯 快速命令参考

```bash
# 查看当前状态
git status
git branch
git log --oneline -5

# 本地合并（最简单）
git checkout master
git merge --no-ff feature/nature-color-migration

# 验证合并
npm run dev
npm run build

# 推送到远程（如已配置）
git push origin master

# 删除 feature 分支
git branch -d feature/nature-color-migration
```

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Git 冲突解决文档
2. 参考 `docs/forest-color-testing-guide.md`
3. 联系团队技术负责人
4. 查阅 Git 官方文档: https://git-scm.com/doc

---

**祝合并顺利！🎉**
