# 🚀 快速启动参考卡

## 最常用命令（90%的情况）

```bash
npm run dev:clean    # 清理缓存并启动（推荐）⭐⭐⭐⭐⭐
npm run health       # 诊断环境问题 ⭐⭐⭐⭐
npm run dev:fix      # 快速修复缓存/端口 ⭐⭐⭐
```

---

## 完整命令列表

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `npm run dev:clean` | 清理缓存+启动 | 日常启动、更新依赖后 |
| `npm run dev:quick` | 快速启动 | 缓存正常时快速启动 |
| `npm run health` | 环境检查 | 诊断问题、验证配置 |
| `npm run dev:fix` | 清理缓存/端口 | 端口占用、缓存问题 |
| `npm run dev:reset` | 完全重置 | 严重依赖问题（慎用）|
| `npm run dev` | 标准启动 | 正常情况下使用 |

---

## 常见问题一键解决

### 🔥 端口被占用
```bash
npm run dev:clean
```

### 🔄 更新依赖后
```bash
npm run dev:clean
```

### 🐛 奇怪的缓存问题
```bash
npm run dev:fix && npm run dev
```

### 💥 所有方法都不行
```bash
npm run dev:reset
```

---

## ⚠️ 注意事项

- **Turbo模式已禁用**: 由于兼容性问题，默认使用稳定模式
- **性能无影响**: 稳定模式热更新速度 1-2秒，足够快
- **详细说明**: [Turbo模式问题解决方案](./docs/Turbo模式问题解决方案.md)

---

## 详细文档

查看 [开发环境快速启动指南](./docs/开发环境快速启动指南.md) 获取完整说明。
