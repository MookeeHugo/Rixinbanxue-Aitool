-- 添加 Playwright E2E 测试专用账号
-- 这些账号仅用于自动化测试，不影响开发测试数据

DO $$
DECLARE
  playwright_teacher_uuid uuid;
  playwright_student_uuid uuid;
BEGIN

-- 创建 Playwright 教师测试账号
-- 邮箱: playwright-teacher@test.com
-- 密码: Playwright123!
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
  'bbbbbbbb-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'playwright-teacher@test.com',
  crypt('Playwright123!', gen_salt('bf')),
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
) ON CONFLICT (email) DO UPDATE
  SET encrypted_password = crypt('Playwright123!', gen_salt('bf'))
RETURNING id INTO playwright_teacher_uuid;

-- 创建对应的 profiles 记录
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  playwright_teacher_uuid,
  'playwright-teacher@test.com',
  'Playwright教师',
  'teacher'
) ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role;

-- 创建 Playwright 学生测试账号
-- 邮箱: playwright-student@test.com
-- 密码: Playwright123!
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
  'cccccccc-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'playwright-student@test.com',
  crypt('Playwright123!', gen_salt('bf')),
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
) ON CONFLICT (email) DO UPDATE
  SET encrypted_password = crypt('Playwright123!', gen_salt('bf'))
RETURNING id INTO playwright_student_uuid;

-- 创建对应的 profiles 记录
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  playwright_student_uuid,
  'playwright-student@test.com',
  'Playwright学生',
  'student'
) ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role;

RAISE NOTICE '===================================';
RAISE NOTICE 'Playwright 测试账号创建完成！';
RAISE NOTICE '===================================';
RAISE NOTICE '教师账号: playwright-teacher@test.com / Playwright123!';
RAISE NOTICE '学生账号: playwright-student@test.com / Playwright123!';
RAISE NOTICE '===================================';

END $$;
