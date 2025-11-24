-- 创建直播录制表
CREATE TABLE IF NOT EXISTS live_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX idx_live_recordings_session_id ON live_recordings(session_id);
CREATE INDEX idx_live_recordings_recorded_by ON live_recordings(recorded_by);
CREATE INDEX idx_live_recordings_created_at ON live_recordings(created_at DESC);
CREATE INDEX idx_live_recordings_status ON live_recordings(status);

-- 启用RLS
ALTER TABLE live_recordings ENABLE ROW LEVEL SECURITY;

-- RLS策略：所有认证用户可以查看录制
CREATE POLICY "认证用户可以查看录制" ON live_recordings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS策略：录制创建者可以插入
CREATE POLICY "录制创建者可以插入" ON live_recordings
  FOR INSERT
  WITH CHECK (
    auth.uid() = recorded_by
    AND auth.role() = 'authenticated'
  );

-- RLS策略：录制创建者可以更新
CREATE POLICY "录制创建者可以更新" ON live_recordings
  FOR UPDATE
  USING (auth.uid() = recorded_by);

-- RLS策略：录制创建者可以删除
CREATE POLICY "录制创建者可以删除" ON live_recordings
  FOR DELETE
  USING (auth.uid() = recorded_by);

-- 添加更新时间触发器
CREATE TRIGGER update_live_recordings_updated_at
  BEFORE UPDATE ON live_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE live_recordings IS '直播录制表 - 存储直播课堂的录制文件信息';
COMMENT ON COLUMN live_recordings.status IS '录制状态: processing(处理中), completed(已完成), failed(失败)';
