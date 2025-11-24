# AI题库系统 - 关键修正补充说明

**版本**: v1.1
**日期**: 2025-11-21
**目的**: 修正原方案中的技术错误和增加独立开发者友好方案

---

## 🔧 必须修正的技术问题

### 1. tenant_id 字段修正

**问题位置**: 数据库设计文档

```sql
-- ❌ 错误 (允许NULL会导致RLS失效)
tenant_id UUID,

-- ✅ 正确 (MVP阶段直接使用user_id即可)
-- 方案A: 设置默认值
tenant_id UUID NOT NULL DEFAULT auth.uid(),

-- 方案B: 简化设计(推荐)
-- 直接删除tenant_id字段,使用user_id
-- RLS策略改为: auth.uid() = user_id
```

---

### 2. 批量入库事务保护

**问题位置**: BFF API设计文档

```sql
-- 创建原子化函数
CREATE OR REPLACE FUNCTION batch_submit_questions(
  p_task_id UUID,
  p_question_ids UUID[],
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 事务自动包装
  WITH inserted AS (
    INSERT INTO questions (type, content, answer, created_by)
    SELECT type, content, answer, p_user_id
    FROM parsed_questions
    WHERE id = ANY(p_question_ids)
      AND upload_task_id = p_task_id
      AND is_submitted = false
    RETURNING id
  ),
  updated AS (
    UPDATE parsed_questions
    SET is_submitted = true
    WHERE id = ANY(p_question_ids)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'inserted', (SELECT count(*) FROM inserted),
    'updated', (SELECT count(*) FROM updated)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. Service Role 权限使用

**问题位置**: BFF API设计 - 配额管理

```typescript
// ❌ 错误 - 用户态客户端无法访问配额表
const supabase = createClient()

// ✅ 正确 - 使用Admin客户端
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ 关键
  )
}

// 使用
const supabase = createAdminClient()
const quota = await supabase.from('tenant_quotas').select('*')
```

---

### 4. parsed_questions 审核字段补充

```sql
ALTER TABLE parsed_questions
ADD COLUMN review_status TEXT DEFAULT 'pending',
ADD COLUMN reviewed_by UUID REFERENCES profiles(id),
ADD COLUMN reviewed_at TIMESTAMPTZ,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN submitted_question_id UUID REFERENCES questions(id);

-- 触发器
CREATE TRIGGER update_parsed_questions_updated_at
  BEFORE UPDATE ON parsed_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 💡 独立开发者简化方案

### 方案1: MVP数据库(仅2个核心表)

```sql
-- Week 1 最小实现
CREATE TABLE upload_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parsed_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_task_id UUID REFERENCES upload_tasks(id),
  content TEXT,
  answer TEXT,
  tags JSONB,  -- 暂存所有数据,避免建多表
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**后续按需添加**:
- Week 2: `provider_usage_logs` (成本追踪)
- Week 3: `tenant_quotas` (配额管理)

---

### 方案2: 前端移植(不降级)

```bash
# ❌ 不要做: 降级 Next 16 → Next 14 (会遇到大量兼容性问题)

# ✅ 正确做法: 在主平台新建路由
cd d:\rixinwork\Rixindemo-codex-m1
mkdir -p src/app/tools/ingest

# 让 Cursor 逐个移植组件:
# "请将这个v0组件移植到Next 14,替换React 19语法"
```

---

### 方案3: Inngest替代Redis

```bash
npm install inngest

# 配置非常简单
```

```typescript
// inngest/functions/parse.ts
import { inngest } from '../client'

export const parsePdf = inngest.createFunction(
  { id: 'parse-pdf' },
  { event: 'pdf.uploaded' },
  async ({ event }) => {
    const { taskId } = event.data

    // 1. 下载文件
    const file = await downloadFromR2(...)

    // 2. 调用 Qwen-VL
    const result = await parseWithQwen(file)

    // 3. 保存结果
    await saveToDatabase(taskId, result)
  }
)

// 触发
await inngest.send({
  name: 'pdf.uploaded',
  data: { taskId: 'xxx' }
})
```

**优势**:
- 无需维护Redis
- 自动重试
- 可视化Dashboard

---

### 方案4: 硬编码Provider(MVP)

```typescript
// ❌ 不要做: Provider Factory + 动态配置 (太复杂)

// ✅ 简单做法: 直接写死Qwen-VL
export async function parseDocument(file: Buffer) {
  return await axios.post(
    'https://dashscope.aliyuncs.com/api/v1/...',
    {
      model: 'qwen-vl-max',
      input: { /* ... */ }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`
      }
    }
  )
}

// 等有1000+用户再做动态切换
```

---

## 📊 成本优化

### 原方案 vs 优化方案

| 项目 | 原方案 | 优化后 | 节省 |
|------|--------|--------|------|
| **开发时间** | 8-10周 | 3周 | **70%** |
| **数据库表** | 6个 | 2个(MVP) | **67%** |
| **依赖服务** | Redis+BullMQ | Inngest | **免费** |
| **AI成本/千题** | ¥42 | ¥12-18 | **57%** |
| **月运营成本** | ¥1,080 | ¥100 | **91%** |

---

## 🎯 3周冲刺计划

### Week 1: 核心功能
- Day 1-2: 建2个表,创建路由
- Day 3-5: 移植前端组件
- Day 6-7: 实现上传API
- **交付**: 可上传文件

### Week 2: AI解析
- Day 8-9: 集成Inngest
- Day 10-12: 对接Qwen-VL
- Day 13-14: 前端轮询显示
- **交付**: 自动解析题目

### Week 3: 入库
- Day 15-17: 完善编辑器
- Day 18-19: 批量入库(带事务)
- Day 20-21: 测试优化
- **交付**: 完整闭环

---

## ✅ 修订清单

| 文档 | 修正点 | 优先级 |
|------|--------|--------|
| 数据库设计 | tenant_id NOT NULL | 🔴 高 |
| 数据库设计 | 审核字段补充 | 🟡 中 |
| BFF API | 批量入库事务 | 🔴 高 |
| BFF API | Service Role权限 | 🔴 高 |
| 实施路线 | 3周冲刺方案 | 🟢 建议 |
| 可行性报告 | 成本计算修正 | 🟡 中 |

---

## 📖 使用指南

**独立开发者**: 请按照"3周冲刺计划"执行,忽略原文档中Week 9-10的内容

**团队开发**: 保留完整方案,但必须应用"必须修正的技术问题"部分

---

**维护**: Claude Code AI
**更新**: 2025-11-21
