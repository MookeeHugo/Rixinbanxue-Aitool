-- 修复 live_sessions 表的 RLS 策略
-- 允许所有已认证用户查看所有直播会话

-- 确保 RLS 已启用
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Anyone can view live sessions" ON live_sessions;
DROP POLICY IF EXISTS "Authenticated users can view live sessions" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can manage live sessions" ON live_sessions;

-- 创建新策略：所有已认证用户可以查看所有直播会话
CREATE POLICY "Authenticated users can view all live sessions"
  ON live_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- 创建策略：教师可以插入直播会话
CREATE POLICY "Teachers can create live sessions"
  ON live_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'teacher'
  );

-- 创建策略：创建者可以更新自己的直播会话
CREATE POLICY "Creators can update their live sessions"
  ON live_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 创建策略：创建者可以删除自己的直播会话
CREATE POLICY "Creators can delete their live sessions"
  ON live_sessions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
