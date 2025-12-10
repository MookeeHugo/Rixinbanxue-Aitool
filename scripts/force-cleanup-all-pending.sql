-- ================================================
-- 强制清理所有pending任务（紧急修复）
-- ================================================
-- 用途：当遇到"同时进行的任务数已达上限"时使用
-- ⚠️ 警告：这将清理所有pending状态的任务，包括正在进行中的
-- ================================================

-- 1. 查看当前所有pending任务
SELECT
  id,
  user_id,
  question_type,
  generation_status,
  created_at,
  NOW() - created_at AS age,
  error_message
FROM ai_created_questions
WHERE generation_status = 'pending'
ORDER BY created_at DESC;

-- 2. 强制清理所有pending任务（不管时间）
UPDATE ai_created_questions
SET
  generation_status = 'failed',
  error_message = '任务清理：测试期间强制清理pending状态',
  updated_at = NOW()
WHERE generation_status = 'pending'
RETURNING id, question_type, created_at;

-- 3. 验证清理结果
SELECT generation_status, COUNT(*) as count
FROM ai_created_questions
GROUP BY generation_status
ORDER BY generation_status;

-- 4. 查看用户配额状态
SELECT
  user_id,
  daily_limit,
  daily_used,
  concurrent_limit,
  created_at,
  updated_at
FROM user_quotas
ORDER BY updated_at DESC
LIMIT 5;
