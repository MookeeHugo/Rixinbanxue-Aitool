-- 清理脚本：删除所有现有的表和策略
-- ⚠️ 警告：此脚本会删除所有数据！仅用于开发环境

-- 删除所有策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can manage own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view all questions" ON questions;
DROP POLICY IF EXISTS "Teachers can manage own questions" ON questions;
DROP POLICY IF EXISTS "Teachers can update own questions" ON questions;
DROP POLICY IF EXISTS "Teachers can delete own questions" ON questions;
DROP POLICY IF EXISTS "Export tasks readable by owner" ON export_tasks;
DROP POLICY IF EXISTS "Export tasks insert by owner" ON export_tasks;
DROP POLICY IF EXISTS "Export tasks update by owner" ON export_tasks;
DROP POLICY IF EXISTS "Teachers can manage own papers" ON papers;
DROP POLICY IF EXISTS "Teachers can manage own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can submit assignments" ON submissions;
DROP POLICY IF EXISTS "Teachers can view class submissions" ON submissions;
DROP POLICY IF EXISTS "Teachers can update submission scores" ON submissions;

-- 删除所有表（按依赖关系倒序删除）
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS export_tasks CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
