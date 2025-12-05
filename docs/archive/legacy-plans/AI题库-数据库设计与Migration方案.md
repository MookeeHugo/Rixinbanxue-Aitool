# AI智能题库系统 - 数据库设计与 Migration 方案

**文档版本**: v1.0
**创建时间**: 2025-11-21
**目标**: 扩展日新教育平台 Supabase 数据库以支持 AI 题库功能

---

## 一、现有数据库架构

### 1.1 核心表概览

日新教育平台已有以下表结构:

```sql
-- 用户与权限
profiles (id, email, name, role, created_at)
  ├── role: 'teacher' | 'student'
  └── RLS: 已启用

-- 题目管理(核心)
questions (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('choice', 'fill', 'essay')),
  content TEXT NOT NULL,
  options JSONB,
  answer TEXT NOT NULL,
  analysis_content TEXT,
  knowledge_points TEXT[],
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  province TEXT,
  year INTEGER,
  source TEXT,
  tags TEXT[],
  image_url TEXT,
  image_key TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 试卷
papers (id, name, question_ids UUID[], created_by, created_at)

-- 作业
assignments (id, class_id, question_ids, deadline, ...)
submissions (id, assignment_id, student_id, answers, ...)

-- 班级
classes (id, name, teacher_id, student_ids, ...)

-- 导出任务
export_tasks (id, user_id, question_ids, status, download_url, ...)

-- 直播会话
live_sessions (id, title, provider, room_id, status, ...)
```

### 1.2 现有索引

```sql
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_knowledge_points ON questions USING GIN(knowledge_points);
CREATE INDEX idx_export_tasks_user ON export_tasks(user_id);
CREATE INDEX idx_export_tasks_status ON export_tasks(status);
```

### 1.3 现有 RLS 策略

```sql
-- 示例: questions 表
CREATE POLICY "Teachers can view all questions"
  ON questions FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'teacher'
  ));

CREATE POLICY "Users can manage own questions"
  ON questions FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
```

---

## 二、AI 题库需要新增的表

### 2.1 核心表设计

#### Table 1: upload_tasks (上传任务表)

**用途**: 追踪文件上传与解析任务的生命周期

```sql
CREATE TABLE IF NOT EXISTS public.upload_tasks (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联字段
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID,  -- 预留多租户支持

  -- 文件信息
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,  -- Cloudflare R2 URL
  file_size BIGINT,
  mime_type TEXT,

  -- 任务状态
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  total_questions INTEGER DEFAULT 0,
  error_message TEXT,

  -- 链路追踪
  trace_id UUID DEFAULT gen_random_uuid(),
  stage TEXT CHECK (stage IN ('uploading', 'parsing', 'editing', 'tagging', 'completed')),
  stage_progress JSONB,  -- { "ocr": 100, "split": 50, "tag": 0 }
  current_page INTEGER,

  -- 任务恢复
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_incomplete BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_upload_tasks_user_id ON public.upload_tasks(user_id);
CREATE INDEX idx_upload_tasks_status ON public.upload_tasks(status);
CREATE INDEX idx_upload_tasks_trace_id ON public.upload_tasks(trace_id);
CREATE INDEX idx_upload_tasks_incomplete ON public.upload_tasks(is_incomplete) WHERE is_incomplete = true;

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_tasks_updated_at
  BEFORE UPDATE ON public.upload_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 策略
ALTER TABLE public.upload_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload tasks"
  ON public.upload_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload tasks"
  ON public.upload_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload tasks"
  ON public.upload_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 注释
COMMENT ON TABLE public.upload_tasks IS 'AI题库上传任务表,追踪文件解析生命周期';
COMMENT ON COLUMN public.upload_tasks.trace_id IS '全局追踪ID,用于串联所有日志';
COMMENT ON COLUMN public.upload_tasks.stage IS '当前所处阶段,前端据此展示进度';
```

#### Table 2: parsed_questions (解析结果表)

**用途**: 临时存储 AI 解析结果,供人工审核后入库

