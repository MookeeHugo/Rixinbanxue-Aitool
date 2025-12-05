-- 清理认证用户和 profiles 表
-- 用于解决登录凭证问题

-- 方案1: 清空 profiles 表（保留表结构）
TRUNCATE TABLE profiles CASCADE;

-- 注意：还需要在 Supabase Authentication 控制台手动删除用户
-- 步骤：
-- 1. 打开 Authentication -> Users
-- 2. 找到所有测试用户
-- 3. 点击用户右侧的 "..." -> Delete user
