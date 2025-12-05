-- 修复 RLS 策略：添加缺失的 INSERT 权限
-- 这个脚本只添加缺失的策略，不会删除任何数据

-- 添加允许用户创建自己 profile 的策略
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