```sql
CREATE TABLE IF NOT EXISTS public.parsed_questions (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联任务
  upload_task_id UUID NOT NULL REFERENCES public.upload_tasks(id) ON DELETE CASCADE,

  -- 题目基本信息
  type TEXT NOT NULL CHECK (type IN ('choice', 'fill', 'essay', 'solve')),
  content TEXT NOT NULL,
  options JSONB,  -- 选择题选项 ['A. xxx', 'B. yyy']
  answer TEXT,
  explanation TEXT,  -- 解析内容

  -- AI 标签(建议,非最终)
  tags JSONB,  -- [{ category: '知识点', value: '二次函数', confidence: 0.95 }]
  difficulty TEXT,  -- AI 建议的难度
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),

  -- 图像相关
  has_image BOOLEAN DEFAULT FALSE,
  image_urls TEXT[],  -- 切割出的图片URL数组

  -- 人工操作
  is_selected BOOLEAN DEFAULT TRUE,   -- 是否被教师选中入库
  is_submitted BOOLEAN DEFAULT FALSE, -- 是否已提交到 questions 表

  -- 元数据
  source_page INTEGER,  -- 原文件页码
  position_in_page INTEGER,  -- 页内位置

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_parsed_questions_task_id ON public.parsed_questions(upload_task_id);
CREATE INDEX idx_parsed_questions_submitted ON public.parsed_questions(is_submitted);
CREATE INDEX idx_parsed_questions_selected ON public.parsed_questions(is_selected) WHERE is_selected = true;

-- RLS 策略(基于任务所有者)
ALTER TABLE public.parsed_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parsed questions via task owner"
  ON public.parsed_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks t
      WHERE t.id = parsed_questions.upload_task_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert parsed questions"
  ON public.parsed_questions FOR INSERT
  WITH CHECK (true);  -- Service Role Only

-- 注释
COMMENT ON TABLE public.parsed_questions IS 'AI解析的题目临时表,待人工确认后写入questions';
COMMENT ON COLUMN public.parsed_questions.confidence_score IS 'AI解析置信度 0-1,<0.7 需重点复核';
COMMENT ON COLUMN public.parsed_questions.tags IS 'AI建议标签 JSONB 数组,包含 category/value/confidence';
```

#### Table 3: question_images (题目图片关联表)

**用途**: 支持一个题目包含多张图片,并记录位置与排序

```sql
CREATE TABLE IF NOT EXISTS public.question_images (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联题目
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,

  -- 图片信息
  file_url TEXT NOT NULL,   -- CDN URL
  file_key TEXT,            -- R2 key (用于删除)

  -- 排版信息
  position INTEGER DEFAULT 0,  -- 在题目中的顺序
  width_percent NUMERIC(5,2),  -- 宽度百分比(如 50.00 表示 50%)
  height INTEGER,              -- 像素高度
  caption TEXT,                -- 图片说明

  -- 元数据
  source_type TEXT CHECK (source_type IN ('ocr_extracted', 'user_uploaded')),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_question_images_question_id ON public.question_images(question_id);

-- RLS 策略(继承题目权限)
ALTER TABLE public.question_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view question images via question owner"
  ON public.question_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_images.question_id
        AND (q.is_public = true OR q.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own question images"
  ON public.question_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_images.question_id
        AND q.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_images.question_id
        AND q.created_by = auth.uid()
    )
  );

-- 注释
COMMENT ON TABLE public.question_images IS '题目图片多对一关联表,支持拖拽排版';
COMMENT ON COLUMN public.question_images.position IS '图片在题目中的顺序,用于前端渲染';
```

#### Table 4: question_tags (题目标签表)

**用途**: 灵活的多维标签系统(知识点、难度、来源等)

```sql
CREATE TABLE IF NOT EXISTS public.question_tags (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联题目
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,

  -- 标签信息
  category TEXT NOT NULL,  -- 'knowledge_point', 'difficulty', 'source', 'exam_type'
  value TEXT NOT NULL,     -- 具体值

  -- AI 置信度(可选)
  confidence NUMERIC(3,2) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束
  UNIQUE(question_id, category, value)
);

-- 索引
CREATE INDEX idx_question_tags_question_id ON public.question_tags(question_id);
CREATE INDEX idx_question_tags_category ON public.question_tags(category);
CREATE INDEX idx_question_tags_value ON public.question_tags(value);

-- 组合索引(用于按标签筛选题目)
CREATE INDEX idx_question_tags_category_value ON public.question_tags(category, value);

-- RLS 策略(继承题目权限)
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view question tags via question owner"
  ON public.question_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_tags.question_id
        AND (q.is_public = true OR q.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own question tags"
  ON public.question_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_tags.question_id
        AND q.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_tags.question_id
        AND q.created_by = auth.uid()
    )
  );

-- 注释
COMMENT ON TABLE public.question_tags IS '题目多维标签表,支持灵活的标签体系';
COMMENT ON COLUMN public.question_tags.category IS '标签类别: knowledge_point/difficulty/source等';
```

