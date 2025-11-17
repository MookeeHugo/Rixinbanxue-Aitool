-- 日新教学平台数据库表结构
-- 初始化 schema

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
  knowledge_points TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_knowledge_points ON questions USING GIN(knowledge_points);
CREATE INDEX IF NOT EXISTS idx_papers_created_by ON papers(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

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
-- 学生可以查看自己所在的班级
CREATE POLICY "Teachers can manage own classes"
  ON classes FOR ALL
  USING (teacher_id = auth.uid());

-- RLS 策略：题目表
-- 教师可以查看和管理自己创建的题目
-- 所有教师可以查看其他教师的题目（用于题库共享）
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
-- 教师可以管理自己创建的试卷
CREATE POLICY "Teachers can manage own papers"
  ON papers FOR ALL
  USING (created_by = auth.uid());

-- RLS 策略：作业表
-- 教师可以管理自己创建的作业
-- 学生可以查看自己班级的作业
CREATE POLICY "Teachers can manage own assignments"
  ON assignments FOR ALL
  USING (created_by = auth.uid());

-- RLS 策略：提交表
-- 学生可以查看和提交自己的作业
-- 教师可以查看自己班级学生的提交
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
