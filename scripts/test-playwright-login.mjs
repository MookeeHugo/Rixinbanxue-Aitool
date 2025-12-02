import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testAccounts = [
  { email: 'playwright-teacher@test.com', password: 'Playwright123!', role: '教师' },
  { email: 'playwright-student@test.com', password: 'Playwright123!', role: '学生' },
  { email: 'student@test.com', password: 'test123456', role: '学生' },
  { email: 'teacher@test.com', password: 'test123456', role: '教师' }
];

console.log('======================================');
console.log('测试所有账号登录');
console.log('======================================\n');

for (const account of testAccounts) {
  console.log(`测试 ${account.role}账号: ${account.email}`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (error) {
      console.log(`❌ 登录失败: ${error.message}\n`);
    } else {
      console.log(`✅ 登录成功!`);
      console.log(`   用户ID: ${data.user.id}`);
      console.log(`   邮箱: ${data.user.email}\n`);
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error(`❌ 意外错误: ${err.message}\n`);
  }
}

console.log('======================================');
console.log('测试完成');
console.log('======================================');
