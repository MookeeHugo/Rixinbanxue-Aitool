-- ============================================================================
-- AI Question Bank MVP Database Migration
-- ============================================================================
-- This migration creates the minimal viable database structure for the
-- AI-powered question bank system.
--
-- MVP Scope: 2 core tables only
-- - upload_tasks: Track file uploads and parsing status
-- - parsed_questions: Store AI-parsed questions awaiting review
--
-- Key Design Decisions (based on AI题库-关键修正补充说明.md):
-- 1. ✅ Simplified tenant model: Use user_id only (no separate tenant_id)
-- 2. ✅ Transaction-protected batch submission via Postgres function
-- 3. ✅ Proper RLS policies for multi-user security
-- 4. ✅ Audit fields for review tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: upload_tasks
-- Purpose: Track file upload and AI parsing tasks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upload_tasks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User context (✅ Simplified: no separate tenant_id)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_url TEXT,  -- R2/Supabase Storage URL after upload
  file_size BIGINT,  -- bytes
  page_count INTEGER DEFAULT 0,

  -- Task status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),

  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_page INTEGER DEFAULT 0,

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Traceability
  trace_id UUID DEFAULT gen_random_uuid() UNIQUE,

  -- AI provider info
  provider TEXT DEFAULT 'qwen-vl',  -- MVP: hardcoded to qwen-vl
  cost_yuan DECIMAL(10, 4) DEFAULT 0,  -- AI API cost in CNY

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for upload_tasks
CREATE INDEX idx_upload_tasks_user_id ON public.upload_tasks(user_id);
CREATE INDEX idx_upload_tasks_status ON public.upload_tasks(status);
CREATE INDEX idx_upload_tasks_created_at ON public.upload_tasks(created_at DESC);
CREATE INDEX idx_upload_tasks_trace_id ON public.upload_tasks(trace_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_upload_tasks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_tasks_timestamp
  BEFORE UPDATE ON public.upload_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_tasks_timestamp();

-- RLS Policies for upload_tasks
ALTER TABLE public.upload_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users can view own upload tasks"
  ON public.upload_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create tasks
CREATE POLICY "Users can create upload tasks"
  ON public.upload_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own upload tasks"
  ON public.upload_tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own upload tasks"
  ON public.upload_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.upload_tasks IS 'MVP: Tracks file upload and AI parsing tasks';
COMMENT ON COLUMN public.upload_tasks.trace_id IS 'Unique identifier for distributed tracing and debugging';
COMMENT ON COLUMN public.upload_tasks.cost_yuan IS 'AI API cost in Chinese Yuan (CNY)';

-- ----------------------------------------------------------------------------
-- Table 2: parsed_questions
-- Purpose: Store AI-parsed questions awaiting teacher review
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parsed_questions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to upload task
  task_id UUID NOT NULL REFERENCES public.upload_tasks(id) ON DELETE CASCADE,

  -- User context
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Question content (follows main platform's questions table structure)
  type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'judge', 'fill', 'short', 'essay')),
  content TEXT NOT NULL,  -- Question text (supports Markdown/LaTeX)
  options JSONB,  -- For single/multiple choice: ["A. ...", "B. ...", ...]
  answer TEXT,  -- Correct answer(s)
  analysis TEXT,  -- Answer explanation

  -- Metadata
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[],  -- Question tags/categories
  page_number INTEGER,  -- Source page in original PDF

  -- AI confidence & source
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  raw_ocr_text TEXT,  -- Original OCR output for debugging
  image_url TEXT,  -- Screenshot of original question

  -- ✅ Review/audit fields (corrected based on AI题库-关键修正补充说明.md)
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'editing')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,

  -- Submission tracking
  is_submitted BOOLEAN NOT NULL DEFAULT FALSE,  -- Whether synced to main questions table
  submitted_at TIMESTAMPTZ,
  submitted_question_id UUID,  -- FK to questions.id after submission

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for parsed_questions
CREATE INDEX idx_parsed_questions_task_id ON public.parsed_questions(task_id);
CREATE INDEX idx_parsed_questions_user_id ON public.parsed_questions(user_id);
CREATE INDEX idx_parsed_questions_review_status ON public.parsed_questions(review_status);
CREATE INDEX idx_parsed_questions_is_submitted ON public.parsed_questions(is_submitted);
CREATE INDEX idx_parsed_questions_type ON public.parsed_questions(type);

-- Auto-update timestamp trigger
CREATE TRIGGER update_parsed_questions_timestamp
  BEFORE UPDATE ON public.parsed_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_tasks_timestamp();  -- Reuse same function

