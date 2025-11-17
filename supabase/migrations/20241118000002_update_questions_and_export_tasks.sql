-- 补齐 questions 字段并引入 export_tasks 任务表

-- questions 字段与命名对齐
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS analysis_content TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS analysis TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_key TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.questions
SET analysis_content = COALESCE(analysis_content, analysis),
    analysis = COALESCE(analysis, analysis_content)
WHERE analysis IS NOT NULL OR analysis_content IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_question_analysis()
RETURNS trigger AS $$
BEGIN
  IF NEW.analysis_content IS NULL AND NEW.analysis IS NOT NULL THEN
    NEW.analysis_content := NEW.analysis;
  ELSIF NEW.analysis IS NULL AND NEW.analysis_content IS NOT NULL THEN
    NEW.analysis := NEW.analysis_content;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW
EXECUTE PROCEDURE public.sync_question_analysis();

-- 导出任务表
CREATE TABLE IF NOT EXISTS public.export_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  options JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  download_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_tasks_user ON public.export_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_export_tasks_status ON public.export_tasks(status);
CREATE INDEX IF NOT EXISTS idx_export_tasks_created ON public.export_tasks(created_at DESC);

ALTER TABLE public.export_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Export tasks readable by owner" ON public.export_tasks;
CREATE POLICY "Export tasks readable by owner"
  ON public.export_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Export tasks insert by owner" ON public.export_tasks;
CREATE POLICY "Export tasks insert by owner"
  ON public.export_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Export tasks update by owner" ON public.export_tasks;
CREATE POLICY "Export tasks update by owner"
  ON public.export_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_export_tasks_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_export_tasks_updated_at ON public.export_tasks;
CREATE TRIGGER trg_export_tasks_updated_at
BEFORE UPDATE ON public.export_tasks
FOR EACH ROW
EXECUTE PROCEDURE public.touch_export_tasks_updated_at();
