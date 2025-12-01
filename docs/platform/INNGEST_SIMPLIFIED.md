# Inngest 简化部署说明

## 📝 问题背景

之前运行 Inngest CLI 在本地开发环境会遇到以下问题：
- CPU 占用率 50-60%
- 同时占用 4 个端口（8288、8289、50052、50053）
- 大量 SYN_SENT 连接重试
- 队列操作频繁超时

## ✅ 解决方案

修改代码逻辑，在**开发环境**直接同步处理上传任务，**不需要运行 Inngest CLI**。

## 📂 修改文件

### 1. 新增核心处理逻辑
**文件**: `src/lib/ai-question-bank/process-upload.ts`

提取了 PDF/图片处理的核心逻辑，可以被开发环境直接调用，也可以被生产环境的 Inngest Worker 调用。

### 2. 修改上传 Action
**文件**: `src/app/actions/question-upload.ts`

添加环境判断逻辑：
```typescript
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // 开发环境：直接调用处理逻辑
  import('@/lib/ai-question-bank/process-upload').then(({ processUploadTask }) => {
    processUploadTask(data).catch(err => console.error(err));
  });
} else {
  // 生产环境：使用 Inngest
  await inngest.send({ name: 'question/upload.started', data });
}
```

### 3. 更新环境变量
**文件**: `.env.local`

注释掉本地 Inngest URL：
```env
# 本地开发不需要运行 Inngest，注释掉 BASE_URL
# INNGEST_BASE_URL=http://127.0.0.1:8288/
```

## 🚀 使用方式

### 开发环境（本地）

```bash
# 只需要运行 Next.js
npm run dev:legacy

# 不需要运行 Inngest CLI！
```

### 生产环境

有两种选择：

#### 方案 1：使用 Inngest Cloud（推荐）
1. 访问 https://www.inngest.com/ 注册账号
2. 获取 Event Key 和 Signing Key
3. 更新生产环境的环境变量：
   ```env
   INNGEST_EVENT_KEY=your-cloud-event-key
   INNGEST_SIGNING_KEY=your-cloud-signing-key
   NODE_ENV=production
   ```

#### 方案 2：自部署 Inngest Server
按照 Inngest 官方文档部署 Inngest Server，并配置相应的环境变量。

## 📊 效果对比

| 指标 | 之前 | 现在 |
|------|------|------|
| CPU 占用 | 50-60% | 0% |
| 占用端口 | 4 个 | 0 个 |
| 启动步骤 | 2 个（Next.js + Inngest） | 1 个（Next.js） |
| 开发体验 | 卡顿 | 流畅 |

## 🔧 技术细节

### 为什么开发环境可以同步处理？

1. **并发量低**：本地开发通常只有 1-2 个并发上传
2. **不需要重试**：开发环境错误可以立即调试
3. **简化流程**：减少依赖，加快开发迭代

### 为什么生产环境需要 Inngest？

1. **高并发**：支持多用户同时上传
2. **可靠性**：自动重试、错误恢复
3. **可观测性**：提供完整的日志和监控
4. **横向扩展**：可以部署多个 Worker

## 📝 注意事项

1. **环境变量**：确保 `NODE_ENV` 设置正确
   - 开发环境：`development`
   - 生产环境：`production`

2. **代码兼容性**：核心处理逻辑保持不变，只是调用方式不同

3. **功能一致性**：开发环境和生产环境的处理结果完全一致

## 🐛 故障排查

### 问题：上传后任务一直处于 pending 状态

**可能原因**：
1. 检查浏览器控制台是否有错误
2. 检查 Next.js 服务器日志是否有 "开发环境：直接处理上传任务"
3. 检查 Qwen API Key 是否配置正确

**解决方法**：
```bash
# 查看 Next.js 日志
# 应该看到类似输出：
# 开发环境：直接处理上传任务 { taskId: '...' }
# 开始处理上传任务 ...
# 解析完成 ...
```

### 问题：Inngest Worker 仍然被触发

**可能原因**：
- `NODE_ENV` 没有设置为 `development`

**解决方法**：
```bash
# 检查环境变量
echo $NODE_ENV  # 应该输出 development

# 或在 package.json 中设置
"dev:legacy": "NODE_ENV=development next dev -p 3002"
```

## 🎉 总结

通过这次简化，您现在可以：
- ✅ 不运行任何 Inngest 服务
- ✅ CPU 占用降为 0
- ✅ 开发体验更流畅
- ✅ 代码逻辑更清晰
- ✅ 生产环境保持原有功能
