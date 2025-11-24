-- ============================================================================
-- AI Question Bank MVP v2 - Database Schema Update
-- ============================================================================
-- 基于最终确认方案 (AI题库MVP最终确认方案.md)
--
-- 主要变更：
-- 1. 简化parsed_questions表，移除复杂的review流程
-- 2. 优化字段以匹配Qwen3-VL-Flash输出格式
-- 3. 更新batch_submit_questions函数，使用is_selected标记
-- 4. 调整字段名称以匹配TypeScript类型定义
-- ============================================================================

-- 如果旧表存在，先删除（仅开发环境，生产环境需要数据迁移）
DROP TABLE IF EXISTS public.parsed_questions CASCADE;
DROP TABLE IF EXISTS public.upload_tasks CASCADE;
DROP FUNCTION IF EXISTS batch_submit_questions CASCADE;
DROP FUNCTION IF EXISTS get_upload_task_stats CASCADE;

-- ----------------------------------------------------------------------------
-- Table 1: upload_tasks (任务管理)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upload_tasks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User context
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,  -- R2存储路径

  -- Task status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_questions INTEGER,  -- 解析出的题目总数

  -- Error handling
  error_message TEXT,

  -- Traceability
  trace_id UUID DEFAULT gen_random_uuid() UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_upload_tasks_user_id ON public.upload_tasks(user_id);
CREATE INDEX idx_upload_tasks_status ON public.upload_tasks(status);
CREATE INDEX idx_upload_tasks_created_at ON public.upload_tasks(created_at DESC);
CREATE INDEX idx_upload_tasks_trace_id ON public.upload_tasks(trace_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_tasks_timestamp
  BEFORE UPDATE ON public.upload_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- RLS Policies
ALTER TABLE public.upload_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload tasks"
  ON public.upload_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create upload tasks"
  ON public.upload_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload tasks"
  ON public.upload_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upload tasks"
  ON public.upload_tasks FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.upload_tasks IS 'MVP v2: 任务管理表（简化版）';

-- ----------------------------------------------------------------------------
-- Table 2: parsed_questions (解析结果)
-- 字段名称匹配TypeScript类型定义 (types.ts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parsed_questions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to upload task
  upload_task_id UUID NOT NULL REFERENCES public.upload_tasks(id) ON DELETE CASCADE,

  -- Question content (匹配Qwen3-VL-Flash输出格式)
  type TEXT NOT NULL CHECK (type IN ('choice', 'fill', 'essay', 'proof')),
  content TEXT NOT NULL,  -- 题目内容（LaTeX格式）
  options JSONB,  -- 选项数组 (仅选择题)
  answer TEXT NOT NULL,  -- 答案

  -- AI生成的标签 (JSONB格式)
  tags JSONB,  -- { knowledge: [], difficulty: 'medium', type: '选择题' }

  -- AI置信度
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- 用户操作标记
  is_selected BOOLEAN NOT NULL DEFAULT TRUE,  -- 是否选中（用于批量提交）
  is_submitted BOOLEAN NOT NULL DEFAULT FALSE,  -- 是否已提交

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_parsed_questions_upload_task_id ON public.parsed_questions(upload_task_id);
CREATE INDEX idx_parsed_questions_is_selected ON public.parsed_questions(is_selected);
CREATE INDEX idx_parsed_questions_is_submitted ON public.parsed_questions(is_submitted);
CREATE INDEX idx_parsed_questions_confidence ON public.parsed_questions(confidence_score);

-- RLS Policies
ALTER TABLE public.parsed_questions ENABLE ROW LEVEL SECURITY;

-- 通过upload_task_id验证归属关系
CREATE POLICY "Users can view own parsed questions"
  ON public.parsed_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks
      WHERE upload_tasks.id = parsed_questions.upload_task_id
        AND upload_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own parsed questions"
  ON public.parsed_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks
      WHERE upload_tasks.id = parsed_questions.upload_task_id
        AND upload_tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.upload_tasks
      WHERE upload_tasks.id = parsed_questions.upload_task_id
        AND upload_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own parsed questions"
  ON public.parsed_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks
      WHERE upload_tasks.id = parsed_questions.upload_task_id
        AND upload_tasks.user_id = auth.uid()
    )
  );

