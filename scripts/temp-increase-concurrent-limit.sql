-- ================================================
-- 临时提高并发限制（快速解决方案）
-- ================================================
-- 用途：测试期间临时提高并发限制，允许更多任务同时运行
-- ⚠️ 注意：生产环境应该谨慎使用，建议只在测试时提高
-- ================================================

-- 1. 查看当前配额设置
SELECT
  user_id,
  daily_limit,
  daily_used,
  concurrent_limit,
  created_at,
  updated_at
FROM user_quotas
ORDER BY updated_at DESC
LIMIT 10;

-- 2. 临时提高所有用户的并发限制（从2提高到10）
UPDATE user_quotas
SET
  concurrent_limit = 10,
  updated_at = NOW()
WHERE concurrent_limit < 10
RETURNING user_id, concurrent_limit;

-- 3. 验证修改结果
SELECT
  user_id,
  daily_limit,
  daily_used,
  concurrent_limit,
  updated_at
FROM user_quotas
ORDER BY updated_at DESC
LIMIT 10;

-- 4. 如果需要恢复默认值（事后执行）
-- UPDATE user_quotas
-- SET
--   concurrent_limit = 2,
--   updated_at = NOW()
-- WHERE concurrent_limit > 2;
