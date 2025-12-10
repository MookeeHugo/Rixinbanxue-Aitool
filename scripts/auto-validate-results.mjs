#!/usr/bin/env node
/**
 * 自动化结果验证脚本
 * - L1: 可用性 (任务完成/失败状态)
 * - L2: 结构完整性 (parsed_questions schema)
 * - L3: 识别准确性 (题目数量偏差校验)
 * - L4: 性能 (处理时长阈值)
 *
 * 仅使用 Supabase anon key + 用户会话查询，避免直接使用 service key。
 *
 * 用法：
 * node scripts/auto-validate-results.mjs \
 *   --input logs/test-reports/<目录>/batch-*.json \
 *   --level ALL \
 *   --email teacher@test.com \
 *   --password test123456 \
 *   --metadata tests/dataset
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile, readdir } from 'fs/promises';
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const CONFIG = {
  input: null,
  level: 'ALL', // L1, L2, L3, L4, or ALL
  output: null,
  metadata: 'tests/dataset',
  email: 'teacher@test.com',
  password: 'test123456'
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input') CONFIG.input = args[++i];
  else if (args[i] === '--level') CONFIG.level = args[++i].toUpperCase();
  else if (args[i] === '--output') CONFIG.output = args[++i];
  else if (args[i] === '--metadata') CONFIG.metadata = args[++i];
  else if (args[i] === '--email') CONFIG.email = args[++i];
  else if (args[i] === '--password') CONFIG.password = args[++i];
}

if (!CONFIG.input) {
  console.error('❌ 缺少 --input 参数');
  console.log('\n用法:');
  console.log('  node scripts/auto-validate-results.mjs --input <results.json> [--level L1-L4|ALL]');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少 Supabase 环境变量');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log('🔐 正在登录以验证数据...');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: CONFIG.email,
    password: CONFIG.password
  });

  if (authError) {
    console.error('❌ 登录失败:', authError.message);
    process.exit(1);
  }

  // 读取测试结果
  console.log(`📂 读取测试结果: ${CONFIG.input}`);
  const batchResults = JSON.parse(await readFile(CONFIG.input, 'utf-8'));
  console.log(`✅ 找到 ${batchResults.total} 条测试记录\n`);

  // 加载元数据
  const metadata = await loadMetadata(CONFIG.metadata);
  console.log(`📖 加载元数据: ${Object.keys(metadata).length} 个文件\n`);

  // 执行验证
  const validationResults = {
    timestamp: new Date().toISOString(),
    input: CONFIG.input,
    level: CONFIG.level,
    total: batchResults.details.length,
    validations: []
  };

  console.log(`🔍 开始验证 (级别: ${CONFIG.level})...\n`);

  for (const detail of batchResults.details) {
    console.log(`验证: ${detail.file}`);

    const result = await validateTestResult(supabase, detail, metadata[detail.file]);

    validationResults.validations.push({
      file: detail.file,
      category: detail.category,
      taskId: detail.taskId,
      ...result
    });

    displayValidationResult(result);
  }

  const summary = generateSummary(validationResults);
  validationResults.summary = summary;

  if (!CONFIG.output) {
    CONFIG.output = CONFIG.input.replace('.json', `-validation-${CONFIG.level}.json`);
  }

  console.log(`\n💾 保存验证结果: ${CONFIG.output}`);
  await writeFile(CONFIG.output, JSON.stringify(validationResults, null, 2), 'utf-8');

  displaySummary(summary);
}

async function loadMetadata(datasetPath) {
  const metadata = {};

  try {
    const entries = await readdir(datasetPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const metadataPath = join(datasetPath, entry.name, 'metadata.json');
      if (existsSync(metadataPath)) {
        const categoryMetadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
        Object.assign(metadata, categoryMetadata);
      }
    }
  } catch (error) {
    console.warn(`⚠️ 加载元数据失败: ${error.message}`);
  }

  return metadata;
}

async function validateTestResult(supabase, detail, expectedMetadata) {
  const result = {
    l1: null,
    l2: null,
    l3: null,
    l4: null
  };

  // L1: 可用性验证
  if (CONFIG.level === 'ALL' || CONFIG.level === 'L1') {
    result.l1 = validateL1(detail);
  }

  // L2-L4 需要任务详情
  if (detail.taskId && (CONFIG.level === 'ALL' || ['L2', 'L3', 'L4'].includes(CONFIG.level))) {
    const task = await getTaskDetails(supabase, detail.taskId);

    if (CONFIG.level === 'ALL' || CONFIG.level === 'L2') {
      result.l2 = await validateL2(supabase, task);
    }

    if (CONFIG.level === 'ALL' || CONFIG.level === 'L3') {
      result.l3 = await validateL3(supabase, task, expectedMetadata);
    }

    if (CONFIG.level === 'ALL' || CONFIG.level === 'L4') {
      result.l4 = validateL4(task);
    }
  }

  return result;
}

function validateL1(detail) {
  const passed = detail.status === 'completed';

  return {
    passed,
    httpStatus: 200,
    flowCompleted: passed,
    status: detail.status,
    error: detail.error
  };
}

async function validateL2(supabase, task) {
  if (!task) {
    return { passed: false, error: '无法获取任务详情' };
  }

  const { data: questions, error } = await supabase
    .from('parsed_questions')
    .select('*')
    .eq('upload_task_id', task.id);

  if (error) {
    return { passed: false, error: error.message };
  }

  const schemaErrors = [];
  for (const q of questions) {
    const errors = validateQuestionSchema(q);
    if (errors.length > 0) {
      schemaErrors.push({ questionNumber: q.number, errors });
    }
  }

  return {
    passed: schemaErrors.length === 0,
    hasQuestions: questions.length > 0,
    questionCount: questions.length,
    allHaveContent: questions.every(q => q.content && q.content.trim() !== ''),
    schemaValid: schemaErrors.length === 0,
    schemaErrors
  };
}

async function validateL3(supabase, task, expectedMetadata) {
  if (!task) {
    return { passed: false, error: '无法获取任务详情' };
  }

  if (!expectedMetadata) {
    return { passed: null, error: '缺少预期元数据，跳过准确性验证' };
  }

  const { data: questions, error } = await supabase
    .from('parsed_questions')
    .select('*')
    .eq('upload_task_id', task.id);

  if (error) {
    return { passed: false, error: error.message };
  }

  const expectedCount = expectedMetadata.expected_count || expectedMetadata.expectedCount;
  const actualCount = questions?.length || 0;

  const deviation = Math.abs(actualCount - expectedCount);
  const deviationTolerance = Number.parseInt(process.env.VALIDATION_COUNT_TOLERANCE || '4', 10);
  const passed = deviation <= deviationTolerance;

  return {
    passed,
    expectedCount,
    actualCount,
    deviation
  };
}

function validateL4(task) {
  if (!task) {
    return { passed: false, error: '无法获取任务详情' };
  }

  const processingTime = task.total_processing_ms || task.python_processing_ms || 0;
  const perfThreshold = Number.parseInt(process.env.VALIDATION_L4_THRESHOLD_MS || '40000', 10);
  const passed = processingTime > 0 && processingTime < perfThreshold;

  return {
    passed,
    processingTime,
    uploadLatency: task.ingest_upload_latency_ms,
    totalBandwidth: task.supabase_bandwidth_mb,
    performanceGrade: getPerformanceGrade(processingTime)
  };
}

async function getTaskDetails(supabase, taskId) {
  const { data: task, error } = await supabase
    .from('upload_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    console.error(`   ⚠️ 获取任务详情失败: ${error.message}`);
    return null;
  }

  return task;
}

function validateQuestionSchema(question) {
  const errors = [];

  if (!question.content || question.content.trim() === '') {
    errors.push('content为空');
  }

  if (!question.number) {
    errors.push('缺少题号');
  }

  if (question.image_region?.box_2d) {
    const box = question.image_region.box_2d;

    if (!Array.isArray(box)) {
      errors.push('box_2d不是数组');
    } else if (box.length !== 4) {
      errors.push(`box_2d长度不正确 ${box.length}`);
    } else {
      const [ymin, xmin, ymax, xmax] = box;

      if (!box.every(v => typeof v === 'number')) {
        errors.push('box_2d包含非数字值');
      }

      if (!box.every(v => v >= 0 && v <= 1000)) {
        errors.push(`box_2d超出范围0-1000: [${box.join(',')}]`);
      }

      if (ymax <= ymin) {
        errors.push(`ymax(${ymax}) <= ymin(${ymin})`);
      }

      if (xmax <= xmin) {
        errors.push(`xmax(${xmax}) <= xmin(${xmin})`);
      }

      if (box.some(v => !Number.isFinite(v))) {
        errors.push('box_2d包含NaN或Infinity');
      }
    }
  }

  if (question.type === 'choice' && (!question.options || question.options.length === 0)) {
    errors.push('选择题缺少选项');
  }

  return errors;
}

function getPerformanceGrade(processingTimeMs) {
  if (processingTimeMs < 10000) return 'A+';
  if (processingTimeMs < 15000) return 'A';
  if (processingTimeMs < 20000) return 'B';
  if (processingTimeMs < 30000) return 'C';
  return 'D';
}

function displayValidationResult(result) {
  if (result.l1) {
    const icon = result.l1.passed ? '✅' : '❌';
    console.log(`   L1 可用性: ${icon} ${result.l1.status}`);
  }

  if (result.l2) {
    const icon = result.l2.passed ? '✅' : '❌';
    const msg = result.l2.schemaErrors?.length
      ? `schema错误 ${result.l2.schemaErrors.length}`
      : '结构有效';
    console.log(`   L2 结构完整: ${icon} ${msg}`);
  }

  if (result.l3) {
    const icon = result.l3.passed === null ? '⏭️' : result.l3.passed ? '✅' : '❌';
    console.log(
      `   L3 数量偏差: ${icon} 预期 ${result.l3.expectedCount ?? '-'} / 实际 ${result.l3.actualCount ?? '-'}`
    );
  }

  if (result.l4) {
    const icon = result.l4.passed ? '✅' : '❌';
    console.log(`   L4 性能: ${icon} ${result.l4.processingTime ?? '-'} ms`);
  }
}

function generateSummary(validationResults) {
  const summary = {
    total: validationResults.total,
    level: validationResults.level,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  for (const v of validationResults.validations) {
    const checks = [v.l1, v.l2, v.l3, v.l4].filter(Boolean);
    const hasSkip = checks.some(c => c.passed === null);
    const allPassed = checks.length > 0 && checks.every(c => c.passed === true);

    if (allPassed) summary.passed += 1;
    else if (hasSkip) summary.skipped += 1;
    else summary.failed += 1;
  }

  return summary;
}

function displaySummary(summary) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         验证汇总                               ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📊 总样本: ${summary.total}`);
  console.log(`✅ 通过: ${summary.passed}`);
  console.log(`❌ 失败: ${summary.failed}`);
  console.log(`⏭️  跳过: ${summary.skipped}`);
}

main().catch(err => {
  console.error('脚本异常退出:', err);
  process.exit(1);
});
