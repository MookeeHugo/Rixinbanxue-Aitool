#!/usr/bin/env node
/**
 * 调试图片裁剪问题
 * 用法: node scripts/debug-crop-task.mjs <taskId>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const taskId = process.argv[2] || 'a4068644-8149-47f0-abdc-966f1fc5364e';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
  console.log('🔍 调试任务:', taskId);

  // 1. 查询 parsed_questions
  const { data: questions, error: qError } = await supabase
    .from('parsed_questions')
    .select('*')
    .eq('upload_task_id', taskId);

  if (qError) {
    console.error('❌ 查询题目失败:', qError);
    return;
  }

  console.log('\n📊 题目统计:');
  console.log('  总题数:', questions.length);
  const withRegion = questions.filter(q => q.image_region);
  const withAssets = questions.filter(q => q.image_assets && q.image_assets.length > 0);
  const withUrl = questions.filter(q => q.question_image_url);

  console.log('  有 image_region:', withRegion.length);
  console.log('  有 image_assets:', withAssets.length);
  console.log('  有 question_image_url:', withUrl.length);

  console.log('\n📋 详细信息:');
  questions.forEach(q => {
    console.log(`\n题号 ${q.number}:`);
    console.log('  image_region:', q.image_region ? JSON.stringify(JSON.parse(q.image_region)) : 'null');
    console.log('  image_assets:', q.image_assets ? `${q.image_assets.length}个` : 'null');
    console.log('  question_image_url:', q.question_image_url || 'null');
  });

  // 2. 查询 upload_tasks
  const { data: task, error: tError } = await supabase
    .from('upload_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (tError) {
    console.error('❌ 查询任务失败:', tError);
    return;
  }

  console.log('\n📦 upload_tasks 信息:');
  console.log('  status:', task.status);
  console.log('  image_questions:', task.image_questions);
  console.log('  image_success_rate:', task.image_success_rate);
  console.log('  total_questions:', task.total_questions);
  console.log('  error_message:', task.error_message || 'null');

  // 3. 分析问题
  console.log('\n🔍 问题分析:');
  if (withRegion.length > 0 && withAssets.length === 0) {
    console.log('  ❌ 检测到图框但裁剪全部失败');
    console.log('  可能原因:');
    console.log('    1. 图框被 isValidImageBox 过滤');
    console.log('    2. 裁剪过程抛出异常');
    console.log('    3. 上传到 Supabase Storage 失败');
  }

  if (task.image_questions !== withRegion.length) {
    console.log(`  ⚠️  upload_tasks.image_questions (${task.image_questions}) != 实际有图框题数 (${withRegion.length})`);
  }
}

debug().catch(console.error);
