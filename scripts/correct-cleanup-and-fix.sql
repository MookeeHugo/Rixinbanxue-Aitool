-- ================================================
-- 正确的清理和修复SQL（使用正确的表名）
-- ================================================
-- 表名: ai_created_questions, ai_creation_quotas
-- ================================================

-- ===========================================
-- 步骤1: 清理所有异常状态的任务
-- ===========================================

-- 1.1 查看当前所有任务状态
SELECT generation_status, COUNT(*) as count
FROM ai_created_questions
GROUP BY generation_status
ORDER BY generation_status;

-- 1.2 查看详细的pending/generating任务
SELECT
  id,
  user_id,
  question_type,
  generation_status,
  created_at,
  NOW() - created_at AS age,
  error_message
FROM ai_created_questions
WHERE generation_status IN ('pending', 'generating')
ORDER BY created_at DESC;

-- 1.3 强制清理所有pending和generating任务
UPDATE ai_created_questions
SET
  generation_status = 'failed',
  error_message = '系统清理：测试期间强制重置异常状态',
  updated_at = NOW()
WHERE generation_status IN ('pending', 'generating')
RETURNING id, question_type, generation_status, created_at;

-- ===========================================
-- 步骤2: 提高并发限制（临时解决方案）
-- ===========================================

-- 2.1 查看当前配额设置
SELECT
  user_id,
  daily_limit,
  daily_used,
  concurrent_limit,
  last_reset_date,
  updated_at
FROM ai_creation_quotas
ORDER BY updated_at DESC;

-- 2.2 临时提高并发限制到10（从2提高）
UPDATE ai_creation_quotas
SET
  concurrent_limit = 10,
  updated_at = NOW()
WHERE concurrent_limit < 10
RETURNING user_id, concurrent_limit;

-- ===========================================
-- 步骤3: 验证修复结果
-- ===========================================

-- 3.1 验证任务状态分布
SELECT generation_status, COUNT(*) as count
FROM ai_created_questions
GROUP BY generation_status
ORDER BY generation_status;

-- 3.2 验证配额设置
SELECT
  user_id,
  daily_limit,
  daily_used,
  concurrent_limit,
  failed_count_today,
  last_reset_date
FROM ai_creation_quotas
ORDER BY updated_at DESC;

-- 3.3 确认pending/generating任务数量
SELECT COUNT(*) as pending_generating_count
FROM ai_created_questions
WHERE generation_status IN ('pending', 'generating');

-- ✅ 预期结果:
-- - 步骤1.3 应该更新2个任务（根据截图：2个generating）
-- - 步骤2.2 应该更新至少1个用户的concurrent_limit
-- - 步骤3.3 应该返回 0

-- ===========================================
-- 可选: 重置今日配额使用（如果需要）
-- ===========================================

-- 注意：只在测试环境执行！
-- UPDATE ai_creation_quotas
-- SET
--   daily_used = 0,
--   failed_count_today = 0,
--   last_reset_date = CURRENT_DATE,
--   updated_at = NOW();
