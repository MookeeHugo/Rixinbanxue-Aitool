/**
 * 调试脚本：检查题目图片URL
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuestionImages() {
  console.log('🔍 检查最近上传的题目...\n');

  // 先检查上传任务
  const { data: tasks, error: taskError } = await supabase
    .from('upload_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (taskError) {
    console.error('❌ 查询上传任务失败:', taskError);
  } else if (tasks && tasks.length > 0) {
    console.log(`✅ 找到 ${tasks.length} 个上传任务\n`);

    for (const task of tasks) {
      console.log(`上传任务 ${task.id}:`);
      console.log(`  状态: ${task.status}`);
      console.log(`  进度: ${task.progress}%`);
      console.log(`  创建时间: ${task.created_at}`);
      console.log(`  文件URL: ${task.file_url || '无'}`);
      console.log(`  错误: ${task.error || '无'}`);
      console.log('');
    }
  } else {
    console.log('ℹ️  没有找到上传任务\n');
  }

  // 1. 查询最近的题目（查询所有字段）
  const { data: questions, error } = await supabase
    .from('parsed_questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('ℹ️  没有找到题目数据，可能还没有上传成功\n');
    console.log('💡 建议检查：');
    console.log('  1. 上传任务是否完成');
    console.log('  2. 查看开发服务器日志是否有错误');
    console.log('  3. 检查image-cropper.ts是否正常执行\n');
    return;
  }

  console.log(`✅ 找到 ${questions.length} 道题目\n`);

  // 2. 分析每道题的图片URL
  for (const q of questions) {
    console.log(`题目 ${q.number || q.question_number || '未知'}:`);
    console.log(`  ID: ${q.id}`);
    console.log(`  创建时间: ${q.created_at}`);
    console.log(`  所有字段:`, Object.keys(q).join(', '));

    if (q.question_image_url) {
      console.log(`  图片URL: ${q.question_image_url}`);

      // 检查URL格式
      if (q.question_image_url.startsWith('http://') || q.question_image_url.startsWith('https://')) {
        console.log(`  ✅ URL格式: 完整URL（带协议）`);

        // 尝试访问
        try {
          const response = await fetch(q.question_image_url);
          console.log(`  HTTP状态: ${response.status} ${response.statusText}`);

          if (response.ok) {
            console.log(`  ✅ 可以访问`);
          } else {
            console.log(`  ❌ 无法访问`);
          }
        } catch (err) {
          console.log(`  ❌ 访问失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (q.question_image_url.startsWith('ai-question-bank/')) {
        console.log(`  ⚠️  URL格式: 相对路径（需要转换）`);

        // 尝试通过Supabase获取公开URL
        const { data } = supabase.storage
          .from('question-files')
          .getPublicUrl(q.question_image_url);

        console.log(`  转换后URL: ${data.publicUrl}`);

        // 尝试访问
        try {
          const response = await fetch(data.publicUrl);
          console.log(`  HTTP状态: ${response.status} ${response.statusText}`);

          if (response.ok) {
            console.log(`  ✅ 转换后可以访问`);
          } else {
            console.log(`  ❌ 转换后仍无法访问`);
          }
        } catch (err) {
          console.log(`  ❌ 访问失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        console.log(`  ⚠️  URL格式: 未知格式`);
      }
    } else {
      console.log(`  ℹ️  无配图`);
    }

    console.log('');
  }

  // 3. 检查Storage bucket配置
  console.log('\n📦 检查Storage Bucket配置...\n');

  try {
    const { data: buckets } = await supabase.storage.listBuckets();

    const questionBucket = buckets?.find(b => b.id === 'question-files');

    if (questionBucket) {
      console.log('✅ question-files bucket存在');
      console.log(`  Public: ${questionBucket.public}`);
      console.log(`  ID: ${questionBucket.id}`);
    } else {
      console.log('❌ question-files bucket不存在');
    }
  } catch (err) {
    console.log('❌ 无法查询buckets:', err);
  }

  // 4. 测试直接访问一个文件
  console.log('\n🧪 测试Storage访问...\n');

  const testPath = questions[0]?.question_image_url;

  if (testPath && !testPath.startsWith('http')) {
    // 尝试不同的访问方式
    const methods = [
      {
        name: '公开URL',
        url: supabase.storage.from('question-files').getPublicUrl(testPath).data.publicUrl
      },
      {
        name: 'image-proxy',
        url: `http://localhost:3002/api/image-proxy?url=${encodeURIComponent(supabase.storage.from('question-files').getPublicUrl(testPath).data.publicUrl)}`
      }
    ];

    for (const method of methods) {
      console.log(`测试方法: ${method.name}`);
      console.log(`  URL: ${method.url}`);

      try {
        const response = await fetch(method.url);
        console.log(`  状态: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const size = response.headers.get('content-length');
          console.log(`  ✅ 成功 - Content-Type: ${contentType}, Size: ${size} bytes`);
        } else {
          const text = await response.text();
          console.log(`  ❌ 失败 - ${text.substring(0, 200)}`);
        }
      } catch (err) {
        console.log(`  ❌ 错误: ${err instanceof Error ? err.message : String(err)}`);
      }

      console.log('');
    }
  }
}

debugQuestionImages().catch(console.error);
