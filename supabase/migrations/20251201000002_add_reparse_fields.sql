-- Migration: Add reparse fields to parsed_questions table
-- Purpose: Support single question re-parsing functionality

-- Add reparse tracking fields
ALTER TABLE parsed_questions
ADD COLUMN IF NOT EXISTS reparse_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reparse_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reparse_status TEXT DEFAULT 'idle' CHECK (reparse_status IN ('idle', 'pending', 'processing', 'completed', 'failed'));

-- Add index for querying by reparse status
CREATE INDEX IF NOT EXISTS idx_parsed_questions_reparse_status ON parsed_questions(reparse_status)
WHERE reparse_status != 'idle';

-- Comment on columns
COMMENT ON COLUMN parsed_questions.reparse_count IS '重新解析次数';
COMMENT ON COLUMN parsed_questions.last_reparse_at IS '上次重新解析时间';
COMMENT ON COLUMN parsed_questions.reparse_status IS '重新解析状态: idle/pending/processing/completed/failed';
