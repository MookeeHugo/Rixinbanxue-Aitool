#!/usr/bin/env node
/**
 * Query failed upload task from Supabase
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query upload_tasks - 修改为查询 (35).jpg
const { data: tasks, error: tasksError } = await supabase
  .from('upload_tasks')
  .select('*')
  .ilike('file_name', '%fd2c3f41e73c4b33825bee6d97772310(35)%')
  .order('created_at', { ascending: false })
  .limit(1);

if (tasksError) {
  console.error('[ERROR] Failed to query upload_tasks:', tasksError);
  process.exit(1);
}

if (!tasks || tasks.length === 0) {
  console.log('[INFO] No upload task found matching filename');
  process.exit(0);
}

const task = tasks[0];
console.log('\n========== Upload Task ==========');
console.log('ID:', task.id);
console.log('File Name:', task.file_name);
console.log('Status:', task.status);
console.log('Error Message:', task.error_message);
console.log('Total Questions:', task.total_questions);
console.log('Image Questions:', task.image_questions);
console.log('Image Success Rate:', task.image_success_rate);
console.log('Created At:', task.created_at);

// Query parsed_questions
const { data: questions, error: questionsError } = await supabase
  .from('parsed_questions')
  .select('id, number, type, image_region, image_assets')
  .eq('upload_task_id', task.id)
  .order('number');

if (questionsError) {
  console.error('[ERROR] Failed to query parsed_questions:', questionsError);
  process.exit(1);
}

console.log('\n========== Parsed Questions ==========');
console.log('Total:', questions.length);

questions.forEach((q, idx) => {
  console.log(`\n--- Question ${idx + 1} (Number: ${q.number}) ---`);
  console.log('Type:', q.type);
  console.log('Image Region:', JSON.stringify(q.image_region, null, 2));
  console.log('Image Assets:', JSON.stringify(q.image_assets, null, 2));

  if (q.image_region && Array.isArray(q.image_region)) {
    console.log('⚠️  Image Region is an ARRAY (should be object)');
  } else if (q.image_region) {
    const { x, y, width, height } = q.image_region;
    console.log(`Image Region Pixels: x=${x}, y=${y}, width=${width}, height=${height}`);
    if (width <= 0 || height <= 0) {
      console.log('❌ INVALID: width or height is zero/negative!');
    }
  }
});
