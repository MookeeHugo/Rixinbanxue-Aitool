/**
 * 实时监控上传任务
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

let lastTaskId: string | null = null;
let lastQuestionCount = 0;

async function checkStatus() {
  try {
    // 检查上传任务
    const { data: tasks } = await supabase
      .from('upload_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tasks && tasks.length > 0) {
      const task = tasks[0];

      if (task.id !== lastTaskId) {
        console.log('\n✨ 检测到新的上传任务！');
        console.log(`任务ID: ${task.id}`);
        lastTaskId = task.id;
      }

      const statusEmoji = {
        'pending': '⏳',
        'processing': '🔄',
        'completed': '✅',
        'failed': '❌'
      }[task.status] || '❓';

      process.stdout.write(`\r${statusEmoji} 状态: ${task.status.padEnd(12)} | 进度: ${task.progress}%   `);

      if (task.status === 'failed') {
        console.log(`\n❌ 错误: ${task.error}`);
      }

      if (task.status === 'completed') {
        console.log('\n✅ 上传任务完成！');

        // 检查题目数量
        const { data: questions, count } = await supabase
          .from('parsed_questions')
          .select('*', { count: 'exact' })
          .eq('upload_task_id', task.id);

        console.log(`📝 解析了 ${count} 道题目`);

        if (questions && questions.length > 0) {
          const withImages = questions.filter(q => q.question_image_url).length;
          console.log(`🖼️  ${withImages} 道题有配图`);

          // 显示配图URL示例
          const firstWithImage = questions.find(q => q.question_image_url);
          if (firstWithImage) {
            console.log(`\n配图URL示例:`);
            console.log(`  ${firstWithImage.question_image_url}`);

            // 检查是否可以访问
            const { data: urlData } = supabase.storage
              .from('question-files')
              .getPublicUrl(firstWithImage.question_image_url);

            console.log(`\n公开URL:`);
            console.log(`  ${urlData.publicUrl}`);

            // 测试访问
            try {
              const response = await fetch(urlData.publicUrl);
              if (response.ok) {
                console.log(`\n✅ 图片可以访问！状态: ${response.status}`);
              } else {
                console.log(`\n❌ 图片无法访问！状态: ${response.status} ${response.statusText}`);
              }
            } catch (err) {
              console.log(`\n❌ 访问失败: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }

        console.log('\n监控结束。');
        process.exit(0);
      }
    } else {
      process.stdout.write(`\r⏰ 等待上传任务...`);
    }

    // 检查题目数量变化
    const { count } = await supabase
      .from('parsed_questions')
      .select('*', { count: 'exact', head: true });

    if (count !== lastQuestionCount && count !== null) {
      console.log(`\n📝 题目数量: ${lastQuestionCount} → ${count}`);
      lastQuestionCount = count;
    }

  } catch (error) {
    console.error('\n❌ 监控错误:', error);
  }
}

console.log('🔍 开始监控上传任务...');
console.log('💡 请在浏览器中上传图片\n');

// 每秒检查一次
const interval = setInterval(checkStatus, 1000);

// 60秒后自动退出
setTimeout(() => {
  clearInterval(interval);
  console.log('\n\n⏱️  监控超时（60秒），退出。');
  process.exit(0);
}, 60000);

// 立即执行一次
checkStatus();
