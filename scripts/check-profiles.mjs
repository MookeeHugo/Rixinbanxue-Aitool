import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
// 使用 service_role key 绕过 RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('正在检查 profiles 表...\n');

// 查询所有 profiles
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at');

if (error) {
  console.error('查询失败:', error);
  process.exit(1);
}

console.log(`找到 ${profiles.length} 条 profile 记录:\n`);

// 按 ID 分组统计
const idCounts = {};
profiles.forEach(profile => {
  if (!idCounts[profile.id]) {
    idCounts[profile.id] = [];
  }
  idCounts[profile.id].push(profile);
});

// 显示所有记录
profiles.forEach((profile, index) => {
  console.log(`${index + 1}. ID: ${profile.id}`);
  console.log(`   Email: ${profile.email}`);
  console.log(`   Name: ${profile.name}`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   Created: ${profile.created_at}\n`);
});

// 检查重复
const duplicates = Object.entries(idCounts).filter(([, profiles]) => profiles.length > 1);

if (duplicates.length > 0) {
  console.log('\n⚠️  发现重复的 profile ID:');
  duplicates.forEach(([id, profiles]) => {
    console.log(`\nID ${id} 有 ${profiles.length} 条记录:`);
    profiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.email} (created: ${profile.created_at})`);
    });
  });
} else {
  console.log('✅ 没有发现重复的 profile ID');
}

// 检查测试账号
console.log('\n\n正在检查测试账号...\n');

const testEmails = ['student@test.com', 'teacher@test.com'];

for (const email of testEmails) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error(`查询 ${email} 失败:`, error);
  } else if (data.length === 0) {
    console.log(`❌ ${email} - 不存在`);
  } else if (data.length > 1) {
    console.log(`⚠️  ${email} - 有 ${data.length} 条记录（重复！）`);
  } else {
    console.log(`✅ ${email} - 存在且唯一`);
    console.log(`   ID: ${data[0].id}`);
    console.log(`   Name: ${data[0].name}`);
    console.log(`   Role: ${data[0].role}`);
  }
}
