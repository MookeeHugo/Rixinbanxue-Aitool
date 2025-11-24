-- 创建直播会话文件表
CREATE TABLE IF NOT EXISTS live_session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  is_displayed_on_whiteboard BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX idx_live_session_files_session_id ON live_session_files(session_id);
CREATE INDEX idx_live_session_files_user_id ON live_session_files(user_id);
CREATE INDEX idx_live_session_files_created_at ON live_session_files(created_at DESC);

-- 启用RLS
ALTER TABLE live_session_files ENABLE ROW LEVEL SECURITY;

-- RLS策略：只有会话参与者可以查看文件（暂时允许所有认证用户查看）
CREATE POLICY "会话参与者可以查看文件" ON live_session_files
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS策略：认证用户可以上传文件
CREATE POLICY "认证用户可以上传文件" ON live_session_files
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS策略：只有文件上传者可以删除文件
CREATE POLICY "文件上传者可以删除文件" ON live_session_files
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS策略：认证用户可以更新文件
CREATE POLICY "认证用户可以更新文件" ON live_session_files
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 添加更新时间触发器
CREATE TRIGGER update_live_session_files_updated_at
  BEFORE UPDATE ON live_session_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