-- RLS Policies for parsed_questions
ALTER TABLE public.parsed_questions ENABLE ROW LEVEL SECURITY;

-- Users can view their own parsed questions
CREATE POLICY "Users can view own parsed questions"
  ON public.parsed_questions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create parsed questions
CREATE POLICY "Users can create parsed questions"
  ON public.parsed_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own parsed questions
CREATE POLICY "Users can update own parsed questions"
  ON public.parsed_questions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own parsed questions
CREATE POLICY "Users can delete own parsed questions"
  ON public.parsed_questions
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.parsed_questions IS 'MVP: AI-parsed questions awaiting teacher review and submission';
COMMENT ON COLUMN public.parsed_questions.raw_ocr_text IS 'Original OCR output preserved for debugging and re-parsing';
COMMENT ON COLUMN public.parsed_questions.is_submitted IS 'Whether this question has been submitted to the main questions table';

-- ----------------------------------------------------------------------------
-- ✅ Transaction-Protected Batch Submission Function
-- Based on: AI题库-关键修正补充说明.md
-- Purpose: Atomically submit multiple questions to main platform
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION batch_submit_questions(
  p_task_id UUID,
  p_question_ids UUID[],
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges
AS $$
DECLARE
  v_result JSONB;
  v_inserted_count INTEGER;
  v_updated_count INTEGER;
BEGIN
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.upload_tasks
    WHERE id = p_task_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Task % does not belong to user %', p_task_id, p_user_id;
  END IF;

  -- Transaction automatically starts here

  -- Step 1: Insert into main questions table
  WITH inserted AS (
    INSERT INTO public.questions (
      type,
      content,
      options,
      answer,
      analysis,
      difficulty,
      tags,
      created_by,
      created_at
    )
    SELECT
      type,
      content,
      options,
      answer,
      analysis,
      difficulty,
      tags,
      p_user_id,
      NOW()
    FROM public.parsed_questions
    WHERE id = ANY(p_question_ids)
      AND user_id = p_user_id
      AND is_submitted = FALSE
      AND review_status = 'approved'  -- Only submit approved questions
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  -- Step 2: Mark as submitted in parsed_questions
  WITH updated AS (
    UPDATE public.parsed_questions
    SET
      is_submitted = TRUE,
      submitted_at = NOW()
    WHERE id = ANY(p_question_ids)
      AND user_id = p_user_id
      AND is_submitted = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  -- Build result
  v_result := jsonb_build_object(
    'success', TRUE,
    'inserted_count', v_inserted_count,
    'updated_count', v_updated_count,
    'task_id', p_task_id,
    'timestamp', NOW()
  );

  -- Transaction commits automatically here if no errors
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction rolls back automatically
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION batch_submit_questions IS 'Transaction-protected batch submission of approved questions to main platform';

-- ----------------------------------------------------------------------------
-- Helper Function: Get Upload Task Statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_upload_task_stats(p_task_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'task_id', p_task_id,
    'total_questions', COUNT(*),
    'by_review_status', jsonb_object_agg(
      review_status,
      status_count
    )
  )
  INTO v_stats
  FROM (
    SELECT
      review_status,
      COUNT(*) as status_count
    FROM public.parsed_questions
    WHERE task_id = p_task_id AND user_id = p_user_id
    GROUP BY review_status
  ) stats;

  RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION get_upload_task_stats IS 'Get statistics for an upload task (total questions, review status breakdown)';

-- ----------------------------------------------------------------------------
-- Sample Data for Testing (Optional)
-- ----------------------------------------------------------------------------
-- Uncomment below to insert test data

-- INSERT INTO public.upload_tasks (user_id, file_name, status)
-- SELECT id, 'test_sample.pdf', 'completed'
-- FROM public.profiles
-- WHERE email = 'teacher@test.com'
-- LIMIT 1;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- What's included:
-- ✅ 2 core tables (upload_tasks, parsed_questions)
-- ✅ Proper indexes for performance
-- ✅ RLS policies for security
-- ✅ Auto-update timestamp triggers
-- ✅ Transaction-protected batch submission function
-- ✅ Statistics helper function
--
-- What's NOT included (for later phases):
-- ⏸ question_images (can use image_url in parsed_questions for MVP)
-- ⏸ question_tags (can use tags[] array for MVP)
-- ⏸ provider_usage_logs (can add logging later)
-- ⏸ tenant_quotas (can hardcode limits in API for MVP)
--
-- Next steps:
-- 1. Run this migration: supabase db push
-- 2. Verify tables: supabase db dump --schema public
-- 3. Test RLS policies with different users
-- 4. Proceed to API implementation
-- ============================================================================