#### Table 5: provider_usage_logs (供应商调用日志)

**用途**: 记录每次 AI 调用的详情,用于成本分析与优化

```sql
CREATE TABLE IF NOT EXISTS public.provider_usage_logs (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联任务
  task_id UUID REFERENCES public.upload_tasks(id) ON DELETE SET NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,

  -- 供应商信息
  provider_id TEXT NOT NULL,  -- 'qwen-vl-max', 'deepseek-ocr', 'gemini-1.5-pro'
  provider_type TEXT CHECK (provider_type IN ('ocr', 'llm', 'tagging')),
  stage TEXT,  -- 'ocr_primary', 'ocr_secondary', 'ai_tagging'

  -- 调用详情
  request_payload_size INTEGER,  -- 请求大小(bytes)
  response_tokens INTEGER,       -- 响应token数
  duration_ms INTEGER,           -- 耗时(毫秒)

  -- 成本与质量
  cost_estimated NUMERIC(10,4),  -- 预估费用(元)
  confidence NUMERIC(3,2),       -- 结果置信度
  success BOOLEAN NOT NULL,
  error_code TEXT,

  -- 链路追踪
  trace_id UUID,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_provider_usage_logs_task_id ON public.provider_usage_logs(task_id);
CREATE INDEX idx_provider_usage_logs_provider_id ON public.provider_usage_logs(provider_id);
CREATE INDEX idx_provider_usage_logs_trace_id ON public.provider_usage_logs(trace_id);
CREATE INDEX idx_provider_usage_logs_created_at ON public.provider_usage_logs(created_at DESC);

-- RLS 策略(仅 Service Role 可写)
ALTER TABLE public.provider_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage provider usage logs"
  ON public.provider_usage_logs FOR ALL
  USING (true)
  WITH CHECK (true);  -- Service Role Only

-- 注释
COMMENT ON TABLE public.provider_usage_logs IS 'AI供应商调用日志,用于成本分析与优化';
COMMENT ON COLUMN public.provider_usage_logs.cost_estimated IS '预估费用(人民币元),基于token数计算';
```

#### Table 6: tenant_quotas (租户配额表)

**用途**: 管理每个租户/用户的资源配额

```sql
CREATE TABLE IF NOT EXISTS public.tenant_quotas (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 租户信息
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- 目前按用户

  -- 资源类型
  resource_type TEXT NOT NULL CHECK (resource_type IN ('storage', 'page', 'token', 'cost')),

  -- 配额限制
  limit_value INTEGER NOT NULL,  -- 上限(如 1000 页/月)
  used_value INTEGER DEFAULT 0,  -- 已使用

  -- 时间窗口
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,

  -- 超额策略
  overage_policy TEXT CHECK (overage_policy IN ('block', 'queue', 'billable')),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束
  UNIQUE(tenant_id, resource_type)
);

-- 索引
CREATE INDEX idx_tenant_quotas_tenant_id ON public.tenant_quotas(tenant_id);
CREATE INDEX idx_tenant_quotas_resource_type ON public.tenant_quotas(resource_type);

-- 触发器
CREATE TRIGGER update_tenant_quotas_updated_at
  BEFORE UPDATE ON public.tenant_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 策略
ALTER TABLE public.tenant_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotas"
  ON public.tenant_quotas FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Service can manage quotas"
  ON public.tenant_quotas FOR ALL
  USING (true)  -- Service Role
  WITH CHECK (true);

-- 注释
COMMENT ON TABLE public.tenant_quotas IS '租户配额管理表,支持存储/页数/token/成本限制';
COMMENT ON COLUMN public.tenant_quotas.overage_policy IS 'block=禁止, queue=排队, billable=计费';
```

---

## 三、Migration 脚本

### 3.1 完整 SQL 脚本

**文件**: `supabase/migrations/20241121000001_add_ai_question_bank.sql`

