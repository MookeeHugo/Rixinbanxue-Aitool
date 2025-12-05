-- 为已存在的认证用户创建 profile 记录
-- 替换下面的值为实际的用户信息

-- 用户信息（请根据实际情况修改）
-- UID: c501e30a-efc5-4dca-92eb-0f599675f4ff
-- Email: teacher@test.com

INSERT INTO profiles (id, email, name, role)
VALUES (
  'c501e30a-efc5-4dca-92eb-0f599675f4ff',  -- 用户 UID
  'teacher@test.com',                       -- 用户邮箱
  '测试教师',                               -- 用户姓名
  'teacher'                                 -- 用户角色
)
ON CONFLICT (id) DO NOTHING;
