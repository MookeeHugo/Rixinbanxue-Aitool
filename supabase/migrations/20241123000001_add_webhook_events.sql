-- 创建 webhook_events 表用于幂等性检查
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引以加速查询
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);

-- 添加注释
COMMENT ON TABLE webhook_events IS 'Webhook 事件记录表，用于幂等性检查和审计';
COMMENT ON COLUMN webhook_events.event_id IS 'Webhook 事件唯一ID（来自提供方）';
COMMENT ON COLUMN webhook_events.event_type IS 'Webhook 事件类型';
COMMENT ON COLUMN webhook_events.payload IS 'Webhook 事件完整数据';
COMMENT ON COLUMN webhook_events.processed_at IS '事件处理时间';

-- 定期清理旧记录的函数（保留 30 天）
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 注释：可以通过 pg_cron 或手动调用此函数清理旧数据
-- SELECT cleanup_old_webhook_events();
