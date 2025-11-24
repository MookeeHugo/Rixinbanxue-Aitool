# 部署配置指南

本文档提供直播录制系统的完整部署配置说明。

---

## 📋 目录

1. [数据库迁移](#数据库迁移)
2. [环境变量配置](#环境变量配置)
3. [LiveKit Webhook 配置](#livekit-webhook-配置)
4. [Vercel Cron 配置](#vercel-cron-配置)
5. [存储配置](#存储配置)
6. [验证部署](#验证部署)

---

## 1. 数据库迁移

### 本地开发环境

```bash
# 重置并应用所有迁移
npx supabase db reset

# 或者仅应用新迁移
npx supabase migration up
```

### 生产环境（Supabase Cloud）

```bash
# 推送迁移到远程数据库
npx supabase db push

# 或者在 Supabase Dashboard 中手动执行
# 1. 打开 SQL Editor
# 2. 执行 supabase/migrations/20241123000001_add_webhook_events.sql
```

### 验证迁移

在 Supabase Dashboard → Database → Tables 中检查：
- ✅ `webhook_events` 表已创建
- ✅ `live_recordings` 表已存在（之前创建）
- ✅ `recordings` Storage Bucket 已创建

---

## 2. 环境变量配置

### 2.1 本地开发 (`.env.local`)

复制示例文件并填写配置：

```bash
cp .env.local.example .env.local
```

**编辑 `.env.local`**:

```bash
# ========================================
# Supabase 配置
# ========================================
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (从 npx supabase status 获取)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ========================================
# LiveKit 配置
# ========================================
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# ========================================
# Cron 任务配置
# ========================================
# 生成随机密钥
CRON_SECRET=yfl4Da6f2ar1MHvKHOy77c89TIAODGS3w2i7oNC35vI=
```

### 2.2 生产环境 (Vercel)

在 **Vercel Dashboard** → **Settings** → **Environment Variables** 中添加：

| 变量名 | 值 | 来源 |
|--------|---|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Project Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase Project Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase Project Settings → API → service_role key |
| `LIVEKIT_URL` | `wss://your-server.livekit.cloud` | LiveKit Cloud Dashboard |
| `LIVEKIT_API_KEY` | `APIxxx` | LiveKit Cloud Dashboard |
| `LIVEKIT_API_SECRET` | `secret...` | LiveKit Cloud Dashboard |
| `CRON_SECRET` | `yfl4Da6f2ar...` | `openssl rand -base64 32` |

**重要**:
- ✅ 所有环境变量都设置为 **Production, Preview, Development**
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 和 `LIVEKIT_API_SECRET` 非常敏感，不要提交到 Git
- ⚠️ `CRON_SECRET` 必须使用强随机密钥

---

## 3. LiveKit Webhook 配置

### 3.1 获取 Webhook URL

**本地开发**（使用 ngrok 或 localtunnel）:
```bash
# 使用 ngrok
ngrok http 3002

# 获得 URL: https://abc123.ngrok.io
# Webhook URL: https://abc123.ngrok.io/api/live-webhooks/livekit
```

**生产环境**:
```
https://your-domain.vercel.app/api/live-webhooks/livekit
```

### 3.2 配置 LiveKit Cloud

1. 登录 [LiveKit Cloud Dashboard](https://cloud.livekit.io)
2. 选择项目 → **Settings** → **Webhooks**
3. 点击 **Add Webhook**

**配置项**:
- **Webhook URL**: `https://your-domain.vercel.app/api/live-webhooks/livekit`
- **Events to send**: 选择以下事件
  - ✅ `room_started`
  - ✅ `room_finished`
  - ✅ `participant_joined`
  - ✅ `participant_left`
  - ✅ `egress_started`
  - ✅ `egress_ended` ⭐ （最重要）
- **API Secret**: 使用项目的 `LIVEKIT_API_SECRET`

4. 点击 **Save**

### 3.3 测试 Webhook

LiveKit Dashboard 提供测试工具：
1. 进入 **Webhooks** 页面
2. 点击你创建的 Webhook 右侧的 **Test** 按钮
3. 选择 `egress_ended` 事件
4. 点击 **Send Test**
5. 检查响应是否为 `202 Accepted`

**手动测试**:
```bash
curl -X POST https://your-domain.vercel.app/api/live-webhooks/livekit \
  -H "Content-Type: application/json" \
  -H "Authorization: sha256=<signature>" \
  -d '{
    "event": "egress_ended",
    "id": "test_123",
    "createdAt": 1700000000,
    "egressInfo": {
      "egressId": "EG_test",
      "roomName": "room_test-session-id",
      "status": 3,
      "file": {
        "filename": "test.mp4",
        "location": "https://example.com/test.mp4",
        "size": 1024000,
        "duration": 60000
      }
    }
  }'
```

---

## 4. Vercel Cron 配置

### 4.1 验证 `vercel.json`

文件 [vercel.json](vercel.json) 应包含：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/cleanup-recordings",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**说明**:
- `schedule: "0 2 * * *"` = 每天凌晨 2:00 执行
- Vercel 会自动在请求头中添加 `Authorization: Bearer <CRON_SECRET>`

### 4.2 配置 `CRON_SECRET`

1. 生成随机密钥：
```bash
openssl rand -base64 32
# 输出: yfl4Da6f2ar1MHvKHOy77c89TIAODGS3w2i7oNC35vI=
```

2. 在 Vercel 中添加环境变量：
   - 变量名: `CRON_SECRET`
   - 值: `yfl4Da6f2ar1MHvKHOy77c89TIAODGS3w2i7oNC35vI=`
   - 环境: Production, Preview, Development

### 4.3 启用 Cron Jobs

Vercel Cron 在以下情况自动启用：
- ✅ 项目部署到 Vercel
- ✅ `vercel.json` 包含 `crons` 配置
- ✅ 项目使用 Pro 或 Enterprise 计划（Hobby 计划有限制）

**验证 Cron 是否启用**:
1. Vercel Dashboard → 项目 → **Settings** → **Cron Jobs**
2. 应该看到 `/api/cron/cleanup-recordings` 列在列表中

### 4.4 手动测试 Cron Job

**开发环境**（不需要密钥）:
```bash
curl http://localhost:3002/api/cron/cleanup-recordings
```

**生产环境**（需要密钥）:
```bash
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-recordings \
  -H "Authorization: Bearer yfl4Da6f2ar1MHvKHOy77c89TIAODGS3w2i7oNC35vI="
```

**预期响应**:
```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "stats": {
    "deletedCount": 5,
    "completedDeleted": 3,
    "failedDeleted": 2
  }
}
```

---

## 5. 存储配置

### 5.1 创建 Storage Buckets

在 **Supabase Dashboard** → **Storage** → **Create Bucket**:

**Bucket 1: `recordings`**
- Name: `recordings`
- Public: ❌ Private
- File size limit: 2 GB
- Allowed MIME types: `video/mp4`, `video/webm`

**Bucket 2: `live-files`** (如果需要文件共享)
- Name: `live-files`
- Public: ✅ Public (如果需要公开访问)
- File size limit: 100 MB

### 5.2 配置 RLS 策略

**recordings bucket**:

```sql
-- 用户可以读取自己录制的文件
CREATE POLICY "Users can read own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 用户可以上传到自己的文件夹
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 用户可以删除自己的录制文件
CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 5.3 LiveKit Egress 输出配置

**选项 1: 直接上传到 Supabase Storage** (推荐)

在 LiveKit Egress 配置中设置：
```typescript
{
  fileOutputs: [{
    fileType: 'MP4',
    s3: {
      endpoint: 'https://xxx.supabase.co/storage/v1/s3',
      bucket: 'recordings',
      accessKey: process.env.SUPABASE_S3_ACCESS_KEY,
      secret: process.env.SUPABASE_S3_SECRET_KEY,
      region: 'auto',
    }
  }]
}
```

**选项 2: 临时存储 → 转移到 Supabase**

1. Egress 输出到临时 S3/R2
2. Webhook 接收到 `egress_ended` 事件
3. 后端下载文件并上传到 Supabase Storage
4. 删除临时文件

---

## 6. 验证部署

### 6.1 检查清单

部署前检查以下项目：

**环境变量** ✅
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `LIVEKIT_URL`
- [ ] `LIVEKIT_API_KEY`
- [ ] `LIVEKIT_API_SECRET`
- [ ] `CRON_SECRET`

**数据库** ✅
- [ ] `webhook_events` 表已创建
- [ ] `live_recordings` 表已创建
- [ ] `live_sessions` 表已创建
- [ ] 所有 RLS 策略已配置

**存储** ✅
- [ ] `recordings` Bucket 已创建
- [ ] RLS 策略已配置
- [ ] 文件上传/下载测试通过

**Webhook** ✅
- [ ] LiveKit Webhook 已配置
- [ ] Webhook URL 可公开访问
- [ ] 测试事件发送成功

**Cron** ✅
- [ ] `vercel.json` 包含 Cron 配置
- [ ] `CRON_SECRET` 已设置
- [ ] Vercel Dashboard 显示 Cron Job

### 6.2 端到端测试

**测试录制流程**:

1. **创建直播会话**
   ```bash
   curl -X POST https://your-domain/api/live-sessions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <user-token>" \
     -d '{"title": "测试直播", "provider": "livekit"}'
   ```

2. **开始录制**
   ```bash
   curl -X POST https://your-domain/api/live-sessions/<session-id>/start-recording \
     -H "Authorization: Bearer <user-token>"
   ```

3. **等待 10 秒**

4. **停止录制**
   ```bash
   curl -X POST https://your-domain/api/live-sessions/<session-id>/stop-recording \
     -H "Authorization: Bearer <user-token>"
   ```

5. **检查 Webhook 是否接收到 `egress_ended` 事件**
   - 查看 Vercel Logs
   - 检查 `webhook_events` 表
   - 检查 `live_recordings` 表

6. **查看录制列表**
   ```bash
   curl https://your-domain/api/live-sessions/<session-id>/recordings \
     -H "Authorization: Bearer <user-token>"
   ```

7. **检查存储配额**
   ```bash
   curl https://your-domain/api/storage/stats \
     -H "Authorization: Bearer <user-token>"
   ```

**测试 Cron 任务**:

```bash
curl -X POST https://your-domain/api/cron/cleanup-recordings \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### 6.3 监控和日志

**Vercel Logs**:
- Dashboard → 项目 → **Deployments** → 选择部署 → **Logs**
- 搜索关键词: `Recording`, `Webhook`, `Cron`

**Supabase Logs**:
- Dashboard → 项目 → **Logs**
- 过滤器: `storage`, `database`

**LiveKit Dashboard**:
- **Rooms** → 查看活跃房间
- **Egress** → 查看录制任务状态
- **Webhooks** → 查看事件发送历史

---

## 🚨 常见问题

### Q1: Webhook 返回 401 Unauthorized
**原因**: 签名验证失败
**解决**:
1. 确认 `LIVEKIT_API_SECRET` 在 Webhook 配置和环境变量中一致
2. 检查 Webhook URL 是否正确
3. 查看 Vercel Logs 中的错误详情

### Q2: Cron Job 未执行
**原因**:
- Vercel Hobby 计划限制
- `CRON_SECRET` 未配置

**解决**:
1. 升级到 Vercel Pro 计划
2. 确认 `CRON_SECRET` 环境变量已设置
3. 检查 `vercel.json` 语法

### Q3: 录制文件上传失败
**原因**: Storage Bucket 权限或配置问题

**解决**:
1. 检查 Bucket 是否存在
2. 验证 RLS 策略
3. 查看 Supabase Storage Logs

### Q4: 配额检查失败
**原因**: `/api/storage/stats` 返回错误

**解决**:
1. 确认 `SUPABASE_SERVICE_ROLE_KEY` 已设置
2. 检查 `live_recordings` 表是否存在
3. 查看 Vercel Function Logs

---

## 📞 支持

遇到问题？
1. 查看 [技术文档](./阶段2-功能完善完成报告-20251123.md)
2. 检查 [项目技术债](./项目技术债.md)
3. 查看 Vercel/Supabase/LiveKit 官方文档

---

**部署完成后，别忘了**:
- ✅ 更新 README 文档
- ✅ 通知团队成员新功能上线
- ✅ 创建用户使用指南
- ✅ 设置监控告警（Sentry 等）

祝部署顺利！🚀