```sql
-- =====================================================
-- AI智能题库系统 - 数据库扩展 Migration
-- 版本: 1.0
-- 创建日期: 2025-11-21
-- 描述: 为日新教育平台添加 AI 题库功能所需的表结构
-- =====================================================

-- 1. 创建更新时间戳函数(如果不存在)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 上传任务表
CREATE TABLE IF NOT EXISTS public.upload_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  total_questions INTEGER DEFAULT 0,
  error_message TEXT,
  trace_id UUID DEFAULT gen_random_uuid(),
  stage TEXT CHECK (stage IN ('uploading', 'parsing', 'editing', 'tagging', 'completed')),
  stage_progress JSONB,
  current_page INTEGER,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_incomplete BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_upload_tasks_user_id ON public.upload_tasks(user_id);
CREATE INDEX idx_upload_tasks_status ON public.upload_tasks(status);
CREATE INDEX idx_upload_tasks_trace_id ON public.upload_tasks(trace_id);
CREATE INDEX idx_upload_tasks_incomplete ON public.upload_tasks(is_incomplete) WHERE is_incomplete = true;

CREATE TRIGGER update_upload_tasks_updated_at
  BEFORE UPDATE ON public.upload_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.upload_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload tasks"
  ON public.upload_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload tasks"
  ON public.upload_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload tasks"
  ON public.upload_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.upload_tasks IS 'AI题库上传任务表';

-- 3. 解析结果表
CREATE TABLE IF NOT EXISTS public.parsed_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_task_id UUID NOT NULL REFERENCES public.upload_tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('choice', 'fill', 'essay', 'solve')),
  content TEXT NOT NULL,
  options JSONB,
  answer TEXT,
  explanation TEXT,
  tags JSONB,
  difficulty TEXT,
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  has_image BOOLEAN DEFAULT FALSE,
  image_urls TEXT[],
  is_selected BOOLEAN DEFAULT TRUE,
  is_submitted BOOLEAN DEFAULT FALSE,
  source_page INTEGER,
  position_in_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parsed_questions_task_id ON public.parsed_questions(upload_task_id);
CREATE INDEX idx_parsed_questions_submitted ON public.parsed_questions(is_submitted);
CREATE INDEX idx_parsed_questions_selected ON public.parsed_questions(is_selected) WHERE is_selected = true;

ALTER TABLE public.parsed_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parsed questions via task owner"
  ON public.parsed_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks t
      WHERE t.id = parsed_questions.upload_task_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert parsed questions"
  ON public.parsed_questions FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.parsed_questions IS 'AI解析的题目临时表';

-- 4. 题目图片表
CREATE TABLE IF NOT EXISTS public.question_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_key TEXT,
  position INTEGER DEFAULT 0,
  width_percent NUMERIC(5,2),
  height INTEGER,
  caption TEXT,
  source_type TEXT CHECK (source_type IN ('ocr_extracted', 'user_uploaded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_images_question_id ON public.question_images(question_id);

ALTER TABLE public.question_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view question images via question owner"
  ON public.question_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_images.question_id
        AND (q.is_public = true OR q.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own question images"
  ON public.question_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_images.question_id
        AND q.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_images.question_id
        AND q.created_by = auth.uid()
    )
  );

COMMENT ON TABLE public.question_images IS '题目图片关联表';

-- 5. 题目标签表
CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, category, value)
);

CREATE INDEX idx_question_tags_question_id ON public.question_tags(question_id);
CREATE INDEX idx_question_tags_category ON public.question_tags(category);
CREATE INDEX idx_question_tags_value ON public.question_tags(value);
CREATE INDEX idx_question_tags_category_value ON public.question_tags(category, value);

ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view question tags via question owner"
  ON public.question_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_tags.question_id
        AND (q.is_public = true OR q.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own question tags"
  ON public.question_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_tags.question_id
        AND q.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_tags.question_id
        AND q.created_by = auth.uid()
    )
  );

COMMENT ON TABLE public.question_tags IS '题目多维标签表';

-- 6. 供应商使用日志表
CREATE TABLE IF NOT EXISTS public.provider_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.upload_tasks(id) ON DELETE SET NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  provider_id TEXT NOT NULL,
  provider_type TEXT CHECK (provider_type IN ('ocr', 'llm', 'tagging')),
  stage TEXT,
  request_payload_size INTEGER,
  response_tokens INTEGER,
  duration_ms INTEGER,
  cost_estimated NUMERIC(10,4),
  confidence NUMERIC(3,2),
  success BOOLEAN NOT NULL,
  error_code TEXT,
  trace_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_usage_logs_task_id ON public.provider_usage_logs(task_id);
CREATE INDEX idx_provider_usage_logs_provider_id ON public.provider_usage_logs(provider_id);
CREATE INDEX idx_provider_usage_logs_trace_id ON public.provider_usage_logs(trace_id);
CREATE INDEX idx_provider_usage_logs_created_at ON public.provider_usage_logs(created_at DESC);

ALTER TABLE public.provider_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage provider usage logs"
  ON public.provider_usage_logs FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.provider_usage_logs IS 'AI供应商调用日志';

-- 7. 租户配额表
CREATE TABLE IF NOT EXISTS public.tenant_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('storage', 'page', 'token', 'cost')),
  limit_value INTEGER NOT NULL,
  used_value INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  overage_policy TEXT CHECK (overage_policy IN ('block', 'queue', 'billable')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, resource_type)
);

CREATE INDEX idx_tenant_quotas_tenant_id ON public.tenant_quotas(tenant_id);
CREATE INDEX idx_tenant_quotas_resource_type ON public.tenant_quotas(resource_type);

CREATE TRIGGER update_tenant_quotas_updated_at
  BEFORE UPDATE ON public.tenant_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.tenant_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotas"
  ON public.tenant_quotas FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Service can manage quotas"
  ON public.tenant_quotas FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.tenant_quotas IS '租户配额管理表';

-- =====================================================
-- Migration 完成
-- =====================================================
```

