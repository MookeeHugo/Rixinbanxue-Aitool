# AI题库MVP - Day 0 准备清单

> **状态**: 开发前准备阶段
> **预计时间**: 2-4小时
> **最后更新**: 2025-01-24

---

## 📋 清单概览

本清单确保您在开始Day 1开发前，所有依赖项、账号、环境变量都已就绪。

**完成标准**：所有 ✅ 勾选完成，`npm run dev` 正常启动，数据库连接成功。

---

## 1️⃣ 阿里云DashScope API（Qwen3-VL-Flash）

### 注册账号

- [ ] 访问 [阿里云DashScope](https://dashscope.aliyun.com/)
- [ ] 使用阿里云账号登录（或注册新账号）
- [ ] 实名认证（必须，否则无法调用API）

### 开通服务

- [ ] 进入 [DashScope控制台](https://dashscope.console.aliyun.com/)
- [ ] 开通"通义千问-VL"服务
- [ ] 选择"按量付费"模式（无需预付费）

### 获取API Key

- [ ] 在控制台左侧菜单找到"API-KEY管理"
- [ ] 点击"创建新的API-KEY"
- [ ] 复制生成的API Key（格式：`sk-xxxxxxxxxxxxxxxx`）
- [ ] ⚠️ **妥善保存**，不要泄露到公共代码仓库

### 测试连通性

```bash
# 使用curl测试（替换YOUR_API_KEY）
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-vl-flash",
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "你好"}]}
    ]
  }'
```

**预期响应**：返回JSON，包含`choices`字段

### 成本设置（可选）

- [ ] 在控制台设置每日/每月消费上限（推荐：¥50/月）
- [ ] 配置余额不足时的告警通知

**参考文档**: [Qwen3-VL-Flash API文档](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl-plus-api)

---

## 2️⃣ Inngest（异步任务处理）

### 注册账号

- [ ] 访问 [Inngest官网](https://www.inngest.com/)
- [ ] 点击"Sign Up"注册账号（支持GitHub登录）
- [ ] 选择"Free"免费计划（10万步骤/月，足够MVP使用）

### 创建App

- [ ] 登录后进入Dashboard
- [ ] 点击"Create App"
- [ ] 输入App名称：`rixin-ai-question-bank`
- [ ] 记录App ID（自动生成）

### 获取API密钥

- [ ] 在Dashboard左侧菜单选择"Settings" → "Keys"
- [ ] 复制以下两个密钥：
  - [ ] **Event Key**（用于发送事件）
  - [ ] **Signing Key**（用于验证webhook）

### 本地开发配置

- [ ] 安装Inngest CLI（本地开发必须）

```bash
npm install -g inngest-cli@latest
# 或
npx inngest-cli@latest --version  # 验证安装
```

**参考文档**: [Inngest快速开始](https://www.inngest.com/docs/quick-start)

---

## 3️⃣ 环境变量配置

### 创建 `.env.local` 文件

在项目根目录创建（如果已存在则添加以下内容）：

```bash
# ============================================
# AI题库系统 - 环境变量配置
# ============================================

# 1. Qwen API（阿里云DashScope）
QWEN_API_KEY=sk-xxxxxxxxxxxxxxxx  # 替换为您的API Key

# 2. Inngest（可选，本地开发时不需要）
# INNGEST_EVENT_KEY=your_event_key
# INNGEST_SIGNING_KEY=your_signing_key

# 3. Supabase（已有配置，无需修改）
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# 4. Cloudflare R2（已有配置，无需修改）
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_BUCKET_NAME=...
# R2_ENDPOINT=...
# R2_PUBLIC_DOMAIN=...
```

### 验证环境变量

- [ ] 确认`.env.local`文件存在
- [ ] 确认`QWEN_API_KEY`已填写
- [ ] 确认`.env.local`已添加到`.gitignore`（避免泄露）

```bash
# 验证是否在.gitignore中
grep ".env.local" .gitignore
```

---

## 4️⃣ 依赖安装

### 安装Inngest SDK

```bash
npm install inngest
```

### 验证依赖

- [ ] 确认`package.json`中包含：

```json
{
  "dependencies": {
    "inngest": "^3.x.x",
    "zod": "^3.x.x",
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

- [ ] 运行安装检查

```bash
npm install
npm list inngest
```

---

## 5️⃣ 数据库初始化

### 应用Migration

- [ ] 确认Supabase本地环境正在运行

```bash
npx supabase status
```

- [ ] 应用新的migration

```bash
npx supabase db reset
```

### 验证表结构

- [ ] 检查表是否创建成功

```bash
npx supabase db dump --schema public --table upload_tasks
npx supabase db dump --schema public --table parsed_questions
```

- [ ] 或在Supabase Studio查看：`http://localhost:54323`

### 测试RLS策略

- [ ] 使用测试账号登录
- [ ] 在Supabase Studio的Table Editor中尝试插入数据
- [ ] 确认只能看到自己的数据

---

## 6️⃣ 开发工具配置

### VSCode插件（推荐）

- [ ] 安装 **Supabase** 插件（数据库管理）
- [ ] 安装 **Inngest** 插件（任务监控）
- [ ] 安装 **ESLint** 和 **Prettier**（代码格式化）

### 启动Inngest Dev Server

```bash
npx inngest-cli@latest dev
```

- [ ] 访问 `http://localhost:8288`
- [ ] 确认Inngest Dashboard正常显示

---

## 7️⃣ 测试图片准备

### 准备测试数据

- [ ] 创建`tests/fixtures/`目录

```bash
mkdir -p tests/fixtures
```

- [ ] 准备以下测试文件：
  - [ ] `sample-math-1.jpg` - 包含1-3道数学题的清晰图片
  - [ ] `sample-math-5.jpg` - 包含5道题的图片
  - [ ] `sample-low-quality.jpg` - 低清晰度图片（测试置信度）

### 测试图片要求

- **格式**: JPG/PNG
- **大小**: < 5MB
- **分辨率**: 最低1000x1000px
- **内容**: 初中数学题（清晰印刷体）

---

## 8️⃣ 项目结构验证

### 确认关键文件存在

- [ ] `src/lib/ai-question-bank/index.ts` - 统一导出
- [ ] `src/lib/ai-question-bank/qwen-flash.ts` - Qwen客户端
- [ ] `src/app/actions/question-upload.ts` - Server Actions
- [ ] `src/app/api/inngest/route.ts` - Inngest API路由
- [ ] `inngest/client.ts` - Inngest客户端
- [ ] `inngest/functions/process-pdf-upload.ts` - Worker函数
- [ ] `supabase/migrations/20241124000001_ai_question_bank_mvp_v2.sql` - 数据库Schema

### 确认目录结构

```
d:\rixinwork\Rixindemo-codex-m1\
├── src/
│   ├── lib/ai-question-bank/      ✅
│   ├── app/actions/                ✅
│   └── app/api/inngest/            ✅
├── inngest/                        ✅
├── supabase/migrations/            ✅
├── tests/fixtures/                 ✅
└── .env.local                      ✅
```

---

## 9️⃣ 快速测试脚本

### 创建测试脚本

创建 `scripts/test-qwen-api.mjs`：

```javascript
import 'dotenv/config';

async function testQwenAPI() {
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    console.error('❌ 缺少QWEN_API_KEY环境变量');
    process.exit(1);
  }

  console.log('🧪 测试Qwen API连通性...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen3-vl-flash',
      messages: [
        { role: 'user', content: [{ type: 'text', text: '你好' }] }
      ]
    })
  });

  if (response.ok) {
    console.log('✅ Qwen API连接成功！');
    const data = await response.json();
    console.log('📝 响应:', data.choices[0].message.content);
  } else {
    console.error('❌ Qwen API连接失败');
    console.error('状态码:', response.status);
    console.error('错误:', await response.text());
  }
}

testQwenAPI();
```

### 运行测试

```bash
node scripts/test-qwen-api.mjs
```

**预期输出**：✅ Qwen API连接成功！

---

## 🔟 最终验证清单

### 启动完整开发环境

```bash
# 终端1: 启动Next.js
npm run dev

# 终端2: 启动Supabase（如果使用本地）
npx supabase start

# 终端3: 启动Inngest Dev Server
npx inngest-cli dev
```

### 验证所有服务

- [ ] Next.js: `http://localhost:3000` - 正常访问
- [ ] Supabase Studio: `http://localhost:54323` - 正常访问
- [ ] Inngest Dashboard: `http://localhost:8288` - 正常访问
- [ ] API路由: `http://localhost:3000/api/inngest` - 返回Inngest元数据

### 验证核心功能

- [ ] 访问 `/tools/ingest` 路由（暂无UI，404正常）
- [ ] 在浏览器控制台运行：

```javascript
// 测试Server Action（需要登录）
fetch('/api/inngest', { method: 'GET' })
  .then(r => r.text())
  .then(console.log);
```

**预期**: 返回Inngest的配置信息

---

## ✅ 完成确认

### Day 0完成标志

- [x] 所有清单项目已勾选
- [x] Qwen API测试成功
- [x] Inngest Dev Server正常运行
- [x] 数据库表结构正确
- [x] 测试图片已准备
- [x] 环境变量配置完成

### 下一步

🎉 **恭喜！Day 0准备工作已完成，可以开始Day 1开发！**

请参考：
- [AI题库MVP最终确认方案.md](./AI题库MVP最终确认方案.md) - 完整开发计划
- [MVP快速开始指南-3周冲刺版.md](./MVP快速开始指南-3周冲刺版.md) - 详细执行手册

---

## 📞 常见问题

### Q1: Qwen API Key无效？

**解决**：
1. 确认已完成实名认证
2. 确认API Key格式正确（以`sk-`开头）
3. 检查账户余额是否充足
4. 在阿里云控制台重新生成API Key

### Q2: Inngest Dev Server无法启动？

**解决**：
1. 检查端口8288是否被占用
2. 重新安装Inngest CLI: `npm install -g inngest-cli@latest`
3. 使用`npx`运行: `npx inngest-cli@latest dev`

### Q3: 数据库Migration失败？

**解决**：
1. 检查Supabase是否正常运行: `npx supabase status`
2. 重置数据库: `npx supabase db reset`
3. 查看Migration日志: `npx supabase db dump`

### Q4: 测试图片在哪里获取？

**建议**：
1. 使用手机拍摄教材中的数学题
2. 确保光线充足，文字清晰
3. 避免反光和阴影
4. 或从网上下载数学试卷PDF，截图保存

---

## 📊 成本预估（Day 0）

| 项目 | 费用 |
|------|------|
| 阿里云DashScope | ¥0（测试调用<10次） |
| Inngest | ¥0（免费计划） |
| Supabase | ¥0（本地开发） |
| Cloudflare R2 | ¥0（现有配置） |
| **总计** | **¥0** |

---

**最后更新**: 2025-01-24
**下一步**: [Day 1 - 数据库设计](./AI题库MVP最终确认方案.md#week-1-核心通路基础设施)
