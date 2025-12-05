-- 日新教学平台数据库表结构
-- 请在 Supabase SQL Editor 或 `npx supabase db push` 中执行

-- 1. 用户表 (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 班级表 (classes)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 题目表 (questions)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('choice', 'fill', 'essay')),
  content TEXT NOT NULL,
  options JSONB, -- 选项（仅选择题）
  answer TEXT NOT NULL,
  analysis_content TEXT,
  analysis TEXT,
  knowledge_points TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  province TEXT,
  year INTEGER,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_key TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 题目表触发器：保持 updated_at 与解析字段同步
CREATE OR REPLACE FUNCTION sync_question_analysis()
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

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE INSERT OR UPDATE ON questions
FOR EACH ROW
EXECUTE PROCEDURE sync_question_analysis();

-- 4. 试卷表 (papers)
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 作业表 (assignments)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 学生提交表 (submissions)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- 学生答案
  score NUMERIC(5,2), -- 分数
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id) -- 每个学生每份作业只能提交一次
);

-- 7. 导出任务表 (export_tasks)
CREATE TABLE IF NOT EXISTS export_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  options JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  download_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE OR REPLACE FUNCTION touch_export_tasks_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_export_tasks_updated_at ON export_tasks;
CREATE TRIGGER trg_export_tasks_updated_at
BEFORE UPDATE ON export_tasks
FOR EACH ROW
EXECUTE PROCEDURE touch_export_tasks_updated_at();

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_knowledge_points ON questions USING GIN(knowledge_points);
CREATE INDEX IF NOT EXISTS idx_papers_created_by ON papers(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_export_tasks_user ON export_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_export_tasks_status ON export_tasks(status);
CREATE INDEX IF NOT EXISTS idx_export_tasks_created ON export_tasks(created_at DESC);

-- 启用 Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户表
-- 用户只能查看和更新自己的信息
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS 策略：班级表
-- 教师可以查看、创建、更新自己的班级
CREATE POLICY "Teachers can manage own classes"
  ON classes FOR ALL
  USING (teacher_id = auth.uid());

-- RLS 策略：题目表
-- 教师可以查看和管理自己创建的题目；所有教师可查看其他教师的题目（公共题库）
CREATE POLICY "Teachers can view all questions"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can manage own questions"
  ON questions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Teachers can update own questions"
  ON questions FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own questions"
  ON questions FOR DELETE
  USING (created_by = auth.uid());

-- RLS 策略：试卷表
CREATE POLICY "Teachers can manage own papers"
  ON papers FOR ALL
  USING (created_by = auth.uid());

-- RLS 策略：作业表
CREATE POLICY "Teachers can manage own assignments"
  ON assignments FOR ALL
  USING (created_by = auth.uid());

-- RLS 策略：提交表
CREATE POLICY "Students can view own submissions"
  ON submissions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can submit assignments"
  ON submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view class submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
      AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can update submission scores"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
      AND a.created_by = auth.uid()
    )
  );

-- RLS 策略：导出任务表
CREATE POLICY "Export tasks readable by owner"
  ON export_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Export tasks insert by owner"
  ON export_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Export tasks update by owner"
  ON export_tasks FOR UPDATE
  USING (auth.uid() = user_id);
