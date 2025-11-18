-- 添加本地开发测试账号
-- 这些账号用于本地开发测试，会在 seed.sql 中使用

-- 临时禁用 RLS 以便插入测试数据
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  test_teacher_uuid uuid := 'aaaaaaaa-1111-1111-1111-111111111111';
  test_student_uuid uuid := 'aaaaaaaa-2222-2222-2222-222222222222';
BEGIN

-- 创建测试教师账号
-- 邮箱: teacher@test.com
-- 密码: test123456
DELETE FROM auth.users WHERE email = 'teacher@test.com';
DELETE FROM public.profiles WHERE email = 'teacher@test.com';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  test_teacher_uuid,
  'authenticated',
  'authenticated',
  'teacher@test.com',
  crypt('test123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
);

-- 创建对应的 profiles 记录
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  test_teacher_uuid,
  'teacher@test.com',
  '张老师',
  'teacher'
);

-- 创建测试学生账号
-- 邮箱: student@test.com
-- 密码: test123456
DELETE FROM auth.users WHERE email = 'student@test.com';
DELETE FROM public.profiles WHERE email = 'student@test.com';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  test_student_uuid,
  'authenticated',
  'authenticated',
  'student@test.com',
  crypt('test123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
);

-- 创建对应的 profiles 记录
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  test_student_uuid,
  'student@test.com',
  '李同学',
  'student'
);

RAISE NOTICE '===================================';
RAISE NOTICE '测试账号创建完成！';
RAISE NOTICE '===================================';
RAISE NOTICE '教师账号: teacher@test.com / test123456';
RAISE NOTICE '学生账号: student@test.com / test123456';
RAISE NOTICE '===================================';

END $$;

-- 重新启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
