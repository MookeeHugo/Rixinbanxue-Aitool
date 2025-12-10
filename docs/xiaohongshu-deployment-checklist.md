# 小红书AI运营系统 - 生产部署检查清单

## 📋 部署前准备

### ✅ 环境变量配置

在生产环境中配置以下环境变量：

```bash
# ============================================================================
# 必需的环境变量（缺少会导致系统无法运行）
# ============================================================================

# Gemini API配置
GEMINI_API_KEY=sk-xxxxx                              # 必需
GEMINI_BASE_URL=https://api.ikuncode.cc             # 可选（默认官方URL）
GEMINI_MODEL=gemini-2.5-flash                       # 可选（默认2.0-flash-exp）
GEMINI_REQUEST_TIMEOUT=120000                       # 可选（默认120秒）

# DeepSeek API配置
DEEPSEEK_API_KEY=sk-xxxxx                           # 必需
DEEPSEEK_BASE_URL=https://api.deepseek.com          # 可选
DEEPSEEK_MODEL=deepseek-chat                        # 可选
DEEPSEEK_REQUEST_TIMEOUT=60000                      # 可选

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co    # 必需
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx                # 必需
SUPABASE_SERVICE_ROLE_KEY=eyJxxx                    # 必需（用于管理操作）

# ============================================================================
# 可选的环境变量
# ============================================================================

# 测试模式（生产环境应设为false）
NEXT_PUBLIC_XHS_MOCK_MODE=false                     # 默认false

# 代理配置（如需要）
PROXY_POOL_URL=https://api.proxy-provider.com/get
PROXY_ROTATION_ENABLED=false                        # 默认false

# 日志级别
LOG_LEVEL=info                                      # debug/info/warn/error
```

### ✅ 数据库迁移

确保所有数据库迁移已应用：

```bash
# 1. 连接到生产数据库
pnpm supabase link --project-ref your-project-ref

# 2. 检查待应用的迁移
pnpm supabase db diff

# 3. 应用迁移
pnpm supabase db push

# 4. 验证表结构
pnpm supabase db status
```

**必需的表**：
- [x] `xhs_raw_posts` - 原始帖子表
- [x] `xhs_ai_drafts` - AI草稿表
- [x] `xhs_crawl_quotas` - 配额管理表
- [x] `xhs_crawl_logs` - 爬虫日志表（Phase 2）

### ✅ RLS策略验证

在Supabase Studio中验证RLS策略：

```sql
-- 检查RLS是否启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'xhs_%';

-- 预期结果：所有表的rowsecurity都应为true
```

**验证步骤**：
1. 创建测试用户A和B
2. 用户A创建数据
3. 用户B尝试查询用户A的数据（应失败）
4. 用户A查询自己的数据（应成功）

---

## 🔒 安全检查

### ✅ API密钥安全

**检查项**：
- [ ] 所有API密钥已从代码中移除（仅存在于环境变量）
- [ ] `.env.local` 已添加到 `.gitignore`
- [ ] 生产API密钥与开发API密钥不同
- [ ] API密钥已设置支出限制（避免滥用）

**Gemini API安全**：
```bash
# 访问 Google Cloud Console
# 1. 设置每日配额限制：$5/day
# 2. 启用API使用监控
# 3. 设置告警：当使用量 > 80%时发送邮件
```

**DeepSeek API安全**：
```bash
# 访问 DeepSeek 控制台
# 1. 设置账户余额告警
# 2. 限制每日调用次数
```

### ✅ 数据库安全

**检查项**：
- [ ] RLS策略已启用
- [ ] Service Role Key仅在后端使用
- [ ] Anon Key在前端使用（受RLS保护）
- [ ] 数据库备份已配置（每日自动备份）

**Supabase安全设置**：
```sql
-- 检查敏感操作的权限
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public';

-- 预期：所有表的owner应为postgres，非普通用户
```

### ✅ CORS配置

如果使用API路由，确保CORS配置正确：

```typescript
// src/middleware.ts 或 next.config.mjs
export const config = {
  headers: [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
      ],
    },
  ],
};
```

---

## 🚀 性能优化

### ✅ Next.js构建优化

```bash
# 1. 检查构建输出大小
pnpm build

# 预期：
# - First Load JS < 200 KB
# - 所有页面 < 100 KB
```

**优化建议**：
```typescript
// next.config.mjs
export default {
  // 启用SWC压缩
  swcMinify: true,

  // 启用图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // 减少包大小
  experimental: {
    optimizePackageImports: ['@/components/ui'],
  },
};
```

