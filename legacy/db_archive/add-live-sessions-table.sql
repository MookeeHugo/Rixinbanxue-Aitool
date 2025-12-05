-- 添加直播课堂表 (live_sessions)
-- 用于持久化存储直播课堂数据，替代内存存储

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('zego', 'livekit')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'live', 'ended', 'failed')) DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_min INTEGER,
  record_on_start BOOLEAN DEFAULT false,
  room_id TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_live_sessions_created_by ON live_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_created_at ON live_sessions(created_at DESC);

-- 启用 Row Level Security (RLS)
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：教师可以管理自己创建的直播课堂
CREATE POLICY "Teachers can manage own live sessions"
  ON live_sessions FOR ALL
  USING (created_by = auth.uid());

-- RLS 策略：所有认证用户可以查看直播课堂列表（用于学生加入）
CREATE POLICY "Authenticated users can view live sessions"
  ON live_sessions FOR SELECT
  USING (auth.role() = 'authenticated');

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 插入说明注释
COMMENT ON TABLE live_sessions IS '直播课堂表 - 存储直播课堂的元数据和状态';
COMMENT ON COLUMN live_sessions.provider IS '直播服务提供商: zego 或 livekit';
COMMENT ON COLUMN live_sessions.status IS '课堂状态: pending(未开始), live(进行中), ended(已结束), failed(失败)';
COMMENT ON COLUMN live_sessions.room_id IS '第三方直播服务的房间ID';
