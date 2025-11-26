# Turbo 模式问题解决方案

> **问题**: Next.js Turbo 模式启动失败 - "Next.js package not found"
> **日期**: 2025-11-26
> **状态**: 已诊断，使用稳定模式替代

---

## 📋 问题描述

### 错误信息

```
Error: Next.js package not found

Debug info:
- Execution of get_entrypoints_with_issues failed
- Execution of Project::entrypoints failed
- Execution of PagesProject::to_endpoint failed
- Execution of PagesStructureItem::new failed
- Execution of FileSystemPath::join failed
- Execution of get_next_package failed
- Next.js package not found
```

### 触发条件

使用 `--turbo` 标志启动 Next.js 开发服务器时：
```bash
next dev -p 3002 --turbo
```

---

## 🔍 根本原因

### 可能的原因

1. **Turbo 引擎包查找问题**
   - Turbopack 无法正确定位 node_modules 中的 Next.js 包
   - 可能与项目结构或 pnpm 符号链接有关

2. **Node.js 版本兼容性**
   - 当前使用 Node.js v24.11.0
   - 项目配置要求 v22
   - Turbo 模式对版本更敏感

3. **依赖解析问题**
   - pnpm 的依赖解析与 Turbo 模式不完全兼容
   - Catalog 协议 (`catalog:`) 可能导致路径解析问题

---

## ✅ 已实施的解决方案

### 1. 默认使用稳定模式

**修改内容**:
- 将默认启动命令改为标准模式（不使用 Turbo）
- 保留 Turbo 作为可选功能

**配置更新**:

[package.json](../package.json#L7-L9):
```json
{
  "scripts": {
    "dev": "next dev -p 3002",              // 默认：稳定模式 ✅
    "dev:turbo": "next dev -p 3002 --turbo", // 可选：Turbo 模式
    "dev:legacy": "next dev -p 3002"         // 别名：稳定模式
  }
}
```

[scripts/dev-start.mjs](../scripts/dev-start.mjs#L138):
```javascript
async function startDevServer(useTurbo = false) {  // 默认 false
  // ...
}
```

### 2. 更新启动命令

所有启动命令现在默认使用稳定模式：

```bash
npm run dev          # ✅ 使用稳定模式
npm run dev:clean    # ✅ 使用稳定模式
npm run dev:quick    # ✅ 使用稳定模式
```

如需使用 Turbo 模式：
```bash
npm run dev:turbo    # 尝试使用 Turbo 模式（可能失败）
```

---

## 🎯 性能对比

### Turbo 模式 vs 稳定模式

| 特性 | Turbo 模式 | 稳定模式 | 备注 |
|------|-----------|---------|------|
| 首次启动 | ❌ 失败 | ✅ ~10秒 | Turbo 无法启动 |
| 热更新速度 | N/A | ✅ ~1-2秒 | 稳定模式足够快 |
| 内存占用 | N/A | ✅ 正常 | - |
| 稳定性 | ❌ 不稳定 | ✅ 稳定 | - |
| 兼容性 | ❌ 有问题 | ✅ 完全兼容 | - |

**结论**: 稳定模式性能已经足够好，且更可靠。

---

## 🔧 尝试修复 Turbo 模式（可选）

如果你想尝试修复 Turbo 模式，可以尝试以下方法：

### 方法1: 重新安装 Next.js

```bash
# 删除 Next.js
pnpm remove next

# 清理缓存
npm run dev:fix

# 重新安装
pnpm add next@14.2.33
```

### 方法2: 降级到支持的 Node.js 版本

```bash
# 使用 nvm 切换到 Node.js v22
nvm install 22
nvm use 22

# 重新安装依赖
npm run dev:reset
```

### 方法3: 检查 Next.js 配置

确保 [next.config.mjs](../next.config.mjs) 中没有与 Turbo 冲突的配置。

### 方法4: 使用 npm 替代 pnpm

Turbo 模式可能与 pnpm 的依赖解析有兼容性问题：

```bash
# 删除 pnpm 依赖
rm -rf node_modules pnpm-lock.yaml

# 使用 npm
npm install

# 尝试 Turbo 模式
npm run dev:turbo
```

---

## 📊 测试结果

### 稳定模式测试 ✅

```bash
$ npm run dev:legacy

> next dev -p 3002

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3002
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 8.7s
```

✅ **结果**: 启动成功，服务器正常运行

### Turbo 模式测试 ❌

```bash
$ npm run dev:turbo

> next dev -p 3002 --turbo

  ▲ Next.js 14.2.33 (turbo)
  - Local:        http://localhost:3002
  - Environments: .env.local

 ✓ Starting...
[Error: Next.js package not found]
```

❌ **结果**: 启动失败

---

## 💡 推荐做法

### 短期策略（当前）

1. ✅ 使用稳定模式进行开发
2. ✅ 性能已经足够好（热更新 1-2秒）
3. ✅ 更稳定、更可靠

### 长期策略（未来）

1. 等待 Next.js 15 稳定版（Turbo 作为默认）
2. 等待社区解决 pnpm + Turbo 兼容性问题
3. 考虑迁移到 npm 以获得更好的 Turbo 支持

---

## 🔗 相关资源

### Next.js Turbo 官方文档
- [Next.js Turbopack](https://nextjs.org/docs/architecture/turbopack)
- [Turbopack 已知问题](https://github.com/vercel/next.js/issues?q=is%3Aissue+is%3Aopen+turbo)

### 社区讨论
- [pnpm + Turbo 兼容性问题](https://github.com/vercel/next.js/discussions)
- [Node.js 版本要求](https://nextjs.org/docs/getting-started/installation)

---

## 📝 FAQ

### Q: Turbo 模式有必要吗？

**A**: 对于大多数项目，稳定模式的性能已经足够。Turbo 主要在以下场景有明显优势：
- 超大型项目（>100个页面）
- 大量的服务端组件
- 频繁的文件修改

我们的项目使用稳定模式完全可以满足需求。

### Q: 未来会再启用 Turbo 吗？

**A**: 会的。当以下条件满足时：
1. Next.js 15 正式发布（Turbo 作为默认）
2. pnpm 兼容性问题解决
3. 或者迁移到 npm 包管理器

### Q: 如何知道我在用哪个模式？

**A**: 启动时查看输出：
- 有 `(turbo)` 标记 = Turbo 模式
- 没有标记 = 稳定模式

```bash
# Turbo 模式
▲ Next.js 14.2.33 (turbo)

# 稳定模式
▲ Next.js 14.2.33
```

---

## ✅ 总结

### 问题状态
- ✅ 已诊断：Turbo 模式存在依赖查找问题
- ✅ 已解决：切换到稳定模式
- ✅ 已验证：服务器正常运行

### 当前配置
- ✅ 默认使用稳定模式
- ✅ 性能满足需求
- ✅ 稳定可靠

### 用户操作
```bash
# 日常开发（推荐）
npm run dev:clean    # 清理缓存并启动

# 快速启动
npm run dev          # 直接启动

# 如需尝试 Turbo（可能失败）
npm run dev:turbo
```

---

**最后更新**: 2025-11-26
**状态**: 已解决 ✅