### ✅ 数据库索引

确保关键查询有索引：

```sql
-- 检查现有索引
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'xhs_%';

-- 必需的索引：
-- 1. xhs_raw_posts: (crawl_keyword, likes DESC)
-- 2. xhs_ai_drafts: (original_post_id)
-- 3. xhs_crawl_quotas: (user_id, created_at DESC)
```

### ✅ 缓存策略

**静态资源缓存**：
```typescript
// next.config.mjs
export default {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};
```

**数据缓存**（可选）：
```typescript
// src/lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function getCachedAnalysis(postId: string) {
  return await redis.get(`analysis:${postId}`);
}
```

---

## 📊 监控和告警

### ✅ Vercel Analytics

如果部署到Vercel，启用Analytics：

```bash
# 1. 在Vercel Dashboard中启用Analytics
# 2. 安装依赖
pnpm add @vercel/analytics

# 3. 在 src/app/layout.tsx 中添加
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### ✅ 错误追踪

**方案1：Sentry（推荐）**

```bash
# 安装Sentry
pnpm add @sentry/nextjs

# 运行配置向导
pnpm sentry:init

# 在 .env.local 添加
SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/123456
SENTRY_AUTH_TOKEN=sntrys_xxx
```

**方案2：自定义日志**

```typescript
// src/lib/logger.ts
export function logError(error: Error, context?: Record<string, any>) {
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });

  // 发送到日志服务（如Logtail、Datadog）
  if (process.env.LOGTAIL_SOURCE_TOKEN) {
    fetch('https://in.logtail.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LOGTAIL_SOURCE_TOKEN}`,
      },
      body: JSON.stringify({
        level: 'error',
        message: error.message,
        context,
      }),
    });
  }
}
```

### ✅ 性能监控

**关键指标**：
- [ ] API响应时间 < 200ms
- [ ] 爬虫成功率 > 95%
- [ ] AI分析成功率 > 98%
- [ ] 原创性检测通过率 > 80%

**监控SQL**：
```sql
-- 每日统计
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_crawls,
  COUNT(*) FILTER (WHERE ai_analysis IS NOT NULL) as analyzed,
  AVG(analysis_tokens_used) as avg_tokens,
  SUM(analysis_cost_usd) as total_cost
FROM xhs_raw_posts
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🧪 生产环境测试

### ✅ 冒烟测试清单

部署后立即执行以下测试：

1. **用户认证**
   - [ ] 注册新用户
   - [ ] 登录
   - [ ] 登出

2. **爬虫功能**
   - [ ] 爬取测试（模拟模式）
   - [ ] 数据保存到数据库
   - [ ] 配额扣除正确

3. **AI分析**
   - [ ] 选择帖子点击"AI分析"
   - [ ] 等待完成（< 15秒）
   - [ ] 检查分析结果保存

4. **内容生成**
   - [ ] 选择人设生成草稿
   - [ ] 等待完成（< 30秒）
   - [ ] 检查原创性检测结果

5. **复制功能**
   - [ ] 复制标题
   - [ ] 复制正文
   - [ ] 复制标签
   - [ ] 一键复制全部

### ✅ 压力测试

**并发用户测试**：
```bash
# 使用 k6 或 Artillery 进行负载测试
pnpm add -D artillery

# artillery.yml
config:
  target: 'https://yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10  # 10用户/秒

scenarios:
  - name: "爬虫workflow"
    flow:
      - post:
          url: "/api/xiaohongshu/crawl"
          json:
            keyword: "数学教学"
            minLikes: 1000
```

**数据库连接池测试**：
```sql
-- 检查连接池状态
SELECT
  count(*) as active_connections,
  max_val as max_connections
FROM pg_stat_activity, pg_settings
WHERE name = 'max_connections';

-- 预期：active < max * 0.7（不超过70%）
```

---

## 📦 部署流程

### ✅ Vercel部署（推荐）

**步骤**：
1. 连接GitHub仓库到Vercel
2. 配置环境变量（上述所有变量）
3. 设置构建命令：`pnpm build`
4. 设置输出目录：`.next`
5. 部署

**验证**：
```bash
# 检查部署状态
curl https://yourdomain.com/api/health

# 预期返回：
{
  "status": "ok",
  "timestamp": "2025-12-10T12:00:00Z",
  "database": "connected",
  "apis": {
    "gemini": "ok",
    "deepseek": "ok"
  }
}
```