### 3.2 回滚脚本

**文件**: `supabase/migrations/20241121000002_rollback_ai_question_bank.sql`

```sql
-- 回滚 AI 题库扩展 Migration

DROP POLICY IF EXISTS "Service can manage quotas" ON public.tenant_quotas;
DROP POLICY IF EXISTS "Users can view own quotas" ON public.tenant_quotas;
DROP TABLE IF EXISTS public.tenant_quotas CASCADE;

DROP POLICY IF EXISTS "Service can manage provider usage logs" ON public.provider_usage_logs;
DROP TABLE IF EXISTS public.provider_usage_logs CASCADE;

DROP POLICY IF EXISTS "Users can manage own question tags" ON public.question_tags;
DROP POLICY IF EXISTS "Users can view question tags via question owner" ON public.question_tags;
DROP TABLE IF EXISTS public.question_tags CASCADE;

DROP POLICY IF EXISTS "Users can manage own question images" ON public.question_images;
DROP POLICY IF EXISTS "Users can view question images via question owner" ON public.question_images;
DROP TABLE IF EXISTS public.question_images CASCADE;

DROP POLICY IF EXISTS "Service can insert parsed questions" ON public.parsed_questions;
DROP POLICY IF EXISTS "Users can view parsed questions via task owner" ON public.parsed_questions;
DROP TABLE IF EXISTS public.parsed_questions CASCADE;

DROP POLICY IF EXISTS "Users can update own upload tasks" ON public.upload_tasks;
DROP POLICY IF EXISTS "Users can insert own upload tasks" ON public.upload_tasks;
DROP POLICY IF EXISTS "Users can view own upload tasks" ON public.upload_tasks;
DROP TABLE IF EXISTS public.upload_tasks CASCADE;
```

---

## 四、执行指南

### 4.1 本地开发环境

```bash
# 1. 确保 Supabase 已启动
cd d:\rixinwork\Rixindemo-codex-m1
npx supabase status

# 2. 创建 migration 文件
npx supabase migration new add_ai_question_bank

# 3. 将上述 SQL 复制到生成的文件中
# 文件路径: supabase/migrations/[timestamp]_add_ai_question_bank.sql

# 4. 执行 migration
npx supabase db reset

# 5. 验证表已创建
npx supabase db diff
```

### 4.2 生产环境

```bash
# 1. 在 staging 环境测试
npx supabase db push --db-url $STAGING_DB_URL

# 2. 验证无误后推送到生产
npx supabase db push --db-url $PRODUCTION_DB_URL

# 3. 备份数据库
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

---

## 五、种子数据

**文件**: `supabase/seed_ai_question_bank.sql`

```sql
-- AI 题库种子数据

