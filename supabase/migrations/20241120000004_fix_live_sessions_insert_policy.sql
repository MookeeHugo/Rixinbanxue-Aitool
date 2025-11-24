-- 修复 live_sessions 表的 INSERT 策略
-- 问题：auth.jwt() ->> 'role' 无法获取到role（role在profiles表中，不在JWT中）
-- 解决：改为从 profiles 表中查询用户的 role

-- 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "Teachers can create live sessions" ON live_sessions;

-- 创建新策略：教师可以插入直播会话（从 profiles 表验证）
CREATE POLICY "Teachers can create live sessions"
  ON live_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );
