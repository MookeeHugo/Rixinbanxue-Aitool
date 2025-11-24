-- 添加直播聊天消息表 (live_chat_messages)
-- 用于存储直播课堂中的聊天消息

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'system', 'raise_hand')) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session_id ON live_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_user_id ON live_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_created_at ON live_chat_messages(created_at DESC);

-- 启用 Row Level Security (RLS)
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有认证用户可以查看聊天消息
CREATE POLICY "Authenticated users can view chat messages"
  ON live_chat_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS 策略：所有认证用户可以发送聊天消息
CREATE POLICY "Authenticated users can send chat messages"
  ON live_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

-- RLS 策略：用户只能删除自己的消息
CREATE POLICY "Users can delete own messages"
  ON live_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- 添加注释
COMMENT ON TABLE live_chat_messages IS '直播聊天消息表 - 存储直播课堂中的实时聊天消息';
COMMENT ON COLUMN live_chat_messages.message_type IS '消息类型: text(普通文本), system(系统消息), raise_hand(举手)';
