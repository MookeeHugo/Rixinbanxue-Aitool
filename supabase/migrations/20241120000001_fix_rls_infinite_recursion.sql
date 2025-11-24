-- 修复 RLS 无限递归问题
-- 问题：classes 和 class_students 表的策略互相引用，导致无限递归
-- 解决方案：使用 SECURITY DEFINER 函数打破循环

-- ========================================
-- 1. 删除有问题的策略
-- ========================================

-- 删除导致递归的 class_students 策略
DROP POLICY IF EXISTS "Teachers can view own class students" ON class_students;
DROP POLICY IF EXISTS "Teachers can remove students from own classes" ON class_students;

-- 删除导致递归的 classes 策略
DROP POLICY IF EXISTS "Students can view joined classes" ON classes;

-- 删除导致递归的 assignments 策略
DROP POLICY IF EXISTS "Students can view class assignments" ON assignments;

-- ========================================
-- 2. 创建 SECURITY DEFINER 辅助函数
-- ========================================

-- 检查用户是否是班级的教师（绕过 RLS）
CREATE OR REPLACE FUNCTION is_class_teacher(class_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE id = class_uuid AND teacher_id = user_uuid
  );
$$;

-- 检查学生是否在班级中（绕过 RLS）
CREATE OR REPLACE FUNCTION is_student_in_class(class_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_students
    WHERE class_id = class_uuid AND student_id = user_uuid
  );
$$;

-- ========================================
-- 3. 重新创建策略（使用辅助函数）
-- ========================================

-- class_students: 教师可以查看自己班级的学生
CREATE POLICY "Teachers can view own class students"
  ON class_students FOR SELECT
  USING (is_class_teacher(class_id, auth.uid()));

-- class_students: 教师可以将学生移出自己的班级
CREATE POLICY "Teachers can remove students from own classes"
  ON class_students FOR DELETE
  USING (is_class_teacher(class_id, auth.uid()));

-- classes: 学生可以查看自己加入的班级
CREATE POLICY "Students can view joined classes"
  ON classes FOR SELECT
  USING (is_student_in_class(id, auth.uid()));

-- assignments: 学生可以查看自己班级的作业
CREATE POLICY "Students can view class assignments"
  ON assignments FOR SELECT
  USING (is_student_in_class(class_id, auth.uid()));

-- ========================================
-- 4. 验证修复
-- ========================================

-- 注意：修复后需要重启应用或刷新连接以使策略生效

DO $$
BEGIN
  RAISE NOTICE '===================================';
  RAISE NOTICE 'RLS 无限递归问题已修复！';
  RAISE NOTICE '===================================';
  RAISE NOTICE '修复内容：';
  RAISE NOTICE '1. 删除了导致循环引用的策略';
  RAISE NOTICE '2. 创建了 SECURITY DEFINER 辅助函数';
  RAISE NOTICE '3. 使用辅助函数重新创建策略';
  RAISE NOTICE '===================================';
  RAISE NOTICE '测试建议：';
  RAISE NOTICE '1. 以教师身份登录，查询 classes 表';
  RAISE NOTICE '2. 以学生身份登录，查询加入的 classes';
  RAISE NOTICE '3. 验证不再出现500错误';
  RAISE NOTICE '===================================';
END $$;
