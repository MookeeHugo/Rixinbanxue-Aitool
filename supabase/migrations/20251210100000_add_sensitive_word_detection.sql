-- ============================================================================
-- 敏感词检测功能
-- 功能：为草稿表添加敏感词检测字段
-- 创建时间：2025-12-10
-- ============================================================================

-- 1. 为 xhs_ai_drafts 表添加敏感词检测字段
ALTER TABLE xhs_ai_drafts
  ADD COLUMN IF NOT EXISTS sensitive_words_detected JSONB,
  ADD COLUMN IF NOT EXISTS auto_replaced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high'));

-- 2. 添加注释
COMMENT ON COLUMN xhs_ai_drafts.sensitive_words_detected IS '检测到的敏感词详情（JSON格式）';
COMMENT ON COLUMN xhs_ai_drafts.auto_replaced IS '是否进行了自动替换';
COMMENT ON COLUMN xhs_ai_drafts.risk_level IS '风险等级：low/medium/high';

-- 3. 创建索引（优化查询）
CREATE INDEX IF NOT EXISTS idx_xhs_ai_drafts_risk_level
  ON xhs_ai_drafts(risk_level)
  WHERE risk_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_xhs_ai_drafts_auto_replaced
  ON xhs_ai_drafts(auto_replaced);

-- 4. 更新RLS策略（确保新字段受保护）
-- RLS策略已在原有迁移中设置，无需修改

COMMIT;
