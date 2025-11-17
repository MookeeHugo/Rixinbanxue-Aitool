# CSP 错误修复 - 2025-11-18

## 问题描述

浏览器控制台报错：
```
Content Security Policy of your site blocks the use of 'eval' in JavaScript
```

页面表现：http://localhost:3002/papers 一直显示"加载中..."，无法正常加载。

---

## 原因分析

Content Security Policy (CSP) 是一种安全策略，用于防止 XSS 攻击。CSP 默认禁止使用 `eval()` 和内联脚本。

在开发环境中，以下情况会使用 `eval`:
1. **Next.js 热模块替换 (HMR)** - 开发模式下的实时更新
2. **React Fast Refresh** - React 组件的热重载
3. **某些第三方库** - 如 Ant Design、Supabase 可能在开发模式下使用动态代码执行

可能的触发原因：
- 浏览器扩展（广告拦截器、隐私保护扩展）注入了严格的 CSP
- 系统代理或安全软件修改了 HTTP headers
- 开发工具设置了严格的安全策略

---

## 解决方案

### ✅ 方案 1: 在 Next.js 配置中设置开发环境 CSP（已实施）

**修改文件**: [next.config.mjs](../next.config.mjs)

在配置中添加 `headers()` 函数，仅在开发环境中放松 CSP 限制：

```javascript
// 9. 开发环境 Headers 配置 - 修复 CSP 错误
async headers() {
  // 仅在开发环境中放松 CSP 限制
  if (process.env.NODE_ENV === 'development') {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // 允许 eval 和内联脚本
              "style-src 'self' 'unsafe-inline'",                  // 允许内联样式
              "img-src 'self' data: blob: https:",                 // 允许图片来源
              "font-src 'self' data:",                              // 允许字体来源
              "connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https://*.supabase.co",  // 允许 Supabase 和本地连接
            ].join('; '),
          },
        ],
      },
    ];
  }
  return [];  // 生产环境不设置（由部署平台管理）
},
```

**重要说明**：
- ✅ 仅在开发环境 (`NODE_ENV === 'development'`) 中启用
- ✅ 允许 `'unsafe-eval'` - Next.js HMR 需要
- ✅ 允许 `'unsafe-inline'` - 用于内联脚本和样式
- ✅ 允许 Supabase 连接 (`https://*.supabase.co`)
- ✅ 允许本地 WebSocket (`ws:`, `wss:`) - HMR 需要
- ⚠️ 生产环境会使用更严格的 CSP（由 Vercel 等平台自动管理）

**应用修复**：

```bash
# 1. 停止当前开发服务器
# 按 Ctrl+C

# 2. 清除 .next 缓存
rm -rf .next
# Windows PowerShell:
Remove-Item -Recurse -Force .next

# 3. 重启开发服务器
npm run dev:legacy
# 或使用 Turbopack（如果可用）:
npm run dev
```

---

### 方案 2: 禁用浏览器扩展（备选）

如果方案 1 无效，可能是浏览器扩展导致的：

**步骤**：

1. **打开隐私模式/无痕模式**
   - Chrome: `Ctrl + Shift + N`
   - Edge: `Ctrl + Shift + P`
   - Firefox: `Ctrl + Shift + P`

2. **访问页面**：http://localhost:3002/papers

3. **如果正常**：说明是浏览器扩展导致的问题

**常见问题扩展**：
- uBlock Origin
- AdGuard
- Privacy Badger
- NoScript
- HTTPS Everywhere（旧版本）
- 某些 VPN 扩展

**临时解决**：
- 在扩展设置中将 `localhost` 和 `127.0.0.1` 加入白名单
- 或在开发时暂时禁用扩展

---

### 方案 3: 清除浏览器缓存和数据（备选）

有时浏览器缓存的旧 CSP 策略会导致问题：

**Chrome/Edge**：
1. 打开开发者工具 (`F12`)
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"

**或完全清除缓存**：
1. `Ctrl + Shift + Delete` 打开清除浏览数据
2. 选择 "缓存的图像和文件"
3. 时间范围选择 "所有时间"
4. 点击 "清除数据"

**清除站点数据**：
1. 打开 `chrome://settings/siteData`
2. 搜索 `localhost`
3. 删除所有相关数据

---

### 方案 4: 检查系统代理和安全软件（备选）

某些企业网络或安全软件会修改 HTTP headers：

**检查项**：
- 企业代理服务器
- 防病毒软件（如卡巴斯基、诺顿）
- 防火墙软件
- 家长控制软件

**临时解决**：
- 暂时禁用相关软件
- 或将开发服务器加入白名单

---

## 验证修复

### 1. 重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）

# 清除缓存
rm -rf .next

