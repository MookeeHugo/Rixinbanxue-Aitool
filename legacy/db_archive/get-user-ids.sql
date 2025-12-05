-- ========================================
-- 获取用户 UUID 辅助脚本
-- ========================================
-- 使用说明：在注册账号后，在 Supabase SQL Editor 中执行此脚本
-- 将会显示所有用户的 UUID，方便复制使用
-- ========================================

-- 查询所有用户及其角色
SELECT
  p.id as user_id,
  p.name as user_name,
  p.email,
  p.role,
  '复制此UUID到 seed-test-data.sql' as note
FROM profiles p
ORDER BY p.created_at DESC;

-- 如果你已经知道邮箱，可以用这个查询
-- 将 'teacher@test.com' 替换为你的邮箱
/*
SELECT
  id as user_id,
  name,
  email,
  role
FROM profiles
WHERE email IN ('teacher@test.com', 'student@test.com');
*/

-- 教师账号 UUID 查询
SELECT
  id as teacher_uuid,
  name,
  email
FROM profiles
WHERE role = 'teacher'
ORDER BY created_at DESC
LIMIT 1;

-- 学生账号 UUID 查询
SELECT
  id as student_uuid,
  name,
  email
FROM profiles
WHERE role = 'student'
ORDER BY created_at DESC
LIMIT 1;