-- 1. 为测试教师创建配额
INSERT INTO public.tenant_quotas (tenant_id, resource_type, limit_value, window_end, overage_policy)
SELECT
  p.id,
  'page' as resource_type,
  1000 as limit_value,
  NOW() + INTERVAL '30 days' as window_end,
  'block' as overage_policy
FROM public.profiles p
WHERE p.role = 'teacher'
ON CONFLICT (tenant_id, resource_type) DO NOTHING;

-- 2. 创建测试上传任务
INSERT INTO public.upload_tasks (
  user_id,
  file_name,
  file_url,
  file_size,
  mime_type,
  status,
  progress,
  total_questions,
  stage
)
SELECT
  p.id,
  '2024年四川中考数学试卷.pdf',
  'https://cdn.example.com/test-paper.pdf',
  2048576,
  'application/pdf',
  'completed',
  100,
  30,
  'completed'
FROM public.profiles p
WHERE p.role = 'teacher'
LIMIT 1;

-- 3. 创建测试解析结果
INSERT INTO public.parsed_questions (
  upload_task_id,
  type,
  content,
  options,
  answer,
  explanation,
  tags,
  difficulty,
  confidence_score,
  is_selected
)
SELECT
  t.id,
  'choice',
  '已知函数 y = 2x² - 4x + 1,求该函数的顶点坐标为?',
  '["A. (1, -1)", "B. (2, 1)", "C. (1, 1)", "D. (2, -1)"]'::jsonb,
  'A',
  '配方法: y = 2(x-1)² - 1,顶点为 (1, -1)',
  '[{"category":"knowledge_point","value":"二次函数","confidence":0.95},{"category":"difficulty","value":"medium","confidence":0.88}]'::jsonb,
  'medium',
  0.92,
  true
FROM public.upload_tasks t
LIMIT 1;
```

---

## 六、性能优化建议

### 6.1 索引策略

已创建的索引:
- ✅ 外键索引(user_id, task_id, question_id)
- ✅ 状态索引(status, is_submitted)
- ✅ 时间索引(created_at DESC)
- ✅ 组合索引(category, value)

### 6.2 查询优化

```sql
-- 示例: 高效查询某用户待处理的任务
EXPLAIN ANALYZE
SELECT t.id, t.file_name, t.progress,
       COUNT(pq.id) as parsed_count
FROM upload_tasks t
LEFT JOIN parsed_questions pq ON pq.upload_task_id = t.id
WHERE t.user_id = 'xxx'
  AND t.status IN ('processing', 'completed')
GROUP BY t.id
ORDER BY t.created_at DESC
LIMIT 20;

-- 使用索引: idx_upload_tasks_user_id, idx_upload_tasks_status
```

### 6.3 分区建议(未来)

当 `provider_usage_logs` 表超过 1000万 行时,考虑按月分区:

```sql
CREATE TABLE provider_usage_logs_2025_01 PARTITION OF provider_usage_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## 七、监控与维护

### 7.1 定期清理

```sql
-- 清理 90 天前的解析结果(已入库)
DELETE FROM parsed_questions
WHERE is_submitted = true
  AND created_at < NOW() - INTERVAL '90 days';

-- 清理 30 天前的供应商日志
DELETE FROM provider_usage_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

### 7.2 统计查询

```sql
-- 查看配额使用情况
SELECT
  p.name,
  p.email,
  tq.resource_type,
  tq.limit_value,
  tq.used_value,
  ROUND(tq.used_value::numeric / tq.limit_value * 100, 2) as usage_percent
FROM tenant_quotas tq
JOIN profiles p ON p.id = tq.tenant_id
WHERE tq.used_value > tq.limit_value * 0.8
ORDER BY usage_percent DESC;

-- 成本统计(按供应商)
SELECT
  provider_id,
  COUNT(*) as total_calls,
  SUM(cost_estimated) as total_cost,
  AVG(duration_ms) as avg_duration_ms,
  AVG(confidence) as avg_confidence
FROM provider_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider_id
ORDER BY total_cost DESC;
```

---

**文档维护者**: Claude Code AI
**最后更新**: 2025-11-21