# 重新启动
npm run dev:legacy
```

### 2. 访问页面

打开 http://localhost:3002/papers

### 3. 检查控制台

打开浏览器开发者工具 (`F12`)，检查：

**✅ 成功标志**：
- 没有 CSP 错误
- 页面正常加载，不再显示"加载中..."
- 可以看到试卷列表或"暂无试卷"提示

**❌ 仍有问题**：
- 仍然显示 CSP 错误
- 页面一直加载
- 尝试方案 2-4

### 4. 检查 Network 标签

在开发者工具的 Network 标签中：

1. 刷新页面
2. 找到主文档请求 (papers)
3. 查看 Response Headers
4. 应该能看到 `content-security-policy` header 包含 `'unsafe-eval'`

---

## 生产环境说明

**重要**：此配置仅在开发环境生效，不会影响生产环境的安全性。

### 生产环境 CSP 建议

如果需要在生产环境设置 CSP，应该使用更严格的策略：

```javascript
// 生产环境 CSP（示例）
async headers() {
  if (process.env.NODE_ENV === 'production') {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",  // ❌ 不允许 eval
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
            ].join('; '),
          },
        ],
      },
    ];
  }
  return [];
},
```

**注意**：
- 生产环境通常由部署平台（如 Vercel、Netlify）自动管理 CSP
- 不需要手动设置，除非有特殊需求

---

## 故障排查

### 问题 1: 修改配置后仍有 CSP 错误

**原因**：配置未生效或缓存未清除

**解决**：
```bash
# 1. 完全停止开发服务器
# 2. 删除 .next 目录
rm -rf .next
# 3. 重启
npm run dev:legacy
# 4. 清除浏览器缓存并硬性重新加载
```

### 问题 2: 隐私模式下正常，普通模式下有问题

**原因**：浏览器扩展干扰

**解决**：
1. 打开 `chrome://extensions`
2. 逐个禁用扩展并测试
3. 找到问题扩展后，将 localhost 加入白名单

### 问题 3: 所有方案都无效

**原因**：可能是系统级别的网络策略

**解决**：
1. 使用其他浏览器测试
2. 使用其他设备测试
3. 检查系统代理设置
4. 检查 hosts 文件是否被修改
5. 联系网络管理员（企业网络）

---

## 技术说明

### CSP 指令含义

| 指令 | 说明 | 开发环境 | 生产环境 |
|------|------|---------|---------|
| `default-src 'self'` | 默认只允许同源资源 | ✅ | ✅ |
| `script-src 'unsafe-eval'` | 允许 eval() | ✅ 开发需要 | ❌ 不推荐 |
| `script-src 'unsafe-inline'` | 允许内联脚本 | ✅ 开发需要 | ❌ 不推荐 |
| `style-src 'unsafe-inline'` | 允许内联样式 | ✅ | ⚠️ 谨慎使用 |
| `connect-src` | 允许的网络连接 | ✅ 包含 Supabase | ✅ 仅必需 |
| `img-src` | 允许的图片来源 | ✅ 所有 HTTPS | ⚠️ 限制来源 |

### Next.js HMR 对 eval 的依赖

Next.js 开发服务器使用以下技术，它们都依赖 `eval`:

1. **Webpack HMR (Hot Module Replacement)**
   - 动态注入更新的模块代码
   - 使用 `eval()` 执行更新后的代码

2. **React Fast Refresh**
   - 保持组件状态的同时更新代码
   - 依赖动态代码执行

3. **Source Maps**
   - 在开发模式下映射编译后的代码到源代码
   - 使用 `eval-source-map`

这就是为什么开发环境必须允许 `'unsafe-eval'`。

---

## 相关文档

- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [MDN CSP 指南](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google 的 CSP 评估工具

---

## 总结

| 解决方案 | 难度 | 推荐度 | 说明 |
|---------|------|--------|------|
| 方案 1: Next.js 配置 | ⭐ | ⭐⭐⭐⭐⭐ | 最佳方案，已实施 |
| 方案 2: 禁用扩展 | ⭐⭐ | ⭐⭐⭐⭐ | 适用于扩展导致的问题 |
| 方案 3: 清除缓存 | ⭐ | ⭐⭐⭐ | 快速尝试 |
| 方案 4: 检查安全软件 | ⭐⭐⭐ | ⭐⭐ | 企业环境适用 |

**下一步**：
1. ✅ 已在 next.config.mjs 中添加开发环境 CSP 配置
2. ⏳ 重启开发服务器（用户操作）
3. ⏳ 验证页面正常加载

---

**修复时间**: 2025-11-18
**修复人员**: Claude Code
**影响范围**: 仅开发环境，不影响生产环境安全性