### ✅ Railway部署（备选）

**步骤**：
1. 创建Railway项目
2. 连接GitHub仓库
3. 配置环境变量
4. 设置构建命令：`pnpm build && pnpm start`
5. 部署

### ✅ 自托管部署

**Docker方案**：
```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 生产运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**部署命令**：
```bash
# 构建镜像
docker build -t xiaohongshu-ai .

# 运行容器
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=xxx \
  -e DEEPSEEK_API_KEY=xxx \
  -e NEXT_PUBLIC_SUPABASE_URL=xxx \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx \
  xiaohongshu-ai
```

---

## 🔄 备份和恢复

### ✅ 数据库备份

**自动备份（Supabase自带）**：
- 每日自动备份（保留7天）
- 手动备份可保留永久

**手动备份**：
```bash
# 导出数据库
pnpm supabase db dump -f backup.sql

# 仅导出特定表
pnpm supabase db dump \
  --data-only \
  --schema public \
  --table xhs_raw_posts \
  --table xhs_ai_drafts \
  -f xiaohongshu-backup.sql
```

**恢复数据**：
```bash
# 从备份恢复
pnpm supabase db reset
pnpm supabase db push
psql postgresql://postgres:password@db.xxx.supabase.co:5432/postgres < backup.sql
```

### ✅ 配置备份

**导出环境变量**：
```bash
# 创建 .env.production.example（移除敏感值）
cat .env.local | sed 's/=.*/=YOUR_VALUE_HERE/' > .env.production.example
```

**导出配额设置**：
```sql
-- 导出当前配额配置
COPY (
  SELECT
    daily_crawl_limit,
    hourly_crawl_limit,
    daily_generate_limit
  FROM xhs_crawl_quotas
  LIMIT 1
) TO '/tmp/quota-config.csv' CSV HEADER;
```

---

## 🚨 回滚计划

如果部署后出现严重问题：

### ✅ Vercel回滚

```bash
# 1. 在Vercel Dashboard找到上一个稳定版本
# 2. 点击"Promote to Production"
# 3. 验证回滚成功
```

### ✅ 数据库回滚

```bash
# 1. 停止应用（避免写入）
# 2. 恢复备份
pnpm supabase db reset
psql ... < backup-before-deployment.sql

# 3. 验证数据完整性
SELECT COUNT(*) FROM xhs_raw_posts;

# 4. 重启应用
```

### ✅ 紧急联系方式

**记录以下信息**：
- Vercel项目URL
- Supabase项目ID
- 备份文件位置
- 紧急联系人（开发者、运维）

---

## ✅ 部署后验证

### 最终检查清单

**功能验证**：
- [ ] 所有页面正常访问
- [ ] 爬虫功能正常
- [ ] AI分析正常
- [ ] 内容生成正常
- [ ] 配额系统正常

**性能验证**：
- [ ] 首页加载 < 2秒
- [ ] API响应 < 500ms
- [ ] 数据库查询 < 100ms

**安全验证**：
- [ ] HTTPS启用
- [ ] RLS策略生效
- [ ] API密钥不泄露
- [ ] 错误信息不暴露敏感数据

**监控验证**：
- [ ] Analytics正常记录
- [ ] 错误追踪正常工作
- [ ] 日志正常收集

---

## 📝 部署记录模板

```markdown
# 部署记录 - 2025-12-XX

## 基本信息
- **部署时间**：2025-12-XX 14:00:00
- **部署人员**：[姓名]
- **部署版本**：v1.0.0
- **部署平台**：Vercel / Railway / 自托管

## 部署前检查
- [x] 所有测试通过
- [x] 环境变量已配置
- [x] 数据库已备份
- [x] 依赖已更新

## 部署过程
1. 14:00 - 触发部署
2. 14:05 - 构建完成
3. 14:10 - 部署成功
4. 14:15 - 冒烟测试通过

## 遇到的问题
- 无

## 回滚准备
- 上一个稳定版本：v0.9.5
- 备份文件：backup-20251210-1400.sql
- 回滚指令：vercel rollback xxx

## 验证结果
- ✅ 功能验证通过
- ✅ 性能验证通过
- ✅ 安全验证通过
- ✅ 监控验证通过

## 备注
无

---
部署人签名：___________
日期：2025-12-XX
```

---

**文档版本**：v1.0
**最后更新**：2025-12-10
**适用版本**：MVP v1.0 及以上
