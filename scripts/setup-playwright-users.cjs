const { createClient } = require('@supabase/supabase-js');

async function ensureUser(client, { email, password, role }) {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) {
    if (error.message?.includes('already registered')) {
      console.log(`[Playwright] 用户已存在：${email}`);
      return null;
    }
    throw error;
  }
  console.log(`[Playwright] 创建测试用户成功：${email}`);
  return data.user;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，无法创建测试账号');
    process.exit(1);
  }

  const client = createClient(url, serviceKey);

  const teacherEmail = process.env.PLAYWRIGHT_TEACHER_EMAIL || 'playwright-teacher@test.com';
  const teacherPassword = process.env.PLAYWRIGHT_TEACHER_PASSWORD || 'Playwright123!';

  const studentEmail = process.env.PLAYWRIGHT_STUDENT_EMAIL || 'playwright-student@test.com';
  const studentPassword = process.env.PLAYWRIGHT_STUDENT_PASSWORD || 'Playwright123!';

  await ensureUser(client, { email: teacherEmail, password: teacherPassword, role: 'teacher' });
  await ensureUser(client, { email: studentEmail, password: studentPassword, role: 'student' });

  console.log('Playwright 测试账号准备完成');
}

main().catch((err) => {
  console.error('创建测试账号失败：', err);
  process.exit(1);
});