-- Service role可以插入（用于Inngest Worker）
CREATE POLICY "Service role can insert parsed questions"
  ON public.parsed_questions FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.parsed_questions IS 'MVP v2: AI解析结果（简化版，无复杂审核流程）';
COMMENT ON COLUMN public.parsed_questions.tags IS 'AI生成的标签，JSONB格式: {knowledge: string[], difficulty: "easy"|"medium"|"hard", type: string}';
COMMENT ON COLUMN public.parsed_questions.is_selected IS '用户是否选中此题（用于批量提交筛选）';

-- ----------------------------------------------------------------------------
-- RPC Function: batch_submit_questions (批量提交)
-- 基于最终确认方案：使用is_selected标记，无复杂审核
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION batch_submit_questions(
  p_task_id UUID,
  p_question_ids UUID[],
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  -- 验证任务归属
  IF NOT EXISTS (
    SELECT 1 FROM public.upload_tasks
    WHERE id = p_task_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Task % does not belong to user %', p_task_id, p_user_id;
  END IF;

  -- 插入到主题库并计数
  WITH inserted AS (
    INSERT INTO public.questions (
      type,
      content,
      options,
      answer,
      difficulty,
      tags,
      created_by,
      created_at
    )
    SELECT
      -- 类型转换：MVP的type → 主平台的type
      CASE pq.type
        WHEN 'choice' THEN 'single'
        WHEN 'fill' THEN 'fill'
        WHEN 'essay' THEN 'essay'
        WHEN 'proof' THEN 'essay'
      END,
      pq.content,
      pq.options,
      pq.answer,
      -- 从tags JSONB中提取difficulty
      (pq.tags->>'difficulty')::TEXT,
      -- 从tags JSONB中提取knowledge数组
      ARRAY(SELECT jsonb_array_elements_text(pq.tags->'knowledge')),
      p_user_id,
      NOW()
    FROM public.parsed_questions pq
    WHERE pq.id = ANY(p_question_ids)
      AND pq.upload_task_id = p_task_id
      AND pq.is_selected = TRUE  -- 只提交已选中的
      AND pq.is_submitted = FALSE  -- 避免重复提交
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  -- 更新提交状态
  UPDATE public.parsed_questions
  SET is_submitted = TRUE
  WHERE id = ANY(p_question_ids)
    AND upload_task_id = p_task_id
    AND is_selected = TRUE
    AND is_submitted = FALSE;

  RETURN v_inserted_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Batch submit failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION batch_submit_questions IS 'MVP v2: 批量提交已选中的题目到主题库（事务保护）';

-- ----------------------------------------------------------------------------
-- Helper Function: get_task_summary (任务摘要统计)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_task_summary(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'task_id', p_task_id,
    'total', COUNT(*),
    'selected', COUNT(*) FILTER (WHERE is_selected = TRUE),
    'submitted', COUNT(*) FILTER (WHERE is_submitted = TRUE),
    'low_confidence', COUNT(*) FILTER (WHERE confidence_score < 0.8),
    'avg_confidence', ROUND(AVG(confidence_score), 2)
  )
  INTO v_summary
  FROM public.parsed_questions
  WHERE upload_task_id = p_task_id;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION get_task_summary IS 'MVP v2: 获取任务的统计摘要';

-- ----------------------------------------------------------------------------
-- 测试数据（可选）
-- ----------------------------------------------------------------------------
-- INSERT INTO public.upload_tasks (user_id, file_name, file_url, status, progress)
-- SELECT id, 'test_mvp.pdf', 'ai-question-bank/test/sample.pdf', 'completed', 100
-- FROM public.profiles WHERE email = 'teacher@test.com' LIMIT 1;

-- ============================================================================
-- Migration Complete ✅
-- ============================================================================
-- 新增内容：
-- ✅ 简化的2表结构（无复杂审核流程）
-- ✅ 字段名称匹配TypeScript类型
-- ✅ Service role INSERT策略（用于Inngest Worker）
-- ✅ batch_submit_questions使用is_selected标记
-- ✅ get_task_summary统计函数
--
-- 验证步骤：
-- 1. npx supabase db reset
-- 2. 检查表结构：\d upload_tasks, \d parsed_questions
-- 3. 测试RLS：使用不同用户查询
-- 4. 测试RPC：SELECT batch_submit_questions(...)
-- ============================================================================
