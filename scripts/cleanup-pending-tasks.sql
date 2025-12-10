-- ============================================================================
-- 清理卡住的AI创作任务
--
-- 说明：当任务因错误卡在 pending 状态时，会占用并发配额
-- 本脚本将所有超过5分钟的 pending 任务标记为 failed
-- ============================================================================

-- 查看当前 pending 任务
SELECT
  id,
  user_id,
  question_type,
  generation_status,
  created_at,
  NOW() - created_at AS age,
  generation_parameters->>'diagram_type' as diagram_type
FROM ai_created_questions
WHERE generation_status = 'pending'
ORDER BY created_at DESC;

-- 清理超过5分钟的 pending 任务（标记为 failed）
UPDATE ai_created_questions
SET
  generation_status = 'failed',
  error_message = '任务超时或异常终止，已自动清理',
  updated_at = NOW()
WHERE generation_status = 'pending'
  AND created_at < NOW() - INTERVAL '5 minutes';

-- 查看清理后的结果
SELECT
  generation_status,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM ai_created_questions
GROUP BY generation_status
ORDER BY generation_status;
