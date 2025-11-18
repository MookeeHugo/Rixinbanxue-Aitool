-- 添加班级学生关联表
-- 用于管理学生加入班级的关系

-- 创建班级学生关联表 (class_students)
CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id) -- 每个学生在每个班级中只能有一条记录
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

-- RLS 策略：班级学生关联表
-- 教师可以查看自己班级的学生
CREATE POLICY "Teachers can view own class students"
  ON class_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- 学生可以查看自己加入的班级
CREATE POLICY "Students can view own class memberships"
  ON class_students FOR SELECT
  USING (student_id = auth.uid());

-- 学生可以加入班级（通过班级代码）
CREATE POLICY "Students can join classes"
  ON class_students FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- 学生可以退出班级
CREATE POLICY "Students can leave classes"
  ON class_students FOR DELETE
  USING (student_id = auth.uid());

-- 教师可以将学生移出自己的班级
CREATE POLICY "Teachers can remove students from own classes"
  ON class_students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- 更新班级表的 RLS 策略，允许学生查看自己加入的班级
CREATE POLICY "Students can view joined classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = classes.id
      AND class_students.student_id = auth.uid()
    )
  );

-- 更新作业表的 RLS 策略，允许学生查看自己班级的作业
CREATE POLICY "Students can view class assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = assignments.class_id
      AND class_students.student_id = auth.uid()
    )
  );
